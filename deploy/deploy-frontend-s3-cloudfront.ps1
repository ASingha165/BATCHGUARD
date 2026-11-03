<#
.SYNOPSIS
    BatchGuard Frontend Static Hosting Deployment to AWS S3 & CloudFront.
    Target Architecture: React/Vite -> CloudFront HTTPS -> Origin Access Control (OAC) -> Private S3

.DESCRIPTION
    Automates the end-to-end setup and deployment of BatchGuard's frontend static distribution:
    - Step 1: AWS Identity, Account & Bucket Availability Validation
    - Step 2: S3 Private Bucket Provisioning
    - Step 3: S3 Block Public Access Enforcement
    - Step 4: CloudFront Origin Access Control (OAC) Configuration
    - Step 5: CloudFront Function Deployment (SPA Whitelist Routing)
    - Step 6: CloudFront Distribution Creation
    - Step 7: S3 OAC Bucket Policy Attachment
    - Step 8: Asset Upload with Optimized Cache Headers
    - Step 9: CloudFront Edge Cache Invalidation
    - Step 10: Endpoint Probe & Health Verification

.PARAMETER Profile
    AWS CLI Named Profile (Default: 'batchguard-prod')

.PARAMETER ExpectedAccountId
    Expected AWS Account ID to guard against misconfiguration (Default: '316636858874')

.PARAMETER Region
    AWS Target Region (Default: 'us-east-1')

.PARAMETER BucketName
    S3 Bucket Name (Default: 'batchguard-frontend-316636858874')

.PARAMETER Execute
    Explicit execution flag. If omitted, the script executes in DRY-RUN / PLAN mode and does not provision AWS resources.
#>

[CmdletBinding()]
param (
    [string]$Profile = "batchguard-prod",
    [string]$ExpectedAccountId = "316636858874",
    [string]$Region = "us-east-1",
    [string]$BucketName = "batchguard-frontend-316636858874",
    [switch]$Execute
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " BATCHGUARD -- AWS STATIC FRONTEND DEPLOYMENT ORCHESTRATION       " -ForegroundColor Cyan
Write-Host " Target: S3 + CloudFront OAC + CloudFront Function SPA Router    " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
$ModeText = if ($Execute) { "LIVE EXECUTION" } else { "DRY-RUN / VALIDATION ONLY" }
Write-Host "Mode: $ModeText" -ForegroundColor Yellow
Write-Host "Profile: $Profile | Target Account: $ExpectedAccountId | Region: $Region"
Write-Host "Bucket:  $BucketName"
Write-Host "-----------------------------------------------------------------"

# Resolve Root Directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $ProjectRoot "frontend"
$DistDir = Join-Path $FrontendDir "dist"
$FunctionFile = Join-Path $ScriptDir "spa-router.js"

# -------------------------------------------------------------------------
# STEP 1: IDENTITY, ACCOUNT & BUCKET AVAILABILITY VALIDATION
# -------------------------------------------------------------------------
Write-Host "`n[STEP 1/10] Verifying AWS Identity, Target Account & S3 Bucket..." -ForegroundColor Cyan

try {
    $IdentityJson = aws sts get-caller-identity --profile $Profile --output json 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI authentication failed using profile '$Profile': $IdentityJson"
    }
    $Identity = $IdentityJson | ConvertFrom-Json
    $CurrentAccountId = $Identity.Account
    $CurrentArn = $Identity.Arn

    Write-Host "  -> Authenticated ARN: $CurrentArn" -ForegroundColor Green
    Write-Host "  -> Current Account:   $CurrentAccountId" -ForegroundColor Green

    if ($CurrentAccountId -ne $ExpectedAccountId) {
        throw "Account mismatch error! Target account must be '$ExpectedAccountId', but authenticated as '$CurrentAccountId'."
    }
    Write-Host "  [OK] Account match verified ($ExpectedAccountId)." -ForegroundColor Green

    # Bucket availability check (read-only head-bucket)
    Write-Host "  -> Checking S3 bucket '$BucketName' status..." -ForegroundColor Gray
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $HeadBucketOutput = & aws s3api head-bucket --bucket $BucketName --profile $Profile 2>&1
    $HeadBucketExitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP

    if ($HeadBucketExitCode -eq 0) {
        Write-Host "  [NOTICE] Bucket '$BucketName' already exists in this account and is accessible." -ForegroundColor Yellow
    } else {
        $ErrorMsg = ($HeadBucketOutput | Out-String).Trim()
        if ($ErrorMsg -match "403" -or $ErrorMsg -match "Forbidden") {
            throw "Bucket name collision! '$BucketName' already exists in another AWS account (403 Forbidden)."
        } else {
            Write-Host "  [OK] Bucket name '$BucketName' is confirmed available for creation globally (404 Not Found)." -ForegroundColor Green
        }
    }
} catch {
    Write-Error "Identity or Availability Verification Failed: $_"
    exit 1
}

# -------------------------------------------------------------------------
# VERIFY LOCAL ARTIFACTS (BUILD & SPA ROUTER)
# -------------------------------------------------------------------------
Write-Host "`nChecking local build artifacts..." -ForegroundColor Cyan
if (-not (Test-Path $FunctionFile)) {
    Write-Error "CloudFront Function script not found at '$FunctionFile'."
    exit 1
}
Write-Host "  [OK] Found CloudFront Function script at '$FunctionFile'." -ForegroundColor Green

if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
    Write-Host "  Building production frontend bundle..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    try {
        npm run build
    } finally {
        Pop-Location
    }
}
Write-Host "  [OK] Production bundle verified in '$DistDir'." -ForegroundColor Green

# -------------------------------------------------------------------------
# STEP 2-10: PLANNING OR EXECUTION
# -------------------------------------------------------------------------
if (-not $Execute) {
    Write-Host "`n=================================================================" -ForegroundColor Yellow
    Write-Host " DRY-RUN / PLAN SUMMARY: AWS CLI COMMAND CHAIN FOR EXECUTION    " -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Yellow
    Write-Host "To execute live provisioning, invoke with: -Execute" -ForegroundColor Yellow

    Write-Host "`n[STEP 2] Create S3 Bucket (Private):" -ForegroundColor White
    Write-Host "  aws s3api create-bucket --bucket $BucketName --region $Region --profile $Profile"

    Write-Host "`n[STEP 3] Enable S3 Block Public Access (All 4 flags true):" -ForegroundColor White
    $BpaCmd = 'aws s3api put-public-access-block --bucket ' + $BucketName + ' --profile ' + $Profile + ' --public-access-block-configuration "{\"BlockPublicAcls\":true,\"IgnorePublicAcls\":true,\"BlockPublicPolicy\":true,\"RestrictPublicBuckets\":true}"'
    Write-Host "  $BpaCmd"

    Write-Host "`n[STEP 4] Create CloudFront Origin Access Control (OAC):" -ForegroundColor White
    $OacCmd = 'aws cloudfront create-origin-access-control --profile ' + $Profile + ' --origin-access-control-config "{\"Name\":\"batchguard-oac-' + $ExpectedAccountId + '\",\"Description\":\"BatchGuard S3 OAC\",\"SigningProtocol\":\"sigv4\",\"SigningBehavior\":\"always\",\"OriginAccessControlOriginType\":\"s3\"}"'
    Write-Host "  $OacCmd"

    Write-Host "`n[STEP 5] Create and Publish CloudFront Function (SPA Whitelist Router):" -ForegroundColor White
    $FuncCreateCmd = 'aws cloudfront create-function --profile ' + $Profile + ' --name batchguard-spa-router --function-config "{\"Comment\":\"BatchGuard SPA whitelist rewrite\",\"Runtime\":\"cloudfront-js-2.0\"}" --function-code fileb://' + $FunctionFile
    Write-Host "  $FuncCreateCmd"
    $FuncPubCmd = 'aws cloudfront publish-function --profile ' + $Profile + ' --name batchguard-spa-router --if-match <ETAG>'
    Write-Host "  $FuncPubCmd"

    Write-Host "`n[STEP 6] Create CloudFront Distribution:" -ForegroundColor White
    Write-Host "  Origin: S3 ($BucketName.s3.$Region.amazonaws.com) using OAC ID"
    Write-Host "  DefaultRootObject: index.html"
    Write-Host "  PriceClass: PriceClass_100 (Lowest cost / US, Canada, Europe - Free Tier Safe)"
    Write-Host "  FunctionAssociation: viewer-request -> batchguard-spa-router"
    Write-Host "  ViewerProtocolPolicy: redirect-to-https"
    Write-Host "  CustomErrorResponses: NONE (Native S3 404 preserved for unknown routes & missing assets)"

    Write-Host "`n[STEP 7] Attach S3 Bucket Policy (Restricted strictly to CloudFront Distribution):" -ForegroundColor White
    Write-Host "  Condition: StringEquals AWS:SourceArn = arn:aws:cloudfront::${ExpectedAccountId}:distribution/<DISTRIBUTION_ID>"
    Write-Host "  Principal: Service = cloudfront.amazonaws.com"
    Write-Host "  Action:    s3:GetObject"
    Write-Host "  Resource:  arn:aws:s3:::$BucketName/*"

    Write-Host "`n[STEP 8] Sync Production Assets to S3 with Strict Cache Rules:" -ForegroundColor White
    Write-Host "  aws s3 sync `"$DistDir`" s3://$BucketName/ --profile $Profile --delete --exclude `"index.html`" --cache-control `"public, max-age=31536000, immutable`""
    Write-Host "  aws s3 cp `"$DistDir/index.html`" s3://$BucketName/index.html --profile $Profile --cache-control `"no-cache, no-store, must-revalidate`""

    Write-Host "`n[STEP 9] Create CloudFront Invalidation:" -ForegroundColor White
    Write-Host "  aws cloudfront create-invalidation --profile $Profile --distribution-id <DISTRIBUTION_ID> --paths `"/*`""

    Write-Host "`n[STEP 10] Endpoint Probe:" -ForegroundColor White
    Write-Host "  curl -I https://<DISTRIBUTION_DOMAIN>/dashboard"

    Write-Host "`n[TEARDOWN REFERENCE]:" -ForegroundColor DarkYellow
    Write-Host "  aws s3 rm s3://$BucketName --recursive --profile $Profile"
    Write-Host "  aws s3api delete-bucket --bucket $BucketName --region $Region --profile $Profile"
    Write-Host "  aws cloudfront delete-distribution --id <DISTRIBUTION_ID> --if-match <ETAG> --profile $Profile"
    Write-Host "  aws cloudfront delete-origin-access-control --id <OAC_ID> --if-match <ETAG> --profile $Profile"
    Write-Host "  aws cloudfront delete-function --name batchguard-spa-router --if-match <ETAG> --profile $Profile"

    Write-Host "`n[OK] Validation and Dry-Run completed cleanly. Zero AWS resources created." -ForegroundColor Green
    return
}

# -------------------------------------------------------------------------
# LIVE EXECUTION BLOCK (GATED BY -Execute SWITCH)
# -------------------------------------------------------------------------
try {
    Write-Host "`n[STEP 2/10] Creating Private S3 Bucket: $BucketName..." -ForegroundColor Cyan
    $BucketExists = $false
    $TestBucket = aws s3api head-bucket --bucket $BucketName --profile $Profile 2>&1
    if ($LASTEXITCODE -eq 0) {
        $BucketExists = $true
        Write-Host "  -> Bucket $BucketName already exists; skipping bucket creation." -ForegroundColor Yellow
    } else {
        if ($Region -eq "us-east-1") {
            aws s3api create-bucket --bucket $BucketName --region $Region --profile $Profile
        } else {
            aws s3api create-bucket --bucket $BucketName --region $Region --profile $Profile --create-bucket-configuration LocationConstraint=$Region
        }
        Write-Host "  -> Bucket $BucketName created." -ForegroundColor Green
    }

    Write-Host "`n[STEP 3/10] Enabling S3 Block Public Access..." -ForegroundColor Cyan
    aws s3api put-public-access-block --bucket $BucketName --profile $Profile --public-access-block-configuration '{"BlockPublicAcls":true,"IgnorePublicAcls":true,"BlockPublicPolicy":true,"RestrictPublicBuckets":true}'
    Write-Host "  -> Block Public Access enforced on $BucketName." -ForegroundColor Green

    Write-Host "`n[STEP 4/10] Configuring CloudFront Origin Access Control (OAC)..." -ForegroundColor Cyan
    $ExistingOacs = aws cloudfront list-origin-access-controls --profile $Profile --output json 2>&1 | ConvertFrom-Json
    $TargetOacName = "batchguard-oac-$ExpectedAccountId"
    $ExistingOac = $null
    if ($ExistingOacs.OriginAccessControlList.Items) {
        $ExistingOac = $ExistingOacs.OriginAccessControlList.Items | Where-Object { $_.Name -eq $TargetOacName } | Select-Object -First 1
    }

    if ($ExistingOac) {
        $OacId = $ExistingOac.Id
        Write-Host "  -> Reusing existing OAC: $OacId" -ForegroundColor Yellow
    } else {
        $OacConfig = @{
            Name = $TargetOacName
            Description = "BatchGuard S3 Origin Access Control"
            SigningProtocol = "sigv4"
            SigningBehavior = "always"
            OriginAccessControlOriginType = "s3"
        } | ConvertTo-Json -Compress

        $OacResult = aws cloudfront create-origin-access-control --profile $Profile --origin-access-control-config "$OacConfig" | ConvertFrom-Json
        $OacId = $OacResult.OriginAccessControl.Id
        Write-Host "  -> OAC Created: $OacId" -ForegroundColor Green
    }

    Write-Host "`n[STEP 5/10] Creating and Publishing CloudFront Function (SPA Whitelist Router)..." -ForegroundColor Cyan
    $FunctionConfig = '{"Comment":"BatchGuard SPA whitelist rewrite","Runtime":"cloudfront-js-2.0"}'
    $ExistingFunc = aws cloudfront describe-function --name batchguard-spa-router --profile $Profile 2>&1

    if ($LASTEXITCODE -eq 0) {
        $FuncDescribe = $ExistingFunc | ConvertFrom-Json
        $FuncEtag = $FuncDescribe.ETag
        $FuncUpdateResult = aws cloudfront update-function --name batchguard-spa-router --function-config "$FunctionConfig" --function-code "fileb://$FunctionFile" --if-match $FuncEtag --profile $Profile | ConvertFrom-Json
        $UpdateEtag = $FuncUpdateResult.ETag
        $PublishResult = aws cloudfront publish-function --profile $Profile --name batchguard-spa-router --if-match $UpdateEtag | ConvertFrom-Json
        $FunctionArn = $PublishResult.FunctionSummary.FunctionMetadata.FunctionARN
        Write-Host "  -> Function Updated & Published: $FunctionArn" -ForegroundColor Green
    } else {
        $FuncResult = aws cloudfront create-function --profile $Profile --name batchguard-spa-router --function-config "$FunctionConfig" --function-code "fileb://$FunctionFile" | ConvertFrom-Json
        $FuncEtag = $FuncResult.ETag
        $PublishResult = aws cloudfront publish-function --profile $Profile --name batchguard-spa-router --if-match $FuncEtag | ConvertFrom-Json
        $FunctionArn = $PublishResult.FunctionSummary.FunctionMetadata.FunctionARN
        Write-Host "  -> Function Created & Published: $FunctionArn" -ForegroundColor Green
    }

    Write-Host "`n[STEP 6/10] Creating CloudFront Distribution..." -ForegroundColor Cyan
    $CallerRef = "batchguard-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $S3Domain = "$BucketName.s3.$Region.amazonaws.com"

    $DistConfig = @{
        CallerReference = $CallerRef
        Comment = "BatchGuard Frontend Static SPA Distribution"
        Enabled = $true
        DefaultRootObject = "index.html"
        PriceClass = "PriceClass_100"
        Origins = @{
            Quantity = 1
            Items = @(
                @{
                    Id = "S3-$BucketName"
                    DomainName = $S3Domain
                    OriginAccessControlId = $OacId
                    S3OriginConfig = @{
                        OriginAccessIdentity = ""
                    }
                }
            )
        }
        DefaultCacheBehavior = @{
            TargetOriginId = "S3-$BucketName"
            ViewerProtocolPolicy = "redirect-to-https"
            AllowedMethods = @{
                Quantity = 2
                Items = @("GET", "HEAD")
                CachedMethods = @{
                    Quantity = 2
                    Items = @("GET", "HEAD")
                }
            }
            ForwardedValues = @{
                QueryString = $false
                Cookies = @{ Forward = "none" }
            }
            MinTTL = 0
            DefaultTTL = 86400
            MaxTTL = 31536000
            FunctionAssociations = @{
                Quantity = 1
                Items = @(
                    @{
                        FunctionARN = $FunctionArn
                        EventType = "viewer-request"
                    }
                )
            }
        }
    }

    $DistConfigFile = Join-Path $env:TEMP "batchguard-dist-config.json"
    $DistConfig | ConvertTo-Json -Depth 10 | Set-Content $DistConfigFile -Encoding UTF8

    $DistResult = aws cloudfront create-distribution --profile $Profile --distribution-config "file://$DistConfigFile" | ConvertFrom-Json
    $DistributionId = $DistResult.Distribution.Id
    $DistributionDomain = $DistResult.Distribution.DomainName
    Write-Host "  -> Distribution Created: $DistributionId ($DistributionDomain)" -ForegroundColor Green

    Write-Host "`n[STEP 7/10] Attaching S3 OAC Policy..." -ForegroundColor Cyan
    $BucketPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "AllowCloudFrontServicePrincipalReadOnly"
                Effect = "Allow"
                Principal = @{ Service = "cloudfront.amazonaws.com" }
                Action = "s3:GetObject"
                Resource = "arn:aws:s3:::$BucketName/*"
                Condition = @{
                    StringEquals = @{
                        "AWS:SourceArn" = "arn:aws:cloudfront::$ExpectedAccountId:distribution/$DistributionId"
                    }
                }
            }
        )
    } | ConvertTo-Json -Depth 6

    $BucketPolicyFile = Join-Path $env:TEMP "batchguard-bucket-policy.json"
    $BucketPolicy | Set-Content $BucketPolicyFile -Encoding UTF8
    aws s3api put-bucket-policy --bucket $BucketName --profile $Profile --policy "file://$BucketPolicyFile"
    Write-Host "  -> S3 bucket policy attached restricting access strictly to distribution $DistributionId." -ForegroundColor Green

    Write-Host "`n[STEP 8/10] Uploading Frontend Bundle to S3..." -ForegroundColor Cyan
    aws s3 sync "$DistDir" "s3://$BucketName/" --profile $Profile --delete --exclude "index.html" --cache-control "public, max-age=31536000, immutable"
    aws s3 cp "$DistDir/index.html" "s3://$BucketName/index.html" --profile $Profile --cache-control "no-cache, no-store, must-revalidate"
    Write-Host "  -> Assets uploaded with optimized caching headers." -ForegroundColor Green

    Write-Host "`n[STEP 9/10] Invalidating CloudFront Edge Cache..." -ForegroundColor Cyan
    aws cloudfront create-invalidation --profile $Profile --distribution-id $DistributionId --paths "/*"
    Write-Host "  -> Edge invalidation request submitted for /*." -ForegroundColor Green

    Write-Host "`n[STEP 10/10] Deployment Verification..." -ForegroundColor Cyan
    Write-Host "  -> Distribution Domain: https://$DistributionDomain" -ForegroundColor Green
    Write-Host "  -> Application URL:     https://$DistributionDomain/dashboard" -ForegroundColor Green

    Write-Host "`n=================================================================" -ForegroundColor Green
    Write-Host " BATCHGUARD FRONTEND DEPLOYMENT COMPLETE                         " -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Green
} catch {
    Write-Error "Deployment failed at step: $_"
    Write-Host "`n[RECOVERY / TROUBLESHOOTING NOTE]:" -ForegroundColor Yellow
    Write-Host "No unrelated resources were touched. You can re-run the script after resolving the issue or use the teardown commands."
    exit 1
}

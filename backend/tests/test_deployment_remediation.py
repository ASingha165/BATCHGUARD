"""Tests for Stage 8D Deployment Blocker Remediation.

Validates CloudWatch log group retention policies, Cognito auth flows,
API URL normalization, and authentication token handling contracts.
"""

import pytest
import yaml
from backend.common.auth import (
    AuthContext,
    UnauthorizedError,
    ForbiddenError,
    extract_auth_context,
    enforce_tenant_boundary,
    require_role,
)


class SafeLoaderIgnoreUnknown(yaml.SafeLoader):
    pass


def default_constructor(loader, tag_suffix, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    elif isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    elif isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node)
    return None


SafeLoaderIgnoreUnknown.add_multi_constructor("!", default_constructor)


@pytest.fixture(scope="module")
def template_data():
    with open("template.yaml", "r", encoding="utf-8") as f:
        return yaml.load(f, Loader=SafeLoaderIgnoreUnknown)


def test_cloudwatch_log_retention_all_lambdas(template_data):
    """Verify that all 20 Lambda functions have explicit 30-day CloudWatch log retention."""
    resources = template_data.get("Resources", {})

    functions = [
        k for k, v in resources.items() if v.get("Type") == "AWS::Serverless::Function"
    ]
    assert len(functions) == 20, f"Expected 20 Lambda functions, found {len(functions)}"

    log_groups = {
        k: v for k, v in resources.items() if v.get("Type") == "AWS::Logs::LogGroup"
    }
    assert len(log_groups) >= 20, f"Expected at least 20 LogGroups, found {len(log_groups)}"

    for func_name in functions:
        expected_lg_name = f"{func_name}LogGroup"
        assert expected_lg_name in log_groups, (
            f"Missing CloudWatch LogGroup '{expected_lg_name}' for function '{func_name}'"
        )

        lg_props = log_groups[expected_lg_name].get("Properties", {})
        assert lg_props.get("RetentionInDays") == 30, (
            f"LogGroup '{expected_lg_name}' does not enforce 30-day retention"
        )
        assert f"/aws/lambda/${{{func_name}}}" in str(lg_props.get("LogGroupName")), (
            f"LogGroup '{expected_lg_name}' is not bound to /aws/lambda/${func_name}"
        )


def test_cognito_user_pool_client_auth_flows(template_data):
    """Verify Cognito User Pool Client supports required authentication flows."""
    resources = template_data.get("Resources", {})
    client = resources.get("BatchGuardUserPoolClient", {})
    props = client.get("Properties", {})
    flows = props.get("ExplicitAuthFlows", [])

    assert "ALLOW_USER_PASSWORD_AUTH" in flows, (
        "BatchGuardUserPoolClient must allow USER_PASSWORD_AUTH for SPA login"
    )
    assert "ALLOW_REFRESH_TOKEN_AUTH" in flows, (
        "BatchGuardUserPoolClient must allow REFRESH_TOKEN_AUTH"
    )
    assert "ALLOW_USER_SRP_AUTH" in flows, (
        "BatchGuardUserPoolClient must allow USER_SRP_AUTH"
    )


def test_template_outputs_contain_stage_and_client_id(template_data):
    """Verify required outputs for frontend configuration exist in template."""
    outputs = template_data.get("Outputs", {})

    assert "ApiGatewayStageUrl" in outputs, "Outputs must export ApiGatewayStageUrl"
    assert "ApiGatewayEndpoint" in outputs, "Outputs must export ApiGatewayEndpoint"
    assert "CognitoClientId" in outputs, "Outputs must export CognitoClientId"
    assert "CognitoUserPoolId" in outputs, "Outputs must export CognitoUserPoolId"


def test_auth_unauthorized_in_production_environment(monkeypatch):
    """Verify that unauthenticated requests in production environment are strictly rejected."""
    monkeypatch.setenv("ENVIRONMENT", "prod")

    event_unauthenticated = {
        "headers": {},
        "requestContext": {
            "authorizer": {}
        }
    }

    with pytest.raises(UnauthorizedError) as exc_info:
        extract_auth_context(event_unauthenticated)

    assert "Trusted authentication context missing" in str(exc_info.value)


def test_auth_context_extraction_with_cognito_claims():
    """Verify trusted identity extraction from valid Cognito User Pool claims."""
    event_cognito = {
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-uuid-12345",
                    "cognito:username": "sarah.chen",
                    "email": "sarah.chen@apexnutrition.internal",
                    "custom:org_id": "ORG#apex-foods-north-america",
                    "cognito:groups": "COMPLIANCE_OFFICER,ADMIN",
                }
            }
        }
    }

    ctx = extract_auth_context(event_cognito)
    assert ctx.user_id == "user-uuid-12345"
    assert ctx.user_email == "sarah.chen@apexnutrition.internal"
    assert ctx.org_id == "ORG#apex-foods-north-america"
    assert "COMPLIANCE_OFFICER" in ctx.roles
    assert "ADMIN" in ctx.roles
    assert ctx.is_authenticated is True


def test_browser_headers_cannot_override_cognito_claims():
    """Verify that client-supplied X-Organization-Id header cannot override trusted Cognito claims."""
    event_with_spoofed_header = {
        "headers": {
            "X-Organization-Id": "ORG#malicious-spoofed-tenant",
            "X-User-Id": "attacker-user",
            "X-User-Roles": "SUPER_ADMIN",
        },
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "verified-user-123",
                    "cognito:username": "sarah.chen",
                    "email": "sarah.chen@apexnutrition.internal",
                    "custom:org_id": "ORG#apex-foods-north-america",
                    "cognito:groups": "COMPLIANCE_OFFICER",
                }
            }
        },
    }

    ctx = extract_auth_context(event_with_spoofed_header)
    assert ctx.org_id == "ORG#apex-foods-north-america", (
        "Client header X-Organization-Id must NOT override verified Cognito custom:org_id claim"
    )
    assert ctx.user_id == "verified-user-123"
    assert ctx.roles == ["COMPLIANCE_OFFICER"]


def test_tenant_boundary_enforcement():
    """Verify that cross-tenant access is strictly rejected with 403 Forbidden."""
    ctx = AuthContext(
        org_id="ORG#apex-foods",
        user_id="user-1",
        user_email="user@apex.com",
        roles=["COMPLIANCE_OFFICER"],
    )

    # Same org is allowed
    enforce_tenant_boundary(ctx, "ORG#apex-foods")

    # Different org is blocked
    with pytest.raises(ForbiddenError) as exc_info:
        enforce_tenant_boundary(ctx, "ORG#competitor-dairy")

    assert "Cross-tenant access forbidden" in str(exc_info.value)


def test_rbac_role_enforcement():
    """Verify that sensitive actions enforce required roles."""
    ctx = AuthContext(
        org_id="ORG#apex-foods",
        user_id="user-1",
        user_email="user@apex.com",
        roles=["WAREHOUSE_OPERATOR"],
    )

    with pytest.raises(ForbiddenError) as exc_info:
        require_role(ctx, ["COMPLIANCE_OFFICER", "ADMIN"])

    assert "Operation requires one of the following roles" in str(exc_info.value)


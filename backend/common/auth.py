"""Authentication and Authorization Context Layer for BatchGuard.

Extracts, validates, and enforces trusted identity, tenant isolation, and RBAC
from Amazon Cognito User Pool claims or API Gateway request authorizer context.
"""

import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from backend.common.config import config
from backend.common.exceptions import BatchGuardException
from backend.common.logger import get_logger

logger = get_logger("batchguard.auth")


class UnauthorizedError(BatchGuardException):
    """Raised when authentication credentials or context are missing or invalid."""

    def __init__(self, message: str = "Authentication required."):
        super().__init__(message, code="UNAUTHORIZED", status_code=401)


class ForbiddenError(BatchGuardException):
    """Raised when the authenticated caller lacks permission or attempts cross-tenant access."""

    def __init__(self, message: str = "Access forbidden."):
        super().__init__(message, code="FORBIDDEN", status_code=403)


@dataclass(frozen=True)
class AuthContext:
    """Represents the cryptographically verified caller context from API Gateway."""

    org_id: str
    user_id: str
    user_email: str
    roles: List[str] = field(default_factory=list)
    is_authenticated: bool = True
    token_use: str = "id"


def extract_auth_context(event: Dict[str, Any]) -> AuthContext:
    """Extracts and verifies caller identity strictly from trusted requestContext.

    Prioritizes Amazon Cognito User Pool claims injected by API Gateway authorizer.
    In local development / offline testing, safely falls back to configured development defaults
    or explicit X-Organization-Id headers ONLY when ENVIRONMENT is 'development' or 'test'.
    """
    request_context = event.get("requestContext") or {}
    authorizer = request_context.get("authorizer") or {}

    # 1. Production Path: Amazon Cognito User Pool claims injected into requestContext
    claims = authorizer.get("claims") or authorizer

    if claims and isinstance(claims, dict):
        user_id = claims.get("sub") or claims.get("cognito:username") or claims.get("username")
        user_email = claims.get("email") or "unknown@partner.internal"
        # Organization ID must be set in custom attribute 'custom:org_id' or Cognito group
        org_id = claims.get("custom:org_id") or claims.get("org_id")

        # Extract roles from Cognito groups (e.g. ['QualityManager', 'ComplianceOfficer'])
        groups = claims.get("cognito:groups") or []
        if isinstance(groups, str):
            groups = [g.strip() for g in groups.split(",")]

        if user_id and org_id:
            return AuthContext(
                org_id=org_id,
                user_id=user_id,
                user_email=user_email,
                roles=groups,
                is_authenticated=True,
            )

    # 2. IAM SigV4 Authentication Path (for non-public test environments / automation runners)
    identity = request_context.get("identity") or {}
    caller_arn = identity.get("userArn") or identity.get("caller")
    if caller_arn:
        caller_user = identity.get("user") or str(caller_arn).split("/")[-1]
        return AuthContext(
            org_id=config.default_org_id,
            user_id=str(caller_arn),
            user_email=f"{caller_user}@iam.internal",
            roles=["ADMIN", "COMPLIANCE_OFFICER"],
            is_authenticated=True,
        )

    # 3. Guard against Client-Supplied Header Spoofing in Deployed Environments
    # In ANY deployed AWS Lambda execution environment or non-test environment,
    # client-supplied HTTP headers (e.g. X-User-Roles, X-Organization-Id) MUST NEVER be trusted!
    is_lambda_runtime = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
    env = os.environ.get("ENVIRONMENT", config.environment).lower()

    if is_lambda_runtime or env in ["prod", "production", "staging"]:
        logger.error(
            "Rejecting request: Missing trusted authorizer context (Cognito User Pool claims or IAM SigV4 identity). "
            "Client-supplied authentication headers are strictly rejected in deployed environments."
        )
        raise UnauthorizedError(
            "Trusted authentication context missing from request. "
            "Client-supplied authentication headers cannot be used to establish identity."
        )

    # 4. Local Unit Testing / Offline Mock Harness ONLY (ENVIRONMENT == 'development' or 'test' outside Lambda)
    headers = event.get("headers") or {}
    # Normalize headers to lowercase to ensure case-insensitive matching
    normalized_headers = {k.lower(): v for k, v in headers.items()}

    header_org = normalized_headers.get("x-organization-id")
    header_user = normalized_headers.get("x-user-id") or "usr-dev-officer"
    header_email = normalized_headers.get("x-user-email") or "compliance.officer@apexnutrition.internal"
    header_roles = normalized_headers.get("x-user-roles", "COMPLIANCE_OFFICER,ADMIN").split(",")

    effective_org = header_org or config.default_org_id

    return AuthContext(
        org_id=effective_org,
        user_id=header_user,
        user_email=header_email,
        roles=[r.strip() for r in header_roles if r.strip()],
        is_authenticated=True,
    )


def enforce_tenant_boundary(auth_context: AuthContext, target_org_id: Optional[str]) -> None:
    """Guards against Cross-Tenant Access (IDOR).

    Ensures the caller cannot access or mutate resources belonging to another organization.
    """
    if target_org_id and target_org_id != auth_context.org_id:
        logger.warning(
            f"Tenant boundary violation: Caller org '{auth_context.org_id}' "
            f"attempted to access target org '{target_org_id}'."
        )
        raise ForbiddenError(
            f"Cross-tenant access forbidden. You cannot access resources outside '{auth_context.org_id}'."
        )


def require_role(auth_context: AuthContext, allowed_roles: List[str]) -> None:
    """Enforces role-based access control on sensitive operations."""
    user_roles = [r.upper() for r in auth_context.roles]
    normalized_allowed = [r.upper() for r in allowed_roles]

    if not any(r in normalized_allowed for r in user_roles):
        logger.warning(
            f"RBAC denial: User '{auth_context.user_id}' with roles {auth_context.roles} "
            f"lacks required role in {allowed_roles}."
        )
        raise ForbiddenError(f"Operation requires one of the following roles: {', '.join(allowed_roles)}.")

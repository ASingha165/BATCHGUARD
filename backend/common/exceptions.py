"""Custom domain exceptions for BatchGuard backend."""


class BatchGuardException(Exception):
    """Base exception for all domain errors."""

    def __init__(self, message: str, code: str = "INTERNAL_SERVER_ERROR", status_code: int = 500, details=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []


class ValidationError(BatchGuardException):
    """Raised when incoming client request payload is invalid."""

    def __init__(self, message: str, details=None):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400, details=details)


class ResourceNotFoundError(BatchGuardException):
    """Raised when a requested resource (batch, recall, supplier) does not exist."""

    def __init__(self, message: str):
        super().__init__(message, code="RESOURCE_NOT_FOUND", status_code=404)


class UnauthorizedRecallError(BatchGuardException):
    """Raised when 2FA or confirmation token for recall is invalid."""

    def __init__(self, message: str):
        super().__init__(message, code="UNAUTHORIZED_RECALL", status_code=403)


class IdempotencyConflictError(BatchGuardException):
    """Raised when an operation has already executed under the given idempotency token."""

    def __init__(self, message: str, details=None):
        super().__init__(message, code="IDEMPOTENCY_CONFLICT", status_code=409, details=details)


class InvalidStateTransitionError(BatchGuardException):
    """Raised when an illegal recall state transition is attempted."""

    def __init__(self, message: str, details=None):
        super().__init__(message, code="INVALID_STATE_TRANSITION", status_code=400, details=details)



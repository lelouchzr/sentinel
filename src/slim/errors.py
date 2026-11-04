"""Errors safe to expose at the HTTP and CLI boundaries."""


class SlimError(Exception):
    def __init__(self, message: str, code: str = "invalid_request") -> None:
        super().__init__(message)
        self.code = code

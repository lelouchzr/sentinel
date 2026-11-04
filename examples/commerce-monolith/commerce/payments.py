"""Unrelated subsystem. Slim should leave it behind."""

from . import db


class PaymentService:
    def charge(self, customer_id: str, amount: float):
        return db.connect().payments.charge(customer_id, amount)

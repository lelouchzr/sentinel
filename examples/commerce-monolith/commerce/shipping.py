"""Shipping logic currently coupled to database access."""

from . import db
from .money import round_money

MAX_WEIGHT = 30


def calculate_shipping(country: str, weight_kg: float, subtotal: float) -> float:
    """Calculate shipping fees with country rules, free shipping, and a weight limit."""
    if weight_kg < 0 or subtotal < 0:
        raise ValueError("Weight and subtotal must be non-negative")
    if weight_kg > MAX_WEIGHT:
        raise ValueError("Parcel exceeds the 30 kg limit")
    rules = db.load_shipping_rules()
    if country not in rules:
        raise ValueError(f"Unsupported destination: {country}")
    rule = rules[country]
    if subtotal >= rule["free_above"]:
        return 0.0
    return round_money(rule["base"] + weight_kg * rule["per_kg"])


def create_shipping_label(order_id: str):
    connection = db.connect()
    return connection.labels.create(order_id)

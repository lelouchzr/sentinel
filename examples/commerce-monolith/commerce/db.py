"""Stand-in for a database connection, with JSON-compatible fixture state."""

SHIPPING_RULES = {
    "FR": {"base": 4.9, "per_kg": 1.2, "free_above": 80},
    "DE": {"base": 6.9, "per_kg": 1.5, "free_above": 100},
    "US": {"base": 14.9, "per_kg": 3.0, "free_above": 200},
}


def load_shipping_rules():
    # The extracted feature replaces this implicit access with a required argument.
    return SHIPPING_RULES


def connect():
    raise RuntimeError("A live database is intentionally not needed in this demo")

from decimal import ROUND_HALF_UP, Decimal


def round_money(value: float) -> float:
    """Round at the monetary boundary instead of accumulating binary float error."""
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

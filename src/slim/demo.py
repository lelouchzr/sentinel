"""A real, deterministic demo request shared by the CLI and HTTP workbench."""

from pathlib import Path

from slim.models import Boundary, PlanRequest, Scenario

RULES = {
    "FR": {"base": 4.9, "per_kg": 1.2, "free_above": 80},
    "DE": {"base": 6.9, "per_kg": 1.5, "free_above": 100},
    "US": {"base": 14.9, "per_kg": 3.0, "free_above": 200},
}


def demo_request(workspace: Path) -> PlanRequest:
    cases = [
        ("Domestic delivery", ["FR", 2, 45]),
        ("EU delivery", ["DE", 3.5, 60]),
        ("International delivery", ["US", 1.5, 90]),
        ("Free shipping threshold", ["FR", 2, 80]),
        ("Exactly at weight limit", ["DE", 30, 20]),
        ("Zero weight parcel", ["FR", 0, 0]),
        ("Unknown destination", ["JP", 2, 50]),
        ("Negative weight", ["FR", -1, 50]),
        ("Overweight parcel", ["FR", 31, 50]),
        ("Negative subtotal", ["FR", 2, -1]),
    ]
    return PlanRequest(
        source=str(workspace / "examples" / "commerce-monolith"),
        entry="commerce.shipping:calculate_shipping", package_name="shipping_core",
        boundaries=[Boundary(call="db.load_shipping_rules", parameter="shipping_rules", description="Replace database lookup with explicit shipping rules")],
        scenarios=[Scenario(name=name, args=args, candidate_kwargs={"shipping_rules": RULES}) for name, args in cases],
    )

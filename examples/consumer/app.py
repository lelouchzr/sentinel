"""A separate application: imports only installed extracted wheels, never the monolith."""

import argparse
import json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream", action="store_true")
    args = parser.parse_args()
    if args.upstream:
        from ipv6_check import is_valid_ipv6_address
        from json_encoding import guess_json_utf
        from safe_paths import safe_join

        result = {
            "encoding": guess_json_utf(b'\xef\xbb\xbf{"ok":true}'),
            "safe_file": safe_join("/srv/uploads", "report.pdf"),
            "blocked_traversal": safe_join("/srv/uploads", "../secret"),
            "ipv6_valid": is_valid_ipv6_address("2001:db8::1"),
            "ipv4_rejected": is_valid_ipv6_address("127.0.0.1"),
        }
        assert result == {"encoding": "utf-8-sig", "safe_file": "/srv/uploads/report.pdf", "blocked_traversal": None, "ipv6_valid": True, "ipv4_rejected": False}
    else:
        from shipping_core import calculate_shipping

        rules = {"FR": {"base": 4.9, "per_kg": 1.2, "free_above": 80}}
        result = {"delivery_fee": calculate_shipping("FR", 2, 45, shipping_rules=rules), "free_shipping": calculate_shipping("FR", 2, 80, shipping_rules=rules)}
        assert result == {"delivery_fee": 7.3, "free_shipping": 0.0}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

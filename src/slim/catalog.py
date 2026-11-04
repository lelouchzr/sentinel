"""Curated public-repository specifications with executable input scenarios."""

from slim.models import Scenario


def cases(prefix, values):
    return [Scenario(name=f"{prefix} {i + 1:02d}", args=args) for i, args in enumerate(values)]


SPECS = [
    (
        "Requests",
        "https://github.com/psf/requests",
        "requests.utils:guess_json_utf",
        "json_encoding",
        cases(
            "Encoding",
            [
                [{"$bytes": value}]
                for value in [
                    "7b226122",
                    "efbbbf7b",
                    "fffe0000",
                    "0000feff",
                    "fffe7b00",
                    "feff007b",
                    "007b0022",
                    "7b002200",
                    "0000007b",
                    "7b000000",
                    "00010001",
                    "",
                ]
            ],
        ),
    ),
    (
        "Werkzeug",
        "https://github.com/pallets/werkzeug",
        "werkzeug.security:safe_join",
        "safe_paths",
        cases(
            "Path",
            [
                ["/srv/uploads", "image.png"],
                ["/srv/uploads", "a", "b.txt"],
                ["/srv/uploads", "../secret"],
                ["/srv/uploads", "/etc/passwd"],
                ["/srv/uploads", "a/../../secret"],
                ["/srv/uploads", "a/../b.txt"],
                ["", "hello.txt"],
                ["/srv/uploads", ".."],
                ["/srv/uploads", "."],
                ["/srv/uploads", ""],
            ],
        ),
    ),
    (
        "Django",
        "https://github.com/django/django",
        "django.utils.ipv6:is_valid_ipv6_address",
        "ipv6_check",
        cases(
            "IPv6",
            [
                ["::1"],
                ["::"],
                ["2001:db8::1"],
                ["::ffff:192.0.2.1"],
                ["127.0.0.1"],
                ["not-an-ip"],
                [""],
                [None],
                [42],
                ["f" * 80],
                ["2001:db8::g"],
                ["fe80::1"],
            ],
        ),
    ),
]

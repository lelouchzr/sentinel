"""Check rendered report navigation and untrusted text without external services."""

import json
from html.parser import HTMLParser

from markdown_it import MarkdownIt

from sentinel.cases import Cases
from sentinel.export import export_case
from sentinel.models import Finding, SearchFilters
from sentinel.storage import Store


class ReportNavigation(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors = []
        self.targets = []
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        attributes = dict(attrs)
        if tag == "a":
            if "id" in attributes:
                self.anchors.append(attributes["id"])
            if "href" in attributes:
                self.targets.append(attributes["href"])


def navigation(markdown):
    parser = ReportNavigation()
    parser.feed(MarkdownIt("commonmark", {"html": True}).render(markdown))
    assert len(parser.anchors) == len(set(parser.anchors))
    assert parser.targets
    assert all(target.startswith("#") and target[1:] in parser.anchors for target in parser.targets)
    assert "script" not in parser.tags
    return parser


def test_rendered_links_resolve_to_evidence_and_query_receipts(demo):
    cases = Cases(demo)
    page = Store(demo).search(SearchFilters(account="morgan", source_ip="203.0.113.74"), limit=2)
    ids = [event.event_id for event in page.events]
    receipt_id = page.receipt.receipt_id
    case = cases.create()
    cases.attach(case.case_id, ids)
    unknown = "E-" + "f" * 24
    cases.note(case.case_id, f"<script>alert(1)</script> [unsafe](javascript:alert(1)) {unknown}")
    finding = Finding(
        title="Same title",
        category="hypothesis",
        event_ids=ids,
        receipt_ids=[receipt_id],
        explanation=f"Review [{ids[0]}] with {receipt_id}; authorization remains uncertain.",
        limitations="Recorded activity alone does not establish operator identity.",
    )
    cases.update(case.case_id, lambda current: setattr(current, "findings", [finding, finding]))
    markdown = export_case(cases, case.case_id).read_text()
    links = navigation(markdown)
    assert "finding-1" in links.anchors and "finding-2" in links.anchors
    for identifier in ids:
        target = f"#event-{identifier.lower()}"
        assert target in links.targets and target[1:] in links.anchors
    query_target = f"#query-{receipt_id.lower()}"
    assert query_target in links.targets
    assert links.targets.count(f"#event-{ids[0].lower()}") >= 4
    assert not any(unknown.lower() in target for target in links.targets)
    assert "identity.csv" in markdown and "SHA-256:" in markdown
    assert "Back to findings" in markdown
    exported = json.loads(export_case(cases, case.case_id, "json").read_text())
    assert exported["computed_queries"][0]["total_count"] == page.total
    assert exported["evidence"][0]["source"]["original"] == page.events[0].source.original
    assert "<a id=" not in exported["case"]["findings"][0]["explanation"]


def test_empty_case_has_complete_navigation_without_broken_targets(demo):
    cases = Cases(demo)
    case = cases.create(title="Manual investigation without attached evidence")
    markdown = export_case(cases, case.case_id).read_text()
    links = navigation(markdown)
    assert "## Contents" in markdown
    assert "evidence" in links.anchors and "computed-queries" in links.anchors
    assert not any(anchor.startswith("finding-") for anchor in links.anchors)
    assert not any(anchor.startswith("event-") for anchor in links.anchors)

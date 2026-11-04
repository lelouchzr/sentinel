"""Deterministic OFFLINE TEST MODE only; never selected by the application."""

import asyncio
import json


class OfflineProvider:
    label = "OFFLINE TEST MODE · deterministic orchestration fixture"

    def __init__(self, *, pause=False, invalid=False):
        self.stage = 0
        self.evidence = []
        self.receipts = []
        self.pause = pause
        self.invalid = invalid
        self.entered = asyncio.Event()
        self.closed = False

    async def close(self):
        self.closed = True

    async def complete(self, messages, tools=None, schema=None):
        self.entered.set()
        if self.pause and self.stage >= 3:
            await asyncio.Event().wait()
        for message in messages:
            if message.get("role") == "tool":
                data = json.loads(message["content"]).get("untrusted_tool_data", {})
                for event in data.get("events", []):
                    if event["event_id"] not in [e["event_id"] for e in self.evidence]:
                        self.evidence.append(event)
                if data.get("event_id") and data["event_id"] not in [
                    e["event_id"] for e in self.evidence
                ]:
                    self.evidence.append(data)
                if data.get("receipt") and data["receipt"]["receipt_id"] not in self.receipts:
                    self.receipts.append(data["receipt"]["receipt_id"])
        if schema:
            event_ids = [e["event_id"] for e in self.evidence]
            report = {
                "findings": [
                    {
                        "title": "Recorded sequence",
                        "category": "observed_fact",
                        "event_ids": event_ids if not self.invalid else ["E-" + "0" * 24],
                        "receipt_ids": self.receipts,
                        "explanation": "Use recorded values.",
                        "limitations": "Identity and authorization are unproven.",
                    },
                    {
                        "title": "Unauthorized access remains possible",
                        "category": "hypothesis",
                        "event_ids": event_ids[-2:],
                        "explanation": "The source and sequence warrant checking with the account owner.",
                        "limitations": "A legitimate user or integration could explain the activity.",
                    },
                ],
                "open_questions": ["Was this session authorized by the account owner?"],
            }
            return {"role": "assistant", "content": json.dumps(report)}
        if "evidence reviewer" in messages[-1].get("content", "").lower():
            return {
                "role": "assistant",
                "content": "References identify recorded activity. Account takeover remains unproven; verify authorization and MFA audit records.",
            }
        self.stage += 1
        if self.stage == 1:
            name, args = "list_alerts", {}
        elif self.stage == 2:
            result = json.loads(messages[-1]["content"])["untrusted_tool_data"]
            alert = next(a for a in result["alerts"] if a["rule_id"] == "AUTH-002")
            self.account, self.ip = alert["entities"]["account"], alert["entities"]["source_ip"]
            name, args = (
                "search_events",
                {
                    "filters": {
                        "account": self.account,
                        "source_ip": self.ip,
                        "action": "login",
                        "outcome": "failure",
                    },
                    "limit": 30,
                },
            )
        elif self.stage == 3:
            name, args = (
                "search_events",
                {
                    "filters": {
                        "account": self.account,
                        "source_ip": self.ip,
                        "outcome": "success",
                    },
                    "limit": 10,
                },
            )
        elif self.stage == 4:
            event = next(
                e for e in self.evidence if e["outcome"] == "success" and e["action"] == "login"
            )
            name, args = "get_event", {"event_id": event["event_id"]}
            self.session = event["session_id"]
        elif self.stage == 5:
            name, args = "get_entity_activity", {"entity_type": "session_id", "value": self.session}
        else:
            return {
                "role": "assistant",
                "content": "The retrieved sequence needs an authorization check; recorded transfer alone does not establish exfiltration.",
            }
        if name == "search_events" and self.stage == 2:
            args["filters"] = json.dumps(args["filters"])
        return {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": f"test-call-{self.stage}",
                    "type": "function",
                    "function": {"name": name, "arguments": json.dumps(args)},
                }
            ],
        }

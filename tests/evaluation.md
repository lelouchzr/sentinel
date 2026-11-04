# Dataset evaluation expectations (not agent-visible)

Seed 20261104 generates 3,542 accepted events, 15 default alerts, and no malformed demo records.
The independent tests generate seed 17 and substitute different account names and source IPs.
The model cannot read this directory: its MCP server exposes only normalized records and case tools.

- Authentication sequence: 24 failed logins by morgan from 203.0.113.74 between 09:00:00
  and 09:03:04 UTC, then success at 09:03:20, restricted access at 09:03:40 and a
  recorded 840,000,000-byte download at 09:04:20. Only the successful login, access
  and download share session-702. The failures have request-701. Do not claim the
  failures used session-702. Account compromise and malicious intent are unproven.
- Service account: svc-indexer records eight exports totaling 1,308,000,000 bytes,
  with session job-811 and source 198.51.100.46. Its token-use record supplies
  maintenance-window context. An absent authorization record is an investigation gap.
- Benign alternative: svc-backup records four exports totaling 840,000,000 bytes.
  Its job-start and job-complete records share batch-920 and refer to approval CHG-2041.
  This is supporting logged context, not independently verified organizational approval.
- Default rules: one AUTH-001, one AUTH-002, and thirteen DATA-001 alerts.

The malformed fixture has one accepted record and four rejected records.
Never include this answer material in the model prompt or demo source directory.

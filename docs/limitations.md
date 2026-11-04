# Known limitations

- Designed for macOS and Linux. This delivery was executed on macOS with CPython 3.12.16.
  Linux is supported by the dependency/standard-library choices but was not executed here.
  Windows is unsupported because workspace/run locking uses POSIX flock.
- Three focused deterministic rules, not a SIEM, complete Sigma engine, threat-intelligence feed,
  production collector, forensic certification or legal chain-of-custody system.
- Canonical CSV/JSONL only; no automatic vendor mappings, streaming collectors, remote scanners,
  external account administration or cloud ingestion integrations.
- Local single-user workspaces. Cooperative locks serialize database operations. Workspace files
  are trusted local state. Do not share mutable databases on network filesystems or edit case JSON
  while the application is using it. Close other sessions before a demo reset.
- The importer reads supported files into memory with explicit per-file, record and dataset bounds.
  It is designed for investigation-sized inputs, not unrestricted multi-gigabyte production logs.
- Exact filters use AND; no arbitrary SQL, fuzzy search, regex or graph view is exposed to the model.
  A query page can be truncated even when its aggregate count and byte sum cover all matches.
- Logged session/account/IP correlations do not establish operator identity or causal responsibility.
  Logged approval text supports a benign alternative but is not independent approval validation.
- Only canonical observations and computed receipts are verified mechanically. Semantic hypotheses,
  open questions and model notes require analyst review. A valid reference alone does not prove them.
- Meta availability, permitted model access, quota and latency depend on the user's API account.
  Selected log excerpts and case context leave the local process during live investigation.
  No key is bundled. The model/base URL are explicit configuration; no automatic provider fallback.
- Zero automatic paid retries. Failed/cancelled runs retain completed artifacts; a follow-up is a new
  explicitly requested run, not an invisible retry. A hard process kill can leave the status as
  investigating; its OS run lock is released and the case can be reopened for a new run.
- The demo timing is based on an observed approximately 66.5-second live run. Rehearse shortly before
  recording. If the API is slow, show honest manual evidence or identify a reopened saved report as
  previously completed; do not represent saved/offline output as current live activity.
- Function-key behavior depends on terminal/keyboard settings; macOS may require Fn. Very narrow
  terminals need horizontal table scrolling or the evidence dialog. Tests target 100×30 and 140×42.

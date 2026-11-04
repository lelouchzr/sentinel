# Input schema, ingestion and provenance

Inputs are UTF-8 CSV (one header row) or JSONL (one object per nonblank physical line).
Directories may contain nested subdirectories. Filenames are stored relative to the selected source
root. Symlinks, including directory symlinks, are rejected. The importer opens source files read-only.
Only `.csv` and `.jsonl` are supported. Other files are reported as skipped.

| Canonical field | Required | Meaning |
| --- | --- | --- |
| timestamp | Yes | ISO 8601 timestamp; normalized to UTC with microseconds |
| source_type | Yes | Source label, e.g. auth, application, file; maximum 128 characters |
| host | No | Host name; empty if missing |
| account | No | User or service identity; empty if missing |
| source_ip | No | Logged source address; treated as a literal field, not a target |
| action | Yes | Action label; rules recognize login, download and export |
| outcome | Yes | Outcome label; rules recognize success and failure |
| resource | No | Logged object/path; never opened as a filesystem path |
| session_id | No | Explicit session/request/job identifier, when recorded |
| bytes | No | Nonnegative integer, at most signed 64-bit range; missing/empty means unknown |
| event_id | Generated | Stable E- identifier derived from position and source content identity |
| source | Generated | Relative filename, record number, line number, SHA-256 and original object |

Additional fields such as `context` stay in `source.original`; they do not become instructions.
Use the exact field names above. Source-specific mapping/automatic field guessing is not implemented.
Example records: [CSV](../examples/schema-samples/auth.csv), [JSONL](../examples/schema-samples/files.jsonl).

## Timestamps

An offset such as `Z`, `+00:00` or `+02:00` is honored explicitly. A timestamp without an offset
uses UTC by default. Select an IANA timezone with `ingest --timezone Europe/Paris`. Ambiguous or
nonexistent local DST times are rejected; provide an explicit offset to resolve them. Mixed source
ordering is permitted; queries always sort by normalized UTC timestamp and then stable event ID.
Search ranges are inclusive; a start after the end is invalid. Displayed time-only table cells use
UTC; full dates and offsets appear in the selected event and reports.

## Position and duplicate semantics

JSONL line and record number are its original physical line number, including gaps caused by invalid
or blank lines. CSV record number starts at one after the header; line is the starting physical line
of the record, including correct handling of quoted multiline values. Original positions are not
renumbered after rejection. IDs hash relative filename + SHA-256 + record position. Identical-looking
records at two positions remain distinct. Editing one file changes its hash and its event IDs.

The dataset ID hashes sorted supported file names/hashes, timezone interpretation and schema version.
Reimporting the same unchanged dataset yields `inserted=0` with accepted records counted as
`already_present`. Different identities are stored separately. Old cases retain their original
identity and evidence even when a different dataset becomes active. This is source-position
deduplication, not an attempt to collapse equivalent events from different systems.

## Accounting and errors

The manifest includes each supported file's SHA-256, size, accepted count and rejected count. The
last-ingestion summary adds inserted/already-present counts, timestamp and issue records. The summary
reports accepted records, rejected records and skipped blank lines/files; skipped is deliberately an
item count, not an event count. Unsupported/empty files are identified by filename. Invalid JSON,
missing/extra CSV cells, invalid timestamps, missing required fields, invalid byte counts, invalid
encoding and oversized records are reported with positions and safe reasons. Raw invalid values are
not printed as exception details. A CSV structural error reports the remaining unparseable tail as
one rejected parse error because a trustworthy record count cannot be recovered.

Limits: 25 MiB per file, 200,000 accepted events per import, 16,000 JSON characters per original record.
An entirely empty supported file creates an empty dataset with a skipped-file issue. A directory
without supported files returns a useful error. A rejection fixture is in
[tests/fixtures/malformed.jsonl](../tests/fixtures/malformed.jsonl); it is separate from demo data.

Source manifests identify imported bytes; they do not certify their origin or legal custody.

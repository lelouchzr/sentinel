# Vocabulary imports

Status: format requirements; importers are not implemented yet.

## First supported sources

| Source | MVP route | Important boundary |
| --- | --- | --- |
| Anki | `Notes in Plain Text` export, tab-separated fields | Field count and meaning vary by note type; require mapping |
| Quizlet | Paste text exported from the learner's own set | Official export is limited to eligible owned sets on the website |
| FlashCardStudy | Exported JSON | Implement from its actual exporter shape, not an assumed schema |
| Other tools | CSV, TSV, or pasted pairs | No claim of a native connection or automatic synchronization |
| Printed book | One vocabulary-page image | Extract a draft and require confirmation |

Anki `.apkg`/`.colpkg`, audio/image deck attachments, cloze templates, copied Quizlet sets without an official export, handwriting, and full-book ingestion are outside the first release. Explain unsupported content instead of silently flattening it incorrectly.

## Canonical import draft

Each row proposes an expression, meaning, optional example, target/explanation language, source row or page reference, and provenance for each field. Preserve the original text long enough for the learner to resolve a bad mapping. The confirmed vocabulary entry keeps source attribution without treating all model-suggested text as source content.

## Validation flow

1. Enforce a bounded upload and row count before parsing. Proposed defaults: 1 MiB for text, 500 rows, and 5 MiB for one image.
2. Decode UTF-8, handle a BOM and CRLF, and normalize Unicode consistently without deleting meaningful Korean characters.
3. Use a maintained parser for quoted CSV rather than splitting strings at commas. Detect or explicitly select separators and headers.
4. Preview fields and let the user choose expression/meaning/example columns and language direction.
5. Remove rendering markup safely. Anki can export HTML inside fields; extract plain text and never render untrusted HTML.
6. Surface empty fields, duplicate candidates, unsupported card types, and truncated rows. Preserve the user's ability to edit or skip individual entries.
7. Save only confirmed entries, in an idempotent operation.

Deduplication must consider normalized expression, meaning, languages, and user choice. Identical spelling with different meanings is not automatically a duplicate. Reimporting the same file must not silently multiply entries.

## Image-specific behavior

Allow JPEG, PNG, or WebP only after checking actual file content, decoded dimensions, and size. Store images privately. A model may extract layout imperfectly, especially with columns, small Hangul, or mixed languages. Let users crop or submit a clearer image through ordinary upload UX when useful.

The preview distinguishes:

- text observed on the page;
- translations/examples proposed by the model;
- edits made by the learner;
- items requiring review or a clearer image.

The model should return uncertainty rather than invent unreadable text. A new image should not overwrite a confirmed collection. Raw textbook images must not be committed to the repository or used to build a training dataset.

## Source-specific implementation notes

For FlashCardStudy, inspect `src/features/decks/services/deck-export.service.ts` in the authorized local repository during implementation and produce a small original fixture for its current JSON structure. Do not copy private decks or account data.

The [Anki export guide](https://docs.ankiweb.net/manual/exporting) and [Quizlet export guide](https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets) define the supported manual routes. Do not scrape around access restrictions.

The original [Korean/French sample](../examples/vocabulary.ko-fr.tsv) can seed a basic parser and demo without external copyrighted deck content. It is a small fixture, not a comprehensive curriculum.

## Acceptance examples

- A quoted CSV field containing a comma remains one field.
- CRLF and UTF-8 BOM do not corrupt Hangul.
- A multi-column Anki note can be mapped correctly.
- Imported HTML is visible as safe plain text, with script content removed.
- Same expression with two meanings survives confirmation when desired.
- Malformed JSON shows a useful error without partially creating a collection.
- An unreadable page leaves a correctable draft and consumes no additional call automatically.

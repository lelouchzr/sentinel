# Documentation index

Read the [project README](../README.md) first. The application, provider adapters, two SQL migrations, privacy endpoints and local guided mode are implemented. The documents distinguish locally checked behavior from cloud integration, Korean quality and deployment checks that still require real services.

| Document | Purpose |
| --- | --- |
| [Product](product.md) | Motivation, user journeys, MVP, and success criteria |
| [Architecture](architecture.md) | Stack, boundaries, request flows, and failure recovery |
| [Data model](data-model.md) | Implemented storage, ownership, privacy, and invariants |
| [AI and learning](ai-and-learning.md) | Provider roles, feedback evidence, and review loops |
| [Imports](imports.md) | File formats, extraction confirmation, and edge cases |
| [Development](development.md) | Local commands, future connection runbook, and maintenance |
| [Roadmap](roadmap.md) | Completed implementation and remaining integration/delivery gates |
| [Quality and demo](quality-and-demo.md) | Evaluation cases and a truthful demonstration |
| [Budget](budget.md) | USD 150 allocation, spending controls, and separate costs |
| [Sources](sources.md) | Reference links, verification date, and open assumptions |

Keep each topic in its existing document. Changes to product scope belong in `product.md`; provider-specific discoveries belong in `ai-and-learning.md` and `sources.md`. Update `CHANGELOG.md` for meaningful delivered changes. Avoid duplicating a decision across several planning files.

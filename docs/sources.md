# Sources and assumptions

Reference review date: **2026-10-29**. These links support planning; they do not verify the owner's provider account or a working integration. Recheck changing prices, limits, and submission requirements before using them.

| Source | Used for |
| --- | --- |
| [Hackathon event page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) | Event timing, tracks, and themes |
| [Muse Spark](https://dev.meta.ai/models/muse-spark) | Text/image model candidate and documented capabilities |
| [Meta speech-to-text guide](https://dev.meta.ai/docs/speech-to-text) | Recording/live endpoints, supported languages, and output limitations |
| [Meta Voice API reference](https://dev.meta.ai/docs/api-reference/voice) | Detailed voice contract to verify during implementation |
| [Meta model cookbook](https://dev.meta.ai/docs/cookbook) | Official examples for structured output, vision, and request handling |
| [Azure Speech language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts) | Korean synthesis voice candidates |
| [Anki export documentation](https://docs.ankiweb.net/manual/exporting) | Plain-text notes and native package distinctions |
| [Quizlet export documentation](https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets) | Manual export eligibility and format |
| [Next.js documentation](https://nextjs.org/docs) | Application setup reference |
| [Supabase documentation](https://supabase.com/docs) | Auth, PostgreSQL policies, and private Storage reference |
| [Zod documentation](https://zod.dev/) | Contract validation reference |
| [Vercel documentation](https://vercel.com/docs) | Deployment and hosting constraints to check |
| [Checkout action release](https://github.com/actions/checkout/releases/tag/v7.0.1) | Pinned documentation CI dependency |

## Confirmed project facts

- The owner is `lelouchzr` and has been accepted to the hackathon.
- The owner reports USD 150 of Meta Model API credits for development.
- The product is independent of FlashCardStudy and accepts vocabulary from several sources.
- Korean learning is motivated by a plan to live in South Korea and seek local or remote work.
- The owner wants private repository visibility and only their own account attribution.

These facts come from the owner's instructions, not from provider dashboards.

## Decisions made for this baseline

- Temporary repository name: `language-speaking-app`, pending future product naming.
- Initial target/explanation languages: Korean/French.
- Full-stack TypeScript application with server-side provider access.
- Short voice turns, three scenarios, and three target expressions per session.
- File-based imports and confirmed extraction from one printed vocabulary page.
- USD 120 development envelope and USD 30 demo reserve as proposed operating defaults.

## Still to validate

- Final participant rules, submission artifacts, service allowances, and pre-existing-code policy.
- Actual Meta model entitlements, available credit balance, rates, and runtime behavior.
- Korean recognition on learner speech and trustworthy feedback on conjugation/politeness.
- Hangul and multi-column extraction quality on permitted printed vocabulary pages.
- Azure voice availability in the chosen account/region and its separate cost.
- Browser recording formats and conversion requirements for the provider API.
- Hosting upload/duration limits and behavior under timeouts.
- Dependency versions and a current FlashCardStudy JSON fixture.
- Product name, domain, and any future public release policy.

Do not convert these open items into completed claims without evidence. The public event page still refers readers to final rules; participant acceptance does not substitute for reviewing them.

## Implementation references checked on 29 October 2026

- [Meta chat completions](https://dev.meta.ai/docs/protocols/chat-completions) and [structured output](https://dev.meta.ai/docs/structured-output): request envelope, JSON Schema and token limits.
- [Meta image understanding](https://dev.meta.ai/docs/image-understanding): image input and resizing considerations.
- [Azure REST synthesis](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech): regional SSML endpoint and audio output format.
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [Supabase server clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client): current runtime and authenticated cookie boundaries.

These documentation checks support the implementation; they are not live provider compatibility results.

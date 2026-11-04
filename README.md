# FRAME

**Une image. Une aventure.**

FRAME turns an illustration into a browser escape game. The gallery includes four
curated long adventures: _Le dernier service_, _Le Secret de la serre_,
_Le Phare des marées_ and _La Vigie de la Lune_. Each has four illustrated chapters,
20 interactions and two choice-dependent conclusions (about 30 minutes, estimated).
_Le dernier service_ now includes 28 interactions, three manipulation puzzles,
explicit key use and about 45 minutes of play (estimated). The homepage starts with an
image import (PNG, JPEG or WebP, up to 10 MB) or a prompt for Muse Image. Creators can edit
objects and clues, ask Meta Muse Spark to propose a scenario, use SAM 3.1 to
segment an interactive object, play-test the result and publish an immutable
version to a shared gallery.

## Run locally

Requires Node.js 22.13 or later. The supplied Vinext runtime uses React, TypeScript,
Cloudflare D1 and R2. Application records are persisted on the server, not in the
browser. Browser storage holds the current player's session capability and a
short-lived creation intent in IndexedDB. This preserves the file or prompt
through navigation/sign-in. Ready scenes resume without repeating a model call;
failed or interrupted image creation requires an explicit retry. Imported images
are normalized to a bounded PNG before upload. A new scenario needs only a scene,
never the kitchen's puzzle definition. The manual authoring option remains available.

The gallery and navigation expose a dedicated play entry and a short how-to-play
guide. Interactive regions are visible by default. On small screens discoveries
and code inputs sit immediately below the scene; focus follows the returned
interaction. The server restores only already-earned discovery messages with a
saved session, including the ending. Restarting an unfinished game requires a
confirmation. Creators can use **Jouer en privé** in their library to test an
owned draft without publishing it; draft authorization still applies.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fair_pete_wisdom.sql
npm run dev -- --port 5180 --hostname 127.0.0.1
```

Open http://127.0.0.1:5180. The portable starter simulates a single creator
identity only for loopback development; use the sign-in link in the interface.
The production Site uses platform-managed Sign in with ChatGPT. No production
authentication cookies or test identities are implemented by FRAME.

Export `MODEL_API_KEY` in the environment before starting local development to
use Meta. Hosted secrets are configured in Sites and injected at runtime. The
key is never returned by the health endpoint or sent to the browser. No key is
needed to play the built-in room or manually author and publish a game.

## Meta integration

- `muse-spark-1.3` receives the illustration and the creator's brief, and returns
  a structured proposal. Zod and the deterministic rule validator reject invalid
  output. Creators review proposals before applying them. Long format is selected
  by default: 3–4 acts in the supplied illustration, 18–24 objects, at least three
  manipulation puzzles and two endings. These acts reuse the supplied image; they
  do not imply that additional scenes were generated. Short format retains one
  room with 4–8 objects. A long response can take several minutes; requests are
  bounded to five minutes and never retried automatically. Truncated/invalid
  replies are rejected without replacing the previous draft.
- `sam-3.1` receives the illustration and a box identifying an object. The official
  `@meta-sam/parser` decodes the returned mask. Creators inspect the contour before
  keeping it. Saved masks include their model/run provenance.
- `muse-image-1.0` creates an optional original interior illustration, stored in R2
  with its generation provenance. The creator previews it before replacing a scene.
- There is no fine-tuning, synthetic claim of model execution or fallback that
  labels a manual result as AI-generated. Provider failures preserve the existing
  draft. An audit table records each actual model request and its outcome.

The code uses Meta Model API directly over HTTPS. Signed-in creators have a
30-request hourly allowance. See `lib/meta.ts` for the versioned model IDs,
structured-output schema, timeout and response validation.

## Game and publication contracts

`lib/game.ts` defines a bounded ruleset. An object can be inspected, collected,
opened with a code, unlocked, used to make a narrative choice or used as the exit. Actions can require previously
resolved objects. Items are not consumed and actions do not undo progress.
Chapter gates and object dependencies share the same deterministic validation.
Travel only exposes the current scene; hints cannot be requested in another scene.
Inventories, visited places, choices and earned journal entries persist across travel
and reload. Later chapter images and introductions are withheld until unlocked.
A fixed-point search checks reachability and rejects missing dependencies,
duplicate IDs, cycles and invalid regions. This proves reachability within this
ruleset; it does not establish that an illustration or clue is understandable.
Creators must complete a test of the current draft revision before publishing.

Answers, hidden requirements and discovery messages stay on the server. Player
sessions use random capability tokens and compare-and-swap revisions to prevent
concurrent writes from losing progress. Draft access and publication changes are
authorized against the platform's stable user ID.

Publications are immutable snapshots. Editing a draft does not change a published
game. Public versions appear in the gallery; unlisted versions play by link.
Withdrawing a version also disables its direct public game URL. Uploaded images
stay private until they are used by an active publication. Playing requires no
account when the Site's audience is public; creating and publishing require
sign-in. New Sites are owner-private until their audience is explicitly changed.

## Illustrated long editions

`lib/stories/` contains the authored narrative definitions. The canonical gallery
URLs omit the suffixes of the three earlier short publications. Those original
snapshots and existing sessions remain intact; their reader offers a link to the
long edition. A restored kitchen session also retains its original definition.
New kitchen games start the long edition. No publication or D1 migration is needed.

The player adds chapter arrival cards, a map for revisiting unlocked places,
scene transitions, subtle camera movement and scene-specific particles. Targets
and artwork share the same transform. Animation respects reduced-motion settings
and can be paused. A procedural soundscape is off by default and starts only
after an explicit gesture. There is no generated video or voice-over. Object interactions now open a
close-up workbench. Drawer fronts, lids and fruits are separate layers made from
the illustration's pixels; resolved actions persist after reload. SAM contours,
when present, delimit the moving artwork. Move and sequence puzzles and explicit
inventory-item use are checked on the server. Puzzle answers are redacted from
player payloads. Keyboard buttons accompany pointer dragging. Animations pause
under reduced-motion preferences.

The kitchen uses an auxiliary empty-bowl background plate edited with OpenAI's
built-in Imagegen, with original Meta image preserved. It is credited separately;
`public/motion/provenance.json` records its source, SHA-256 and edit prompt. This
asset is not labeled as a Meta generation.

The editor preserves chapter/choice definitions, shows the selected chapter's
objects and image, edits chapter prose/gates and ending variants, and sends that
chapter's image to SAM. Replacing one scene clears only its contours. Whole-room
scenario replacement is disabled for chaptered stories to avoid discarding them.

## Checks

```sh
make check
# With the local development server running:
make integration
```

`tests/stories.test.ts` checks all eight narrative routes, chapter gates,
backtracking, ending/journal persistence, redaction, target overlap and illustration
hashes. `tests/story-api.integration.ts` exercises all eight routes through D1,
including invalid travel, forged choices, revision conflicts and a published
secondary chapter image whose access is revoked on withdrawal.

`tests/manipulations.test.ts` checks duplicate/forged moves, hidden sequence
answers, wrong keys, invalid interaction combinations and both endings of the
actual Muse Spark long generation in `evidence/meta-long-interactive.json`. The
API suite plays that recorded result through D1 as an owned draft, as well as
the eight curated endings.

`tests/game.test.ts` checks complete playthroughs, wrong codes, locked actions,
invalid generated input, answer redaction and hint behavior. The API integration
suite checks private drafts, forged development identity headers, session tokens,
revision conflicts, play-test requirements, public and unlisted publication,
immutable snapshots, withdrawal and cross-origin rejection. It uses disposable
loopback fixtures and never calls Meta.

`evidence/meta-kitchen.json` contains an actual Muse Spark scenario accepted and
completed through the browser. Additional execution evidence records the exact
scope of verified behavior. These results are examples, not a claim that all
images or all model generations work.

## Code map

- `components/frame/`: gallery, player, editor, creator library and shared UI.
- `lib/game.ts`: schema, deterministic transitions and reachability checks.
- `lib/server.ts`: authenticated API, D1 persistence, R2 assets and publications.
- `lib/meta.ts`: Muse Spark and SAM API adapters.
- `db/schema.ts`, `drizzle/`: schema and versioned migrations.
- `public/scenes/`: original illustrations and their provenance.

## Artwork and licenses

The original classic kitchen artwork is by jcrown41, CC0-1.0, from
https://opengameart.org/content/kitchen-background-4-styles.
The Japanese room is by HachiStudio, CC0-1.0, from
https://opengameart.org/content/japanese-room.

The original files are copied without pixel modifications. `public/scenes/manifest.json`
records served filenames, source URLs and SHA-256 hashes. Credits follow each room
into its published snapshot. The starter's vendored code retains its license notices;
Meta's parser retains its own package license. FRAME's authored code uses MIT.

The self-hosted Geist font retains its SIL OFL notice in `public/licenses/`.
That directory also preserves the Meta SAM parser, Lucide, React and Zod notices.

The long editions use 16 Muse Image illustrations. Thirteen were generated for
these chapters using real `muse-image-1.0` calls; three starting scenes were copied
byte-for-byte from the previously approved FRAME publications.
`public/stories/manifest.json` and `base-manifest.json` retain original PNG hashes,
credits, prompts and available generation provenance. Their narrative text is
manually authored and is not presented as a model-generated output.
`node scripts/author-illustrations.mjs <prompt-list.json>` accepts hidden TTY
stdin authorization, reuses completed assets and never automatically retries a
paid failed call. `scripts/collect-story-art.mjs` similarly accepts hidden private
Site authorization for read-only collection of the three original scenes.

# Publishing SENTINEL on main

The owner authorized replacing the default branch with SENTINEL, publishing the approved film,
renaming the repository to `lelouchzr/sentinel`, and assigning GitHub topics on November 5, 2026.

The former remote `main` was `7996aa9744f89b481608bf3bd21c97409118f40a`. It is preserved on
`archive/storyscape-2026-11-05`. Sentinel descends from that commit, so a normal merge preserves
history and installs Sentinel's tracked tree without deleting a branch or force-pushing.
`projet/sentinel` remains available after the merge.

The approved film is tracked at `docs/media/sentinel-demo.mp4`, with a poster, source hash and
licensing notes beside it. It is the same verified 144-second delivery; no model request is
needed to play the film. The README explains the product and links to the film and editable source.

The original Storyscape directory `/path/to/original-project` remains on its local
`main` at the old commit. Its files, ignored state and running services are preserved. Remote
`main` now represents a different application: do not pull it into that old application directory
unless you intend to replace the local application too. Use the archive branch in a separate
checkout when you want a clean copy of Storyscape.

The Sentinel worktree remains `/path/to/sentinel`. Use its existing
`projet/sentinel` checkout, or clone `git@github.com:lelouchzr/sentinel.git` to obtain Sentinel
on the default branch. The shared local origin URL is retained to preserve other worktrees'
configuration; GitHub redirects the former repository URL after a rename. New clones should
use the new URL. No repository visibility change is authorized or performed.

The Sentinel copy of AGENTS.md is updated for the actual Python application. The original
instructions remain verbatim in the old checkout and archive. LICENSE remains unchanged.
CI now includes `main` and validates macOS; further Linux/Windows work remains paused.

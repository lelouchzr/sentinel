# Repository preservation

Original project: `/path/to/original-project`.
Original branch: `main`.
Original commit: `7996aa9744f89b481608bf3bd21c97409118f40a`.
Original tracked/untracked working tree: clean; ignored local state existed and was left untouched.

Sentinel checkout: `/path/to/sentinel`.
Sentinel branch: `projet/sentinel`, created from the original HEAD in a managed Git worktree.
Only tracked application files in that isolated checkout were replaced. The original
AGENTS.md and LICENSE are preserved verbatim. Previous application assets and generation
provenance remain accessible at the original commit and in the original checkout.
No private source data or secret files were copied. No original service was stopped.

Open Storyscape by changing to the original directory and using its existing commands.
Open Sentinel by changing to the Sentinel directory and following its README.
The worktrees share Git history but have separate working files, dependencies, and state.
Do not switch the original directory to Sentinel to run this application.

Final verification: the original checkout remained on main at the recorded SHA, with clean
tracked/untracked status. All 210 original tracked files matched the pre-work SHA-256 baseline.
The original 19 ignored status groups remained; no ignored project state was copied or removed.

The follow-up platform work was pushed only to `projet/sentinel` in the existing private
`lelouchzr/storyscape` repository. The original checkout and `main` were rechecked after Linux,
Windows and macOS validation: the recorded branch/SHA, all 210 tracked hashes, clean
tracked/untracked status and 19 ignored status groups still matched. No merge into `main`
or change to repository visibility was performed.

The live-JSON correction and revised Hyperframes film were also checked against that baseline:
all 210 original hashes, main SHA, clean tracked/untracked status and 19 ignored groups matched.
The two existing untracked .DS_Store files in the Sentinel checkout were left in place and ignored.

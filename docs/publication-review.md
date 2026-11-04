# Public repository review

The owner requested public hackathon sharing and then explicitly requested anonymization of
author email and local home paths before publication on November 5, 2026.

The original repository remains in a separate private archive, with its commits and pull request
references untouched. The public `lelouchzr/sentinel` repository receives an anonymized copy of
the branch history. This avoids exposing old GitHub pull request refs or cached commits: a
force-push of rewritten branches alone does not remove those references. See
[GitHub's sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Existing local projects, files, ignored state and shared Git configuration remain intact. Their
history belongs to the private archive. Use a fresh clone of the public repository for further
public contributions; do not merge or push pre-anonymization commits into it.

## Audit scope

- An isolated mirror of every remote branch, tag and available pull request ref; initially
  62 commits, 923 distinct reachable file blobs, 891 text blobs and 32 binary blobs.
- Gitleaks 8.30.1, downloaded from its official release with its release checksum verified,
  using the default rules plus a Meta Model API credential pattern, fully redacted output,
  all-history scanning and a separate scan of every extracted text blob.
- Additional credential-pattern and sensitive-filename checks across all reachable blobs,
  including commit messages, author/committer metadata and tracked source captures.
- OCR of historical PNG/JPEG media for visible credentials or personal metadata, plus review
  of the approved fictional-data film's source recordings and existing publication checks.
- A second scan of the anonymized history and the final published refs before public visibility.

The initial Gitleaks history scan produced 32 generic-key findings; the all-text-blob scan produced
33, including a historical file version not reported separately by the diff scan. They were
reviewed as false positives in the old application's story identifier arrays and English
translation dictionary, where ordinary story text contains words such as "key" or "secret".
No actual credential was identified. Those findings are not silently suppressed as a blanket
path exclusion. Raw scan details and intermediate data remain outside the published tree.

Author contact metadata and personal home-directory paths were replaced in the public history.
The original metadata remains only in the private archive and pre-existing local checkouts.
One historical screenshot (`evidence/slim-llama.jpg`) contained a personal home path in its
pixels. It is omitted from the public branch history rather than represented as unedited
evidence. The original image, its licensing information and its historical hashes remain
unchanged in the private archive. Other media and the approved film retain their original bytes.
Demo event records use fictional accounts and reserved example IP ranges. No private production
log dataset, runtime workspace, environment file or live API credential is included.

Automated scanning and OCR have limits and are not a guarantee that every possible secret or
privacy issue can be recognized. The report records the checks performed and their scope;
it does not claim forensic certification or a comprehensive security audit.

The approved video remains byte-identical to the accepted delivery. During live application
use, selected evidence excerpts and case context are sent to the configured Meta API.

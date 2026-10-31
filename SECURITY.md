# Security policy

## Supported versions

Only the latest release of the five packages (`framebudget`, `@framebudget/core`, `@framebudget/react`, `@framebudget/vue`, `@framebudget/angular`) gets security fixes. They are released together, always at the same version.

## Reporting a vulnerability

Report it privately through [GitHub's private vulnerability reporting](https://github.com/framebudget/core/security/advisories/new), not in a public issue or pull request. Include the affected version, how to reproduce it and what it lets an attacker do.

You will get an answer within 7 days. Once a fix is released, the advisory is published with credit to the reporter, unless you ask otherwise.

## Releases

Every release is immutable and carries build provenance. Verify what you install with `gh release verify vX.Y.Z` and `gh attestation verify <file> --repo framebudget/core`, or `npm audit signatures` for the packages on npmjs.

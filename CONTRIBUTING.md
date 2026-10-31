# Contributing to framebudget

Anyone is welcome to contribute. Open an [issue](https://github.com/framebudget/core/issues) for a bug or an idea, or fork the repository and open a pull request against `main`; no prior permission is needed.

## Pull requests

- **Review.** Every pull request needs the approval of a framebudget code owner ([`.github/CODEOWNERS`](.github/CODEOWNERS)) before it can be merged. A new push dismisses earlier approvals, and the last push must be approved by someone other than its author.
- **Checks.** Open the pull request as a draft while you work; marking it ready for review runs the [pull request checks](README.md#pull-request-checks). Run `npm test`, `npm run lint` and `npm run typecheck` locally first (the pre-commit hook does it for you).
- **Title.** Pull requests are squash merged, so the title becomes the commit on `main` and feeds the release notes. Write it as a [conventional commit](https://www.conventionalcommits.org/): `type(scope): description`, for example `fix(governor): ignore hidden tabs`.

## Development

The repository layout, the commands and the lint rules are in the [Development](README.md#development) section of the README.

## Security

Do not report vulnerabilities in public issues; see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contribution is licensed under the [MIT license](LICENSE) of this repository.

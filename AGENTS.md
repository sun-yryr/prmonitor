# Agent Guidelines

- Communicate with the user in Japanese.
- Write code comments, identifiers, commit messages, and pull request text in English.
- Keep these language rules for all files in this repository unless overridden by nested instructions.
- Commit messages should start with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) prefixes. Kinds of prefixes are:
  - feat: A new feature
  - fix: A bug fix
  - docs: Documentation only changes
  - style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
  - refactor: A code change that neither fixes a bug nor adds a feature
  - test: Adding missing tests or correcting existing tests
  - chore: Other changes that don't modify src or test files
  - revert: Reverts a previous commit
  - ci: Changes to our CI configuration files and scripts (example scopes: GitHub Actions)
- For breaking changes, add `!` after the prefix (e.g., `feat!:` or `fix!:`).

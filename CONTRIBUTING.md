# Contributing to MusicMigrate

Contributions are welcome, including code changes, bug reports, documentation improvements, and feature suggestions.

## What to Contribute

- Bug fixes
- Reliability improvements
- UI/UX improvements
- Docs updates
- New feature suggestions

If you are suggesting a new idea, open an issue first so we can align on scope and implementation.

## Reporting Issues

Please include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Environment details (OS, Python version, Node version)
- Relevant logs or screenshots

## Pull Request Workflow

1. Fork the repo and create a branch from `main`.
2. Make focused changes (one topic per PR when possible).
3. Run checks locally.
4. Open a PR with a clear summary and testing notes.

## Local Checks

Backend:

```bash
cd backend
uv run ruff check .
uv run python -m compileall .
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Code Style

- Backend: Python 3.12, type hints encouraged, keep code readable and explicit.
- Frontend: React functional components with hooks, keep state logic straightforward.
- Keep documentation in sync when behavior/config changes.

## Questions and Suggestions

Suggestions are always welcome.  
If you want to add something new, open an issue and describe:

- The problem it solves
- Proposed behavior
- Any API/UI impact

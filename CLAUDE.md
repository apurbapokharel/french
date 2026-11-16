# French for Canadian PR

Free site taking English speakers already in Canada from zero French to NCLC 7
(TEF Canada / TCF Canada) for PR points. Full plan: `docs/PLAN.md`.

- `web/`: Vite + TypeScript site on GitHub Pages (owned by Claude)
- `ai/`: Python package + local API server, no UI (owned by the user)
- `api/openapi.yaml`: the only contract between web/ and ai/

## Code rules

- No automated tests unless the user asks for them.
- No code comments of any kind. The only exception: a function or module may document its inputs and outputs (for example a docstring listing parameters and return value). Nothing else: no explanations, no TODOs, no section markers, no commented-out code.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on apurbapokharel/french (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

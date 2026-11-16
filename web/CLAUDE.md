# web

Vite + TypeScript site, no framework. Deployed to GitHub Pages under the `/french/` base path.

- `npm run dev`: dev server on http://localhost:5173 (the only dev origin the AI server allows)
- `npm run typecheck`: regenerate API types, then `tsc --noEmit`
- `npm run build`: typecheck, then build to `dist/`

## API types

`src/api/schema.d.ts` is generated from `../api/openapi.yaml` by `npm run gen` and is gitignored.
Never edit it or hand-write API response types; import from it. To change the API, change the spec.

## Local AI server

The site talks to the learner's own server at `http://127.0.0.1:8765` (see `src/ai.ts`).
Every feature except speaking drills must work when the server is not running.

## Lesson content

Lessons are JSON in `src/content/lessons/<unit>.<order>.json`; units are in `src/content/units.json`.
`src/content/lesson.schema.json` and `unit.schema.json` are the source of truth for their shape:
`npm run gen` generates TypeScript types from them into `src/content/types/` (gitignored), and
`npm run validate:content` (part of `build`) rejects any file that doesn't match.

- Mark any French not confirmed against a trusted reference with `"uncertain": true`.
- New lessons start as `"review": { "status": "unreviewed" }`. Only a fluent reviewer changes that.

Routes are hash-based (`#/`, `#/lessons/1.1`) because GitHub Pages can't serve history-API routes.

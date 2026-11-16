# ai

Python package `french-ai`, owned by the user. A local FastAPI server with no UI.
Ask before making design changes here.

- Install: `uv tool install ./ai` (from a clone) or
  `uv tool install "git+https://github.com/apurbapokharel/french#subdirectory=ai"`
- Run: `french-ai serve`, binds 127.0.0.1:8765; override with `--port` or `FRENCH_AI_PORT`
- Dev: `uv run --project ai french-ai serve`

## Server rules

- Bind to 127.0.0.1 only.
- CORS allows only the origins in `ALLOWED_ORIGINS` (`src/french_ai/__init__.py`):
  the GitHub Pages origin and the web dev origin. Private-network-access preflight is allowed.
- Every endpoint lives under `/v1/` and must match `../api/openapi.yaml`.

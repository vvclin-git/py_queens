# Changelog

## Unreleased

- Added a static Queens level editor/parser/play tool under `tools/level_editor/`.
- Added a Pyodide-compatible `solve_regions()` solver API.
- Added pytest-based solver coverage and development test dependency management through `uv`.
- Added a Windows launcher script for the level editor.
- Added an editor-side cropped screenshot preview beside the parsed board.
- Added solver diagnostics for CPU time, search steps, and backtracks.
- Added a client-side region connectivity guardrail that highlights disconnected cells and blocks solving.
- Vendored Pyodide for the level editor so GitHub Pages deployments can run the solver without CDN access.

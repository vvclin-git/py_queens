# Queens Level Editor

Static browser tooling for converting LinkedIn Queens screenshots into JSON fixtures,
editing region maps, and solving the edited level with the Python solver through
Pyodide.

## Run

Serve the repository root so the app can fetch `queens.py`:

```powershell
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/tools/level_editor/
```

Pyodide is loaded from a CDN, so the first solver run requires network access.

## Workflow

1. Open the Parser tab and import a screenshot.
2. Drag a crop box around the game grid.
3. Set board size and color count, then parse the crop.
4. Correct the parsed regions in the Editor tab by selecting a palette entry and painting cells.
5. Export the plain matrix JSON or open the level in Play/Solve.
6. Use Solve to run the Python solver in-browser and render numbered solution cells.

The persisted format is the existing plain matrix JSON shape used by `games/*.json`.

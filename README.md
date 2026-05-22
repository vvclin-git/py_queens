# py_queens
a queens implementation by python

## Level editor

The browser-based level editor lives in `tools/level_editor/`. It can parse a
manually cropped LinkedIn Queens screenshot, show the crop next to the parsed
board for review, edit the parsed region matrix, and run the Python solver
in-browser through the vendored Pyodide runtime with timing and search
diagnostics.

Run it from the repository root:

```powershell
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/tools/level_editor/`.

On Windows, you can also double-click `run_level_editor.bat` to start the
server and open the editor.

The editor imports and exports the same plain matrix JSON format used by
`games/*.json`.

The editor is fully static and can be hosted on GitHub Pages. Pyodide is
included under `tools/level_editor/vendor/pyodide/`, so the solver does not
depend on a CDN at runtime.

The editor also validates that each region is 4-connected. Disconnected extra
components are highlighted and Play/Solve is disabled until the board is fixed.

## Optional notebook preview

The solver core does not require matplotlib. Install the optional visualization
dependencies when you want quick previews in a notebook:

```powershell
uv pip install -e ".[viz]"
```

```python
from queens import Board
from helpers.visualize import draw_board

board = Board([[0, 1], [1, 0]])
draw_board(board)
```

See `visualization_demo.ipynb` for a fuller notebook walkthrough.

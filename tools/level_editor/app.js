(function () {
  const paletteColors = [
    '#8fb8f2', '#ffc98f', '#b7dfa4', '#d9d9d9',
    '#ff745f', '#e7f47a', '#bab39e', '#b79adf',
    '#76c7c0', '#f2a7c6', '#b9c5ff', '#f0d36f',
    '#9bd7a8', '#d0b3ff', '#ffb0a6', '#a6dcef'
  ];

  const state = {
    regions: createMatrix(8, 0),
    palette: paletteColors.slice(0, 8),
    selectedRegion: 0,
    crop: null,
    image: null,
    imageScale: 1,
    cropPreview: null,
    manualQueens: new Set(),
    solution: [],
    solverStats: null,
    illegalHighlights: new Set(),
    hasIllegalGame: false,
    illegalMessage: '',
    illegalGameHandler: defaultIllegalGameHandler,
    pyodide: null
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindElements();
    if (!els.status) return;
    bindTabs();
    bindParser();
    bindEditor();
    bindPlay();
    syncPaletteToSize();
    renderAll();
  }

  function bindElements() {
    Object.assign(els, {
      status: document.getElementById('app-status'),
      screenshotInput: document.getElementById('screenshot-input'),
      previewCanvas: document.getElementById('preview-canvas'),
      boardSize: document.getElementById('board-size'),
      colorCount: document.getElementById('color-count'),
      parseButton: document.getElementById('parse-button'),
      cropX: document.getElementById('crop-x'),
      cropY: document.getElementById('crop-y'),
      cropW: document.getElementById('crop-w'),
      cropH: document.getElementById('crop-h'),
      cropPreviewCanvas: document.getElementById('crop-preview-canvas'),
      parseMessage: document.getElementById('parse-message'),
      editorGrid: document.getElementById('editor-grid'),
      palette: document.getElementById('palette'),
      jsonOutput: document.getElementById('json-output'),
      exportButton: document.getElementById('export-button'),
      jsonInput: document.getElementById('json-input'),
      clearButton: document.getElementById('clear-button'),
      sendPlayButton: document.getElementById('send-play-button'),
      editorMessage: document.getElementById('editor-message'),
      playGrid: document.getElementById('play-grid'),
      solveButton: document.getElementById('solve-button'),
      resetPlayButton: document.getElementById('reset-play-button'),
      solverMessage: document.getElementById('solver-message')
    });
  }

  function bindTabs() {
    document.querySelectorAll('.tab-button').forEach((button) => {
      button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
  }

  function bindParser() {
    els.screenshotInput.addEventListener('change', loadScreenshot);
    els.boardSize.addEventListener('change', () => {
      const size = getBoardSize();
      els.colorCount.value = String(size);
      state.regions = createMatrix(size, 0);
      syncPaletteToSize();
      runIllegalGameHook();
      renderAll();
    });
    els.colorCount.addEventListener('change', syncPaletteToSize);
    els.parseButton.addEventListener('click', parseCrop);
    bindCropCanvas();
  }

  function bindEditor() {
    els.exportButton.addEventListener('click', exportJson);
    els.jsonInput.addEventListener('change', importJson);
    els.clearButton.addEventListener('click', () => {
      state.regions = createMatrix(getBoardSize(), 0);
      state.solution = [];
      state.solverStats = null;
      state.manualQueens.clear();
      runIllegalGameHook();
      renderAll();
    });
    els.sendPlayButton.addEventListener('click', () => {
      if (state.hasIllegalGame) {
        setMessage(els.editorMessage, state.illegalMessage || 'Fix highlighted cells before solving.', true);
        return;
      }
      state.solution = [];
      state.solverStats = null;
      switchTab('play');
      renderPlayGrid();
    });
  }

  function bindPlay() {
    els.solveButton.addEventListener('click', solveWithPyodide);
    els.resetPlayButton.addEventListener('click', () => {
      state.manualQueens.clear();
      state.solution = [];
      state.solverStats = null;
      renderPlayGrid();
    });
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
  }

  function loadScreenshot(event) {
    const file = event.target.files[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      state.image = image;
      fitCanvasToImage();
      state.crop = null;
      drawPreview();
      setMessage(els.parseMessage, 'Draw the grid bounds on the preview.');
    };
    image.src = URL.createObjectURL(file);
  }

  function fitCanvasToImage() {
    const maxWidth = 900;
    const maxHeight = 620;
    state.imageScale = Math.min(maxWidth / state.image.width, maxHeight / state.image.height, 1);
    els.previewCanvas.width = Math.round(state.image.width * state.imageScale);
    els.previewCanvas.height = Math.round(state.image.height * state.imageScale);
  }

  function bindCropCanvas() {
    let start = null;
    els.previewCanvas.addEventListener('pointerdown', (event) => {
      if (!state.image) return;
      els.previewCanvas.setPointerCapture(event.pointerId);
      start = canvasPoint(event);
      state.crop = { x: start.x, y: start.y, width: 0, height: 0 };
      drawPreview();
    });
    els.previewCanvas.addEventListener('pointermove', (event) => {
      if (!start) return;
      const point = canvasPoint(event);
      state.crop = normalizeRect(start.x, start.y, point.x - start.x, point.y - start.y);
      drawPreview();
    });
    els.previewCanvas.addEventListener('pointerup', () => {
      start = null;
      updateCropMetrics();
    });
  }

  function canvasPoint(event) {
    const rect = els.previewCanvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(els.previewCanvas.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(els.previewCanvas.height, event.clientY - rect.top))
    };
  }

  function normalizeRect(x, y, width, height) {
    return {
      x: width < 0 ? x + width : x,
      y: height < 0 ? y + height : y,
      width: Math.abs(width),
      height: Math.abs(height)
    };
  }

  function drawPreview() {
    const ctx = els.previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);
    if (state.image) {
      ctx.drawImage(state.image, 0, 0, els.previewCanvas.width, els.previewCanvas.height);
    }
    if (state.crop) {
      ctx.save();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(state.crop.x, state.crop.y, state.crop.width, state.crop.height);
      drawGridOverlay(ctx);
      ctx.restore();
    }
    updateCropMetrics();
  }

  function drawGridOverlay(ctx) {
    const size = getBoardSize();
    if (!state.crop || size < 1) return;
    drawBoardGrid(ctx, state.crop.x, state.crop.y, state.crop.width, state.crop.height, size, 'rgba(15, 118, 110, 0.45)', 1);
  }

  function drawBoardGrid(ctx, x, y, width, height, size, strokeStyle, lineWidth) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    for (let i = 1; i < size; i += 1) {
      const lineX = x + (width * i) / size;
      const lineY = y + (height * i) / size;
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX, y + height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY);
      ctx.stroke();
    }
  }

  function updateCropMetrics() {
    const crop = state.crop || { x: 0, y: 0, width: 0, height: 0 };
    els.cropX.textContent = Math.round(crop.x / state.imageScale);
    els.cropY.textContent = Math.round(crop.y / state.imageScale);
    els.cropW.textContent = Math.round(crop.width / state.imageScale);
    els.cropH.textContent = Math.round(crop.height / state.imageScale);
  }

  function parseCrop() {
    if (!state.image || !state.crop || state.crop.width < 8 || state.crop.height < 8) {
      setMessage(els.parseMessage, 'Load a screenshot and draw grid bounds first.', true);
      return;
    }
    const size = getBoardSize();
    const colorCount = getColorCount();
    const samples = sampleCells(size);
    const clusters = clusterColors(samples.map((sample) => sample.color), colorCount, 14);
    state.regions = samplesToRegions(samples, clusters, size);
    state.palette = clusters.centers.map((center) => rgbToHex(center));
    state.selectedRegion = 0;
    state.cropPreview = createCropPreview();
    state.solution = [];
    state.solverStats = null;
    state.manualQueens.clear();
    runIllegalGameHook();
    renderAll();
    switchTab('editor');
    setMessage(els.parseMessage, `Parsed ${size}x${size} grid into ${colorCount} regions.`);
  }

  function createCropPreview() {
    const size = getBoardSize();
    const canvas = document.createElement('canvas');
    canvas.width = 432;
    canvas.height = 432;
    const ctx = canvas.getContext('2d');
    const crop = {
      x: state.crop.x / state.imageScale,
      y: state.crop.y / state.imageScale,
      width: state.crop.width / state.imageScale,
      height: state.crop.height / state.imageScale
    };
    ctx.drawImage(state.image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    drawBoardGrid(ctx, 0, 0, canvas.width, canvas.height, size, 'rgba(17, 24, 39, 0.75)', 1);
    return canvas;
  }

  function sampleCells(size) {
    const scratch = document.createElement('canvas');
    scratch.width = state.image.width;
    scratch.height = state.image.height;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(state.image, 0, 0);
    const crop = {
      x: state.crop.x / state.imageScale,
      y: state.crop.y / state.imageScale,
      width: state.crop.width / state.imageScale,
      height: state.crop.height / state.imageScale
    };
    const samples = [];
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cellX = crop.x + (crop.width * col) / size;
        const cellY = crop.y + (crop.height * row) / size;
        const cellW = crop.width / size;
        const cellH = crop.height / size;
        samples.push({
          row,
          col,
          color: averageCellColor(ctx, cellX, cellY, cellW, cellH)
        });
      }
    }
    return samples;
  }

  function averageCellColor(ctx, x, y, width, height) {
    const marginX = width * 0.24;
    const marginY = height * 0.24;
    const sx = Math.max(0, Math.floor(x + marginX));
    const sy = Math.max(0, Math.floor(y + marginY));
    const sw = Math.max(1, Math.floor(width - marginX * 2));
    const sh = Math.max(1, Math.floor(height - marginY * 2));
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      if (data[i] < 45 && data[i + 1] < 45 && data[i + 2] < 45) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    return count ? [r / count, g / count, b / count] : [255, 255, 255];
  }

  function clusterColors(colors, count, iterations) {
    const centers = seedCenters(colors, count);
    let assignments = new Array(colors.length).fill(0);
    for (let iter = 0; iter < iterations; iter += 1) {
      assignments = colors.map((color) => nearestCenter(color, centers));
      for (let c = 0; c < centers.length; c += 1) {
        const members = colors.filter((_, index) => assignments[index] === c);
        if (members.length) centers[c] = averageColor(members);
      }
    }
    return { centers, assignments };
  }

  function seedCenters(colors, count) {
    const unique = [];
    colors.forEach((color) => {
      const key = color.map((v) => Math.round(v / 16) * 16).join(',');
      if (!unique.some((item) => item.key === key)) unique.push({ key, color });
    });
    unique.sort((a, b) => luminance(a.color) - luminance(b.color));
    const centers = [];
    for (let i = 0; i < count; i += 1) {
      const index = Math.min(unique.length - 1, Math.floor((i * unique.length) / count));
      centers.push((unique[index] || { color: colors[0] || [255, 255, 255] }).color.slice());
    }
    return centers;
  }

  function samplesToRegions(samples, clusters, size) {
    const matrix = createMatrix(size, 0);
    samples.forEach((sample, index) => {
      matrix[sample.row][sample.col] = clusters.assignments[index];
    });
    return matrix;
  }

  function nearestCenter(color, centers) {
    let best = 0;
    let bestDistance = Infinity;
    centers.forEach((center, index) => {
      const distance = colorDistance(color, center);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  }

  function colorDistance(a, b) {
    return ((a[0] - b[0]) ** 2) + ((a[1] - b[1]) ** 2) + ((a[2] - b[2]) ** 2);
  }

  function averageColor(colors) {
    const total = colors.reduce((acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]], [0, 0, 0]);
    return total.map((value) => value / colors.length);
  }

  function luminance(color) {
    return (0.2126 * color[0]) + (0.7152 * color[1]) + (0.0722 * color[2]);
  }

  function rgbToHex(color) {
    return `#${color.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
  }

  function renderAll() {
    renderPalette();
    renderEditorGrid();
    renderCropPreview();
    renderPlayGrid();
    syncGuardrailUi();
    updateJsonOutput();
  }

  function renderPalette() {
    els.palette.innerHTML = '';
    getRegionIds().forEach((regionId) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(regionId);
      button.style.background = getRegionColor(regionId);
      button.classList.toggle('active', regionId === state.selectedRegion);
      button.addEventListener('click', () => {
        state.selectedRegion = regionId;
        renderPalette();
      });
      els.palette.appendChild(button);
    });
  }

  function renderEditorGrid() {
    renderGrid(els.editorGrid, {
      onCellPointer: (row, col, cell) => {
        if (state.regions[row][col] === state.selectedRegion) return;
        state.regions[row][col] = state.selectedRegion;
        state.solution = [];
        state.solverStats = null;
        runIllegalGameHook();
        cell.style.background = getRegionColor(state.selectedRegion);
        cell.textContent = String(state.selectedRegion);
        updateJsonOutput();
      },
      onPointerEnd: () => {
        renderEditorGrid();
        renderPlayGrid();
      }
    });
  }

  function renderCropPreview() {
    if (!els.cropPreviewCanvas) return;
    const canvas = els.cropPreviewCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.cropPreview) {
      ctx.drawImage(state.cropPreview, 0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d6dde7';
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.fillStyle = '#627083';
    ctx.font = '16px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No screenshot crop', canvas.width / 2, canvas.height / 2);
  }

  function renderPlayGrid() {
    renderGrid(els.playGrid, {
      onCellPointer: (row, col) => {
        const key = cellKey(row, col);
        if (state.manualQueens.has(key)) {
          state.manualQueens.delete(key);
        } else {
          state.manualQueens.add(key);
        }
        state.solution = [];
        state.solverStats = null;
        renderPlayGrid();
      },
      playable: true
    });
  }

  function renderGrid(container, options) {
    const size = state.regions.length;
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`;
    let pointerDown = false;
    state.regions.forEach((rowValues, row) => {
      rowValues.forEach((regionId, col) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.style.background = getRegionColor(regionId);
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.classList.toggle('illegal', state.illegalHighlights.has(cellKey(row, col)));
        const solution = state.solution.find((item) => item.row === row && item.col === col);
        if (solution) {
          cell.classList.add('solution');
          cell.dataset.step = solution.step;
        } else if (options.playable && state.manualQueens.has(cellKey(row, col))) {
          cell.classList.add('queen');
        } else if (!options.playable) {
          cell.textContent = String(regionId);
        }
        cell.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          pointerDown = true;
          options.onCellPointer(row, col, cell);
          window.addEventListener('pointerup', () => {
            if (!pointerDown) return;
            pointerDown = false;
            if (options.onPointerEnd) options.onPointerEnd();
          }, { once: true });
        });
        cell.addEventListener('pointerenter', () => {
          if (pointerDown && !options.playable) options.onCellPointer(row, col, cell);
        });
        cell.addEventListener('pointerup', () => {
          pointerDown = false;
          if (options.onPointerEnd) options.onPointerEnd();
        });
        container.appendChild(cell);
      });
    });
  }

  function updateJsonOutput() {
    els.jsonOutput.value = JSON.stringify(state.regions, null, 2);
  }

  function exportJson() {
    updateJsonOutput();
    navigator.clipboard?.writeText(els.jsonOutput.value);
    setMessage(els.editorMessage, 'JSON exported to the text area and copied when clipboard access is available.');
  }

  function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      const parsed = JSON.parse(text);
      const regions = Array.isArray(parsed) ? parsed : parsed.regions;
      validateMatrix(regions);
      state.regions = regions;
      els.boardSize.value = String(regions.length);
      syncPaletteToSize();
      state.solution = [];
      state.solverStats = null;
      state.manualQueens.clear();
      runIllegalGameHook();
      renderAll();
      setMessage(els.editorMessage, 'Imported JSON matrix.');
    }).catch((error) => {
      setMessage(els.editorMessage, error.message, true);
    });
  }

  async function solveWithPyodide() {
    try {
      if (state.hasIllegalGame) {
        setMessage(els.solverMessage, state.illegalMessage || 'Fix highlighted cells before solving.', true);
        return;
      }
      setMessage(els.solverMessage, 'Loading Pyodide and solver...');
      setStatus('Loading solver');
      const pyodide = await getPyodide();
      pyodide.globals.set('regions_json', JSON.stringify(state.regions));
      const resultJson = pyodide.runPython(`
import json
from queens import solve_regions_with_stats
json.dumps(solve_regions_with_stats(json.loads(regions_json)))
`);
      const result = JSON.parse(resultJson);
      state.solution = result.solution || [];
      state.solverStats = result.stats || null;
      state.manualQueens.clear();
      renderPlayGrid();
      setMessage(els.solverMessage, formatSolverMessage(state.solution, state.solverStats));
      setStatus('Ready');
    } catch (error) {
      setMessage(els.solverMessage, error.message, true);
      setStatus('Solver error');
    }
  }

  function formatSolverMessage(solution, stats) {
    if (!stats) {
      return solution.length ? `Solved with ${solution.length} queens.` : 'No solution found.';
    }
    const solvedText = stats.solved ? `Solved with ${solution.length} queens.` : 'No solution found.';
    return `${solvedText} CPU: ${formatCpuTime(stats.cpu_seconds)}. Steps: ${stats.steps}. Backtracks: ${stats.backtracks}.`;
  }

  function formatCpuTime(cpuSeconds) {
    if (!Number.isFinite(cpuSeconds)) return 'n/a';
    if (cpuSeconds < 1) return `${(cpuSeconds * 1000).toFixed(2)} ms`;
    return `${cpuSeconds.toFixed(3)} s`;
  }

  async function getPyodide() {
    if (state.pyodide) return state.pyodide;
    if (typeof loadPyodide !== 'function') {
      throw new Error('Pyodide failed to load from the CDN.');
    }
    const pyodide = await loadPyodide();
    const solverSource = await fetchSolverSource();
    pyodide.FS.writeFile('/home/pyodide/queens.py', solverSource);
    state.pyodide = pyodide;
    return pyodide;
  }

  async function fetchSolverSource() {
    const candidates = ['/queens.py', '../../queens.py', './queens.py'];
    for (const path of candidates) {
      try {
        const response = await fetch(path);
        if (response.ok) return await response.text();
      } catch (_) {
        // Try the next path.
      }
    }
    throw new Error('Could not load queens.py. Serve the repository root over HTTP and open /tools/level_editor/.');
  }

  function syncPaletteToSize() {
    const count = getColorCount();
    state.palette = Array.from({ length: count }, (_, index) => state.palette[index] || paletteColors[index % paletteColors.length]);
    if (state.selectedRegion >= count) state.selectedRegion = 0;
    renderPalette();
  }

  function runIllegalGameHook() {
    const result = state.illegalGameHandler(state.regions);
    state.illegalHighlights = result.highlights || new Set();
    state.hasIllegalGame = Boolean(result.invalid);
    state.illegalMessage = result.message || '';
    syncGuardrailUi();
  }

  function syncGuardrailUi() {
    if (!els.editorMessage) return;
    setMessage(els.editorMessage, state.illegalMessage || '', state.hasIllegalGame);
    if (els.sendPlayButton) els.sendPlayButton.disabled = state.hasIllegalGame;
    if (els.solveButton) els.solveButton.disabled = state.hasIllegalGame;
    if (state.hasIllegalGame && els.solverMessage) {
      setMessage(els.solverMessage, state.illegalMessage, true);
    }
  }

  function defaultIllegalGameHandler(regions) {
    return validateRegionConnectivity(regions);
  }

  function validateRegionConnectivity(regions) {
    const regionCells = new Map();
    regions.forEach((rowValues, row) => {
      rowValues.forEach((regionId, col) => {
        if (!regionCells.has(regionId)) regionCells.set(regionId, []);
        regionCells.get(regionId).push({ row, col });
      });
    });

    const highlights = new Set();
    const disconnectedRegions = [];
    regionCells.forEach((cells, regionId) => {
      const components = connectedComponents(cells, regions);
      if (components.length <= 1) return;
      disconnectedRegions.push(regionId);
      components
        .slice(1)
        .flat()
        .forEach((cell) => highlights.add(cellKey(cell.row, cell.col)));
    });

    disconnectedRegions.sort((a, b) => a - b);
    if (!disconnectedRegions.length) {
      return { invalid: false, highlights, message: '' };
    }
    return {
      invalid: true,
      highlights,
      message: `Disconnected regions: ${disconnectedRegions.join(', ')}. Fix highlighted cells before solving.`
    };
  }

  function connectedComponents(cells, regions) {
    const targetRegion = regions[cells[0].row][cells[0].col];
    const remaining = new Set(cells.map((cell) => cellKey(cell.row, cell.col)));
    const components = [];

    while (remaining.size) {
      const [startKey] = remaining;
      const [startRow, startCol] = startKey.split(',').map(Number);
      const stack = [{ row: startRow, col: startCol }];
      const component = [];
      remaining.delete(startKey);

      while (stack.length) {
        const cell = stack.pop();
        component.push(cell);
        neighbors4(cell.row, cell.col, regions.length).forEach((next) => {
          const key = cellKey(next.row, next.col);
          if (!remaining.has(key)) return;
          if (regions[next.row][next.col] !== targetRegion) return;
          remaining.delete(key);
          stack.push(next);
        });
      }
      components.push(component);
    }

    components.sort((a, b) => b.length - a.length);
    return components;
  }

  function neighbors4(row, col, size) {
    return [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 }
    ].filter((cell) => cell.row >= 0 && cell.col >= 0 && cell.row < size && cell.col < size);
  }

  function getRegionIds() {
    const maxFromMatrix = Math.max(0, ...state.regions.flat());
    const maxFromPalette = Math.max(0, state.palette.length - 1);
    return Array.from({ length: Math.max(maxFromMatrix, maxFromPalette) + 1 }, (_, index) => index);
  }

  function getRegionColor(regionId) {
    return state.palette[regionId] || paletteColors[regionId % paletteColors.length];
  }

  function getBoardSize() {
    return Math.max(2, Math.min(16, Number.parseInt(els.boardSize.value, 10) || 8));
  }

  function getColorCount() {
    return Math.max(1, Math.min(32, Number.parseInt(els.colorCount.value, 10) || getBoardSize()));
  }

  function createMatrix(size, value) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
  }

  function validateMatrix(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) throw new Error('JSON must be a non-empty matrix.');
    matrix.forEach((row) => {
      if (!Array.isArray(row) || row.length !== matrix.length) throw new Error('JSON matrix must be square.');
      row.forEach((value) => {
        if (!Number.isInteger(value) || value < 0) throw new Error('Region ids must be non-negative integers.');
      });
    });
  }

  function cellKey(row, col) {
    return `${row},${col}`;
  }

  function setMessage(element, text, isError) {
    element.textContent = text || '';
    element.classList.toggle('error', Boolean(isError));
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

  window.QueensLevelEditor = {
    state,
    createMatrix,
    validateMatrix,
    clusterColors,
    formatSolverMessage,
    validateRegionConnectivity,
    defaultIllegalGameHandler
  };
}());

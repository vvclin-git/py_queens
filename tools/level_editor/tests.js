(function () {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push(`PASS ${name}`);
    } catch (error) {
      results.push(`FAIL ${name}: ${error.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const api = window.QueensLevelEditor;

    test('plain matrix validates', () => {
      api.validateMatrix([[0, 1], [1, 0]]);
    });

    test('non-square matrix fails validation', () => {
      let failed = false;
      try {
        api.validateMatrix([[0, 1, 2], [1, 0]]);
      } catch (_) {
        failed = true;
      }
      assert(failed, 'expected validation failure');
    });

    test('cluster colors separates two obvious colors', () => {
      const clusters = api.clusterColors([[250, 20, 20], [245, 25, 25], [20, 20, 250], [25, 25, 245]], 2, 8);
      assert(new Set(clusters.assignments).size === 2, 'expected two clusters');
    });

    test('illegal game handler hook returns empty highlights', () => {
      const result = api.defaultIllegalGameHandler([[0]]);
      assert(result.highlights instanceof Set, 'expected highlight Set');
      assert(result.invalid === false, 'expected valid result');
    });

    test('connectivity guardrail accepts connected regions', () => {
      const result = api.validateRegionConnectivity([
        [0, 0, 1],
        [2, 0, 1],
        [2, 2, 1]
      ]);
      assert(result.invalid === false, 'expected connected regions to pass');
      assert(result.highlights.size === 0, 'expected no highlights');
    });

    test('connectivity guardrail highlights smaller disconnected component', () => {
      const result = api.validateRegionConnectivity([
        [0, 0, 1],
        [0, 1, 1],
        [2, 2, 0]
      ]);
      assert(result.invalid === true, 'expected disconnected region');
      assert(result.message.includes('0'), 'expected region 0 in warning');
      assert(result.highlights.has('2,2'), 'expected isolated cell highlight');
      assert(!result.highlights.has('0,0'), 'expected largest component to stay unmarked');
    });

    test('connectivity guardrail reports multiple disconnected regions', () => {
      const result = api.validateRegionConnectivity([
        [0, 1, 2],
        [1, 1, 2],
        [0, 2, 1]
      ]);
      assert(result.invalid === true, 'expected disconnected regions');
      assert(result.message.includes('0'), 'expected region 0 in warning');
      assert(result.message.includes('1'), 'expected region 1 in warning');
      assert(result.message.includes('2'), 'expected region 2 in warning');
    });

    test('solver diagnostics message includes stats', () => {
      const message = api.formatSolverMessage([{ row: 0, col: 0, step: 1 }], {
        cpu_seconds: 0.0123,
        steps: 42,
        backtracks: 7,
        solved: true
      });
      assert(message.includes('CPU:'), 'expected CPU timing');
      assert(message.includes('Steps: 42'), 'expected step count');
      assert(message.includes('Backtracks: 7'), 'expected backtrack count');
    });

    document.getElementById('results').textContent = results.join('\n');
  });
}());

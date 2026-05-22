import json
from pathlib import Path

import pytest

from queens import solve_regions, solve_regions_with_stats, validate_regions


ROOT = Path(__file__).resolve().parents[1]


def load_game(name):
    with (ROOT / 'games' / name).open(encoding='utf-8') as file:
        return json.load(file)


def assert_valid_solution(regions, solution):
    size = len(regions)
    assert len(solution) == size
    rows = {item['row'] for item in solution}
    cols = {item['col'] for item in solution}
    groups = {regions[item['row']][item['col']] for item in solution}
    assert rows == set(range(size))
    assert cols == set(range(size))
    assert len(groups) == size

    occupied = {(item['row'], item['col']) for item in solution}
    for row, col in occupied:
        for dy in (-1, 1):
            for dx in (-1, 1):
                assert (row + dy, col + dx) not in occupied


@pytest.mark.parametrize('fixture_name', ['test_board.json', 'queens_board.json', 'queens_559.json'])
def test_solve_regions_returns_valid_solution_for_existing_fixtures(fixture_name):
    regions = load_game(fixture_name)
    solution = solve_regions(regions)
    assert_valid_solution(regions, solution)
    assert [item['step'] for item in solution] == list(range(1, len(solution) + 1))

def test_validate_regions_rejects_non_square_matrix():
    with pytest.raises(ValueError):
        validate_regions([[0, 1, 2], [0, 1]])


def test_solve_regions_with_stats_returns_solution_and_diagnostics():
    regions = load_game('test_board.json')
    result = solve_regions_with_stats(regions)
    assert set(result) == {'solution', 'stats'}
    assert_valid_solution(regions, result['solution'])

    stats = result['stats']
    assert isinstance(stats['cpu_seconds'], float)
    assert stats['cpu_seconds'] >= 0
    assert isinstance(stats['steps'], int)
    assert stats['steps'] > 0
    assert isinstance(stats['backtracks'], int)
    assert stats['backtracks'] >= 0
    assert stats['solved'] is True

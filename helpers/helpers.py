  
def print_color_table(values, color_groups, width=3):
    """Print values[][] using evenly spaced xterm-256 colors by group."""
    # Collect unique group IDs in first-appearance order
    order = []
    seen = set()
    for row in color_groups:
        for g in row:
            if g not in seen:
                seen.add(g)
                order.append(g)

    # Assign evenly spaced indices: 0 .. 255
    n = len(order)
    step = 255 / (n - 1) if n > 1 else 255
    gid_to_idx = {order[i]: round(i * step) for i in range(n)}

    # Print
    for r in range(len(values)):
        parts = []
        for c in range(len(values[r])):
            col = gid_to_idx[color_groups[r][c]]
            parts.append(f"\033[38;5;{col}m{values[r][c]:>{width}}\033[0m")
        print(" ".join(parts))


if __name__=='__main__':

    # Example
    vals = [
        [5, 8, 2, 4],
        [9, 3, 7, 0],
        [6, 5, 1, 9],
    ]

    groups = [
        [0, 1, 2, 3],
        [0, 1, 2, 3],
        [0, 1, 2, 3],
    ]

    print_color_table(vals, groups, width=3)

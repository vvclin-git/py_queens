def init_board_plot(board):
    from matplotlib.colors import ListedColormap
    import matplotlib.pyplot as plt

    cmap_base = plt.get_cmap('gist_rainbow')
    n_color = cmap_base.N
    color_indices = [(n_color / board.num_groups) * value for value in range(1, board.num_groups + 1)]
    colors = [cmap_base(int(index) % n_color) for index in color_indices]
    custom_cmap = ListedColormap(colors)

    fig, ax = plt.subplots()
    plt.close(fig)
    ax.pcolor(board.group_map, cmap=custom_cmap, edgecolors='k', linewidths=1)
    ax.set_axis_off()
    ax.invert_yaxis()
    ax.set_aspect('equal')
    return ax


def draw_board(board, cell_output=True):
    ax = init_board_plot(board)
    for row in range(board.shape[0]):
        for col in range(board.shape[1]):
            cell = board.grid[row][col]
            if cell.value == 6:
                ax.plot(
                    col + 0.5,
                    row + 0.5,
                    marker='o',
                    markersize=12,
                    markeredgecolor='black',
                    markerfacecolor='yellow',
                )
            elif 0 < cell.value < 6:
                ax.plot(
                    col + 0.5,
                    row + 0.5,
                    marker='x',
                    markersize=12,
                    markeredgecolor='black',
                    markerfacecolor='black',
                )
    if cell_output:
        from IPython.display import clear_output, display

        clear_output(wait=True)
        display(ax.figure)
    return ax

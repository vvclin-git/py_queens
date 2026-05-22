
import time
import json
import copy


class Cell:
    def __init__(self, group, pos):
        self.value = 0 # 0: empty, 1: placed, 2: occupied
        self.group = group
        self.pos = pos
    def __repr__(self):
        return f'pos:{self.pos}, group:{self.group}, value:{self.value}'

class Node:
    def __init__(self, board, move=None, prev_node=None):
        self.prev_node = None
        self.next_nodes = []        
        self.board = board
        self.move = move
        pass
      

class Board:
    def __init__(self, group_map, value=None):
        self.group_map = group_map  
        self.num_groups = max(max(row) for row in self.group_map) + 1  # maximum value in loaded_board                          
        self.shape = (len(self.group_map), len(self.group_map[0]))
        self.grid = [[Cell(self.group_map[i][j], (j + 1, i + 1)) for j in range(self.shape[1])] for i in range(self.shape[0])]
        if value:
            for i in range(self.shape[0]):
                for j in range(self.shape[1]):
                    self.grid[i][j].value = value[i][j]
                    
        self.placed_cells = []
        self.placed_groups = []
        self.groups = [[] for i in range(self.num_groups)]
        self.occupied_groups = [[] for i in range(self.num_groups)]
        self.occupied_group_num = 0
        for i in range(self.num_groups):
            self.groups[i] = []
        # print(self.groups)
        # print(len(self.groups))
        for i in range(self.shape[0]):
            for j in range(self.shape[1]):
                # try:
                self.groups[self.grid[i][j].group].append(self.grid[i][j])
                
                # except:
                #     print(i, j, self.grid[i][j].group)
        
        return
    
    def check(self):
        return self.occupied_group_num != self.num_groups
            
    def undo_last(self):
        if len(self.placed_cells) > 0:
            last_pos = self.placed_cells[-1].pos
            self.remove(last_pos)
        return

    def in_board(self, pos_in, internal=False):
        if not internal:
            pos = (pos_in[1] - 1, pos_in[0] - 1)        
        else:
            pos = pos_in
        return (pos[0] >= 0  and pos[0] < self.shape[1]) and (pos[1] >= 0 and pos[1] < self.shape[0])

    def place(self, pos_in):
        pos = (pos_in[1] - 1, pos_in[0] - 1)
        if (self.in_board(pos_in)) and (self.grid[pos[0]][pos[1]].value == 0):                     
            occupied_cells = []
            # neighborhood occupation
            for shift_x in (-1, 1):
                for shift_y in (-1, 1):
                    pos_shift = (pos[0] + shift_y, pos[1] + shift_x)                    
                    if (self.in_board(pos_shift, internal=True)):
                        if self.grid[pos_shift[0]][pos_shift[1]].group != self.grid[pos[0]][pos[1]].group:
                            self.grid[pos_shift[0]][pos_shift[1]].value += 1
                        occupied_cells.append(self.grid[pos_shift[0]][pos_shift[1]])
            # line occupation
            # horizontal
            for c in self.grid[pos[0]]:
                if c.group != self.grid[pos[0]][pos[1]].group:
                    c.value += 1
                occupied_cells.append(c)
            # vertical
            for r in self.grid:
                if r[pos[1]].group != self.grid[pos[0]][pos[1]].group:
                    r[pos[1]].value += 1                
                occupied_cells.append(r[pos[1]])
            # cell placement
            self.grid[pos[0]][pos[1]].value = 5            
            self.placed_cells.append(self.grid[pos[0]][pos[1]])
            self.placed_groups.append(self.grid[pos[0]][pos[1]].group)
            occupied_cells.append(self.grid[pos[0]][pos[1]])
            # group update            
            # self.groups[self.grid[pos[0]][pos[1]].group].remove(self.grid[pos[0]][pos[1]])
            # group occupation
            for c in self.groups[self.grid[pos[0]][pos[1]].group]:                
                c.value += 1
                occupied_cells.append(c)                
            
            for c in self.occupied_groups[self.grid[pos[0]][pos[1]].group]:                
                c.value += 1                                
                      
            for c in occupied_cells:
                if c in self.groups[c.group]:
                    self.groups[c.group].remove(c)
                if c not in self.occupied_groups[c.group]:
                    self.occupied_groups[c.group].append(c)                    
            
            self.occupied_group_num += 1

        pass

    def remove(self, pos_in):
        pos = (pos_in[1] - 1, pos_in[0] - 1)
        if (self.in_board(pos_in)) and (self.grid[pos[0]][pos[1]].value == 6):
            released_cells = []
            # remove group occupation
            for c in self.occupied_groups[self.grid[pos[0]][pos[1]].group]:                
                c.value -= 1
                if c.value == 0:
                    released_cells.append(c)
            # remove neighborhood occupation
            for shift_x in (-1, 1):
                for shift_y in (-1, 1):
                    pos_shift = (pos[0] + shift_y, pos[1] + shift_x)                    
                    if (self.in_board(pos_shift, internal=True)):
                        if self.grid[pos_shift[0]][pos_shift[1]].group != self.grid[pos[0]][pos[1]].group:
                            self.grid[pos_shift[0]][pos_shift[1]].value -= 1
                            if self.grid[pos_shift[0]][pos_shift[1]].value == 0:
                                released_cells.append(self.grid[pos_shift[0]][pos_shift[1]])
            # line occupation
            # horizontal
            for c in self.grid[pos[0]]:
                if c.group != self.grid[pos[0]][pos[1]].group:
                    c.value -= 1
                    if c.value == 0:
                        released_cells.append(c)
            # vertical
            for r in self.grid:
                if r[pos[1]].group != self.grid[pos[0]][pos[1]].group:
                    r[pos[1]].value -= 1
                    if r[pos[1]].value == 0:
                        released_cells.append(r[pos[1]])
            # cell placement
            self.grid[pos[0]][pos[1]].value -= 5            
            self.placed_cells.remove(self.grid[pos[0]][pos[1]])
            self.placed_groups.remove(self.grid[pos[0]][pos[1]].group)            
            released_cells.append(self.grid[pos[0]][pos[1]])
            # group update            
            self.groups[self.grid[pos[0]][pos[1]].group].append(self.grid[pos[0]][pos[1]])
            for c in released_cells:
                if c not in self.groups[c.group]:
                    self.groups[c.group].append(c)
                if c in self.occupied_groups[c.group]:
                    self.occupied_groups[c.group].remove(c)
            self.occupied_group_num -= 1
        pass

    def update(self):
        
        pass
    
    def get_next_moves(self):
        group_ind = list(range(len(self.groups)))
        group_ind.sort(key=lambda x: len(self.groups[x]))
        next_moves = []
        for i in group_ind:
            if len(self.groups[i]) > 0:
                for c in self.groups[i]:
                    # pos = (c.pos[1] - 1, c.pos[0] - 1)
                    next_moves.append(c.pos)
        return next_moves

    def check_occupied_group(self):        
        for i, g in enumerate(self.groups):
            if len(g) == 0 and (i not in self.placed_groups):
                return True
        return False

    def dump(self, filename=None):
        output = [[0 for j in range(self.shape[1])] for i in range(self.shape[0])]
        for i, r in enumerate(self.grid):            
            for j, c in enumerate(r):
                output[i][j] = c.value
        if filename:
            with open(filename, 'w') as f:
                json.dump(output, f)
        return output
        

class Game:
    def __init__(self, board, verbose=True, draw_callback=None):
        self.board = board
        self.verbose = verbose
        self.draw_callback = draw_callback
        self.steps = 0
        self.backtracks = 0
        self.time_start = 0
        
    
    def place(self, pos_in):
        from helpers import print_color_table

        pos = (pos_in[1] - 1, pos_in[0] - 1)
        if self.board.grid[pos[0]][pos[1]].value == 0:
            self.board.place(pos_in)
            if self.draw_callback:
                self.draw_callback(self.board)
            print_color_table(self.board.dump(), self.board.group_map)
            # print(f'place on {pos_in}')
            # print(f'number of groups occupied: {self.board.occupied_group_num} / {self.board.num_groups}')
            # for g in self.board.groups:
            #     print(g)
            # if not self.board.check():
            #     print('you won!') 
        else:
            self.board.remove(pos_in)
            if self.draw_callback:
                self.draw_callback(self.board)
            print_color_table(self.board.dump(), self.board.group_map)
            # print(f'remove on {pos_in}')
            # print(f'number of groups occupied: {self.board.occupied_group_num} / {self.board.num_groups}')
            # for g in self.board.groups:
            #     print(g)     
    
    def play(self, node=None, max_step=None):
        if max_step:
            if self.steps > max_step:
                return
        self.steps += 1        
        if not node:
            self.time_start=time.time()
            next_moves = self.board.get_next_moves()
            for m in next_moves:
                result = self.play(Node(self.board, m), max_step)
                if result:
                    return result
                self.backtracks += 1
                self.board.undo_last()
        else:            
            # timestr = time.strftime("%Y%m%d-%H-%M-%S")
            node.board.place(node.move)
            # node.board.dump(f'.\\dump\\steps_{self.steps}_dump.json')
            next_moves = node.board.get_next_moves()
            if self.verbose:
                print(f'step {self.steps}: place at {node.move}, next move number: {len(next_moves)}')
            if len(next_moves) > 0 and (not self.board.check_occupied_group()):
                for m in next_moves:
                    result = None
                    next_node = Node(node.board, m)
                    next_node.prev_node = node
                    result = self.play(next_node, max_step)
                    if result:
                        return result
                    self.backtracks += 1
                    node.board.undo_last()
            else:
                if self.board.check_occupied_group():
                    if self.verbose:
                        print('game stuck, reverting the board (a group was occupied before placement)')
                    return
                
                if node.board.check():
                    if self.verbose:
                        print('game stuck, reverting the board (no available moves)')
                    # node.board.undo_last()
                    # node.board.dump(f'.\\dump\\steps_{self.steps}_dump_stuck.json')
                    # node.board.dump(f'.\\dump\\after_dump_{timestr}.json')
                    return
                else:
                    if self.verbose:
                        print(f'game finished after {self.steps} steps')
                        time_passed=round(time.time() - self.time_start, 8)
                        print(f'Time elapsed: {time_passed} secs')
                    return node.board.placed_cells

        pass    


def validate_regions(regions):
    if not isinstance(regions, list) or len(regions) == 0:
        raise ValueError('regions must be a non-empty 2D list')
    size = len(regions)
    for row in regions:
        if not isinstance(row, list) or len(row) != size:
            raise ValueError('regions must be a square 2D list')
        for value in row:
            if not isinstance(value, int) or value < 0:
                raise ValueError('region ids must be non-negative integers')


def solve_regions(regions):
    """Solve a region matrix and return queen cells as row/col/step dicts."""
    return solve_regions_with_stats(regions)['solution']


def solve_regions_with_stats(regions):
    """Solve a region matrix and include search diagnostics."""
    validate_regions(regions)
    board = Board(copy.deepcopy(regions))
    game = Game(board, verbose=False)
    time_start = time.process_time()
    result = game.play()
    cpu_seconds = time.process_time() - time_start
    solution = []
    if result:
        solution = [
        {'row': cell.pos[1] - 1, 'col': cell.pos[0] - 1, 'step': index + 1}
        for index, cell in enumerate(result)
        ]
    return {
        'solution': solution,
        'stats': {
            'cpu_seconds': cpu_seconds,
            'steps': game.steps,
            'backtracks': game.backtracks,
            'solved': bool(solution),
        },
    }

if __name__=='__main__':
    import json
    from pathlib import Path
    
    with (Path(__file__).resolve().parent / 'games' / 'test_board.json').open() as f:
        loaded_board = json.load(f)
    board = Board(loaded_board)
    
    from helpers import draw_board, print_color_table
    draw_board(board)
    print_color_table(board.dump(), board.group_map) 
    
    
    pass

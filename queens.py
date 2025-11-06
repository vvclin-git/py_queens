

from matplotlib.colors import ListedColormap
import matplotlib.pyplot as plt
from IPython.display import clear_output, display



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
    def __init__(self, group_map):
        self.group_map = group_map  
        self.num_groups = max(max(row) for row in self.group_map) + 1  # maximum value in loaded_board                          
        self.shape = (len(self.group_map), len(self.group_map[0]))
        self.grid = [[Cell(self.group_map[i][j], (j + 1, i + 1)) for j in range(self.shape[1])] for i in range(self.shape[0])]
        self.placed_cells = []
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
        
        cmap_base = plt.get_cmap('gist_rainbow')
        n_color = cmap_base.N
        # Generate color indices for each value from 1 to N
        color_indices = [(n_color / self.num_groups) * v for v in range(1, self.num_groups + 1)]
        colors = [cmap_base(int(idx) % n_color) for idx in color_indices]
        self.custom_cmap = ListedColormap(colors)

        self.init_draw()
        
        return
   
    
    def init_draw(self):
        
        fig, ax = plt.subplots()
        plt.close(fig)
        ax.pcolor(self.group_map, cmap=self.custom_cmap, edgecolors='k', linewidths=1)
        ax.set_axis_off()
        ax.invert_yaxis()
        ax.set_aspect('equal')
        self.ax = ax        
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

    def draw(self):
        # plt.clf()
        clear_output(wait=True)
        self.init_draw()
        for i in range(self.shape[0]):
            for j in range(self.shape[1]):
                if self.grid[i][j].value == 6:                    
                    self.ax.plot(j + 0.5, i + 0.5, marker='o', markersize=12, markeredgecolor='black', markerfacecolor='yellow')
                elif self.grid[i][j].value > 0 and self.grid[i][j].value < 6:
                    self.ax.plot(j + 0.5, i + 0.5, marker='x', markersize=12, markeredgecolor='black', markerfacecolor='black')
         
        display(self.ax.figure)
        pass

    def dump(self):
        output = [[0 for j in range(self.shape[1])] for i in range(self.shape[0])]
        for i, r in enumerate(self.grid):            
            for j, c in enumerate(r):
                output[i][j] = c.value
        return output
        

class Game:
    def __init__(self, board):
        self.board = board
        
    
    def place(self, pos_in):
        pos = (pos_in[1] - 1, pos_in[0] - 1)
        if self.board.grid[pos[0]][pos[1]].value == 0:
            self.board.place(pos_in)
            self.board.draw()
            display(self.board.dump())
            # print(f'place on {pos_in}')
            # print(f'number of groups occupied: {self.board.occupied_group_num} / {self.board.num_groups}')
            # for g in self.board.groups:
            #     print(g)
            # if not self.board.check():
            #     print('you won!') 
        else:
            self.board.remove(pos_in)
            self.board.draw()
            display(self.board.dump())
            # print(f'remove on {pos_in}')
            # print(f'number of groups occupied: {self.board.occupied_group_num} / {self.board.num_groups}')
            # for g in self.board.groups:
            #     print(g)     
    
    def play(self, node=None):        
        if not node:
            next_moves = self.board.get_next_moves()
            for m in next_moves:                
                result = self.play(Node(self.board, m))
                if result:
                    return result
                self.board.undo_last()
        else:            
            node.board.place(node.move)
            next_moves = node.board.get_next_moves()
            print(f'place at {node.move}, next move number: {len(next_moves)}')
            if len(next_moves) > 0:
                for m in next_moves:
                    result = None
                    next_node = Node(node.board, m)
                    next_node.prev_node = node
                    result = self.play(next_node)
                    if result:
                        return result
                    node.board.undo_last()
            else:
                if node.board.check():
                    print('game stuck, reverting the board')
                    node.board.undo_last()
                    return
                else:
                    print('game finished')
                    return node.board.placed_cells

        pass    
    
    

if __name__=='__main__':
    import json
    
    with open('test_board.json', 'r') as f:
        loaded_board = json.load(f)
    board = Board(loaded_board)
    
    from helpers import print_color_table
    print_color_table(board.dump(), board.group_map) 
    
    
    pass
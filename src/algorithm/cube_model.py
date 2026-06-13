"""
Rubik's Cube State Model
三阶魔方状态模型 - 使用54个面的状态表示法

状态编码：
- 每个面用9个字符表示（3x3）
- 颜色：W(白), Y(黄), R(红), O(橙), B(蓝), G(绿)
- 面顺序：U(上), R(右), F(前), D(下), L(左), B(后)
"""

import numpy as np
from typing import List, Tuple, Dict, Optional
from enum import Enum


class Color(Enum):
    """魔方颜色枚举"""
    WHITE = 'W'   # 上
    YELLOW = 'Y'  # 下
    RED = 'R'     # 右
    ORANGE = 'O'  # 左
    BLUE = 'B'    # 前
    GREEN = 'G'   # 后


class Face(Enum):
    """魔方面枚举"""
    UP = 0
    RIGHT = 1
    FRONT = 2
    DOWN = 3
    LEFT = 4
    BACK = 5


# 标准颜色映射
STANDARD_COLORS = {
    Face.UP: Color.WHITE,
    Face.RIGHT: Color.RED,
    Face.FRONT: Color.BLUE,
    Face.DOWN: Color.YELLOW,
    Face.LEFT: Color.ORANGE,
    Face.BACK: Color.GREEN
}

# 移动定义：U, D, L, R, F, B 及其逆时针和180度版本
MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2',
         'L', "L'", 'L2', 'R', "R'", 'R2',
         'F', "F'", 'F2', 'B', "B'", 'B2']


class RubikCube:
    """三阶魔方状态类"""
    
    def __init__(self, state: str = None):
        """
        初始化魔方
        
        Args:
            state: 54字符的状态字符串，顺序为 U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
                   如果为None，则初始化为已还原状态
        """
        if state:
            if len(state) != 54:
                raise ValueError("状态字符串长度必须为54")
            self.state = list(state.upper())
        else:
            self.state = self._solved_state()
        
        # 面索引映射
        self.face_indices = {
            Face.UP: list(range(0, 9)),
            Face.RIGHT: list(range(9, 18)),
            Face.FRONT: list(range(18, 27)),
            Face.DOWN: list(range(27, 36)),
            Face.LEFT: list(range(36, 45)),
            Face.BACK: list(range(45, 54))
        }
        
        # 旋转映射表（每次旋转涉及的面片索引）
        self._rotation_maps = self._build_rotation_maps()
    
    def _solved_state(self) -> List[str]:
        """返回已还原状态"""
        state = []
        for face in Face:
            color = STANDARD_COLORS[face]
            state.extend([color.value] * 9)
        return state
    
    def _build_rotation_maps(self) -> Dict[str, List[Tuple[int, int]]]:
        """构建旋转映射表"""
        maps = {}
        
        # U面顺时针旋转
        maps['U'] = [
            # U面自身旋转
            (0, 2), (1, 5), (2, 8), (3, 1), (5, 7), (6, 0), (7, 3), (8, 6),
            # 侧面受影响的块
            (9, 18), (10, 19), (11, 20),   # R -> F
            (18, 36), (19, 37), (20, 38),  # F -> L
            (36, 45), (37, 46), (38, 47),  # L -> B
            (45, 9), (46, 10), (47, 11),   # B -> R
        ]
        
        # D面顺时针旋转
        maps['D'] = [
            (27, 33), (28, 30), (29, 27), (30, 34), (32, 28), (33, 35), (34, 31), (35, 29),
            (15, 51), (16, 52), (17, 53),  # R -> B
            (24, 15), (25, 16), (26, 17),  # F -> R
            (42, 24), (43, 25), (44, 26),  # L -> F
            (51, 42), (52, 43), (53, 44),  # B -> L
        ]
        
        # R面顺时针旋转
        maps['R'] = [
            (9, 15), (10, 12), (11, 9), (12, 16), (14, 10), (15, 17), (16, 13), (17, 11),
            (2, 20), (5, 23), (8, 26),    # U -> F
            (20, 29), (23, 32), (26, 35),  # F -> D
            (29, 51), (32, 48), (35, 45),  # D -> B (反转)
            (45, 8), (48, 5), (51, 2),     # B -> U (反转)
        ]
        
        # L面顺时针旋转
        maps['L'] = [
            (36, 42), (37, 39), (38, 36), (39, 43), (41, 37), (42, 44), (43, 41), (44, 38),
            (0, 47), (3, 50), (6, 53),    # U -> B (反转)
            (18, 0), (21, 3), (24, 6),     # F -> U
            (27, 18), (30, 21), (33, 24),  # D -> F
            (47, 27), (50, 30), (53, 33),  # B -> D (反转)
        ]
        
        # F面顺时针旋转
        maps['F'] = [
            (18, 24), (19, 21), (20, 18), (21, 25), (23, 19), (24, 26), (25, 23), (26, 20),
            (6, 15), (7, 12), (8, 9),     # U -> R (反转)
            (9, 29), (12, 28), (15, 27),   # R -> D
            (27, 44), (28, 41), (29, 38),  # D -> L (反转)
            (38, 6), (41, 7), (44, 8),     # L -> U
        ]
        
        # B面顺时针旋转
        maps['B'] = [
            (45, 51), (46, 48), (47, 45), (48, 52), (50, 46), (51, 53), (52, 50), (53, 47),
            (0, 38), (1, 41), (2, 44),    # U -> L
            (36, 29), (39, 32), (42, 35),  # L -> D (反转)
            (35, 2), (32, 1), (29, 0),     # D -> R (反转)
            (2, 36), (1, 39), (0, 42),     # R -> U
        ]
        
        return maps
    
    def get_face(self, face: Face) -> List[str]:
        """获取指定面的状态"""
        return [self.state[i] for i in self.face_indices[face]]
    
    def get_face_matrix(self, face: Face) -> np.ndarray:
        """获取指定面的3x3矩阵"""
        face_data = self.get_face(face)
        return np.array(face_data).reshape(3, 3)
    
    def is_solved(self) -> bool:
        """检查是否已还原"""
        for face in Face:
            face_state = self.get_face(face)
            if len(set(face_state)) != 1:
                return False
        return True
    
    def copy(self) -> 'RubikCube':
        """复制魔方状态"""
        return RubikCube(''.join(self.state))
    
    def apply_move(self, move: str) -> 'RubikCube':
        """
        应用单个移动
        
        Args:
            move: 移动字符串，如 'U', "U'", 'U2'
        
        Returns:
            新的魔方状态
        """
        new_cube = self.copy()
        
        if move not in MOVES:
            raise ValueError(f"无效的移动: {move}")
        
        # 解析移动
        face = move[0]
        is_prime = "'" in move
        is_double = "2" in move
        
        # 获取旋转映射
        rotation_map = self._rotation_maps[face]
        
        # 应用旋转
        if is_double:
            # 180度 = 两次顺时针
            new_cube = self._apply_rotation(new_cube, rotation_map)
            new_cube = new_cube._apply_rotation(new_cube, rotation_map)
        elif is_prime:
            # 逆时针 = 三次顺时针
            new_cube = self._apply_rotation(new_cube, rotation_map)
            new_cube = new_cube._apply_rotation(new_cube, rotation_map)
            new_cube = new_cube._apply_rotation(new_cube, rotation_map)
        else:
            # 顺时针
            new_cube = self._apply_rotation(new_cube, rotation_map)
        
        return new_cube
    
    def _apply_rotation(self, cube: 'RubikCube', rotation_map: List[Tuple[int, int]]) -> 'RubikCube':
        """应用旋转映射"""
        new_state = cube.state.copy()
        for src, dst in rotation_map:
            new_state[dst] = cube.state[src]
        cube.state = new_state
        return cube
    
    def apply_moves(self, moves: List[str]) -> 'RubikCube':
        """
        应用多个移动序列
        
        Args:
            moves: 移动列表
        
        Returns:
            新的魔方状态
        """
        cube = self.copy()
        for move in moves:
            cube = cube.apply_move(move)
        return cube
    
    def scramble(self, num_moves: int = 20) -> List[str]:
        """
        随机打乱魔方
        
        Args:
            num_moves: 打乱步数
        
        Returns:
            打乱步骤列表
        """
        import random
        
        moves = []
        last_face = None
        
        for _ in range(num_moves):
            # 避免连续旋转同一面
            available = [m for m in MOVES if m[0] != last_face]
            move = random.choice(available)
            moves.append(move)
            last_face = move[0]
        
        # 应用打乱
        self.state = self.apply_moves(moves).state
        
        return moves
    
    def to_kociemba_string(self) -> str:
        """
        转换为Kociemba算法所需的字符串格式
        
        Kociemba格式：
        - 顺序：U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
        - 颜色：U, R, F, D, L, B（对应面的中心色）
        """
        # 映射颜色到面标识
        color_to_face = {}
        for face in Face:
            center_idx = self.face_indices[face][4]  # 中心块索引
            center_color = self.state[center_idx]
            color_to_face[center_color] = face.value
        
        # 转换为Kociemba格式
        kociemba_chars = []
        for color in self.state:
            face_value = color_to_face.get(color, 0)
            kociemba_chars.append('URFDLB'[face_value])
        
        return ''.join(kociemba_chars)
    
    def __str__(self) -> str:
        """打印魔方状态"""
        result = []
        for face in Face:
            face_matrix = self.get_face_matrix(face)
            result.append(f"{face.name}:")
            for row in face_matrix:
                result.append(' '.join(row))
            result.append('')
        return '\n'.join(result)
    
    def __repr__(self) -> str:
        return f"RubikCube('{''.join(self.state)}')"


def create_solved_cube() -> RubikCube:
    """创建已还原的魔方"""
    return RubikCube()


def create_scrambled_cube(num_moves: int = 20) -> Tuple[RubikCube, List[str]]:
    """
    创建打乱的魔方
    
    Args:
        num_moves: 打乱步数
    
    Returns:
        (打乱的魔方, 打乱步骤)
    """
    cube = RubikCube()
    scramble_moves = cube.scramble(num_moves)
    return cube, scramble_moves


def validate_state(state: str) -> bool:
    """
    验证魔方状态是否合法
    
    Args:
        state: 54字符的状态字符串
    
    Returns:
        是否合法
    """
    if len(state) != 54:
        return False
    
    # 检查每种颜色是否出现9次
    from collections import Counter
    color_count = Counter(state)
    
    expected_colors = {'W': 9, 'Y': 9, 'R': 9, 'O': 9, 'B': 9, 'G': 9}
    
    return color_count == expected_colors


if __name__ == '__main__':
    # 测试代码
    cube = RubikCube()
    print("初始状态:")
    print(cube)
    
    # 应用一个移动
    cube = cube.apply_move('R')
    print("R旋转后:")
    print(cube)
    
    # 打乱测试
    cube = RubikCube()
    scramble_moves = cube.scramble(10)
    print(f"打乱步骤: {scramble_moves}")
    print("打乱后状态:")
    print(cube)
    
    # Kociemba格式测试
    print(f"Kociemba格式: {cube.to_kociemba_string()}")

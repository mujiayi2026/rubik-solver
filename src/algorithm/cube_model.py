"""
Rubik's Cube State Model
三阶魔方状态模型 - 使用pycuber管理魔方状态，kociemba求解

核心设计:
- 使用 pycuber 做状态管理和移动应用
- 使用 kociemba 做最优解求解
- 通过 move history 实现 copy（pycuber不支持deepcopy）
"""

import random
from typing import List, Tuple, Optional
from enum import Enum
import pycuber as pc


class Face(Enum):
    """魔方面枚举"""
    UP = 0
    RIGHT = 1
    FRONT = 2
    DOWN = 3
    LEFT = 4
    BACK = 5


# 移动定义
MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2',
         'L', "L'", 'L2', 'R', "R'", 'R2',
         'F', "F'", 'F2', 'B', "B'", 'B2']

# pycuber 颜色名 → 内部字符
_COLOR_TO_INTERNAL = {
    'white': 'W', 'yellow': 'Y', 'red': 'R',
    'orange': 'O', 'blue': 'B', 'green': 'G'
}

# kociemba 解出来的已还原状态
_SOLVED_KOCIEMBA = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'


def _build_cube_from_moves(moves: List[str]) -> pc.Cube:
    """从零开始，应用给定的移动序列，返回一个新的 pycuber Cube"""
    cube = pc.Cube()
    if moves:
        cube(pc.Formula(' '.join(moves)))
    return cube


def _cube_to_kociemba(cube: pc.Cube) -> str:
    """将 pycuber Cube 转换为 kociemba 格式字符串"""
    center_map: dict = {}
    for face_name in ['U', 'R', 'F', 'D', 'L', 'B']:
        face = cube.get_face(face_name)
        center_color = face[1][1].colour
        center_map[center_color] = face_name

    state = ''
    for face_name in ['U', 'R', 'F', 'D', 'L', 'B']:
        face = cube.get_face(face_name)
        for row in face:
            for sticker in row:
                state += center_map[sticker.colour]
    return state


class RubikCube:
    """
    三阶魔方状态类

    通过记录操作历史实现不可变语义（pycuber.Cube 不支持 deepcopy）。
    copy() 只是复制 move history，非常轻量。
    """

    def __init__(self, move_history: Optional[List[str]] = None):
        self._moves: List[str] = list(move_history) if move_history else []

    # ---------- 内部 helpers ----------

    def _build_cube(self) -> pc.Cube:
        """根据历史重建 pycuber Cube"""
        return _build_cube_from_moves(self._moves)

    # ---------- 公开 API ----------

    def get_face(self, face: Face) -> List[str]:
        """获取指定面的状态 (内部颜色格式 WYROGB)"""
        cube = self._build_cube()
        face_names = ['U', 'R', 'F', 'D', 'L', 'B']
        face_data = cube.get_face(face_names[face.value])
        return [_COLOR_TO_INTERNAL.get(s.colour, '?') for row in face_data for s in row]

    def get_face_matrix(self, face: Face) -> List[List[str]]:
        """获取指定面的 3x3 矩阵"""
        flat = self.get_face(face)
        return [flat[i*3:(i+1)*3] for i in range(3)]

    def is_solved(self) -> bool:
        return self.to_kociemba_string() == _SOLVED_KOCIEMBA

    def copy(self) -> 'RubikCube':
        """轻量复制 — 只复制操作历史"""
        return RubikCube(self._moves)

    def apply_move(self, move: str) -> 'RubikCube':
        """应用单个移动，返回新状态（不修改自身）"""
        if move not in MOVES:
            raise ValueError(f"无效的移动: {move}，有效移动: {MOVES}")
        new = self.copy()
        new._moves.append(move)
        return new

    def apply_moves(self, moves: List[str]) -> 'RubikCube':
        """应用多个移动，返回新状态"""
        new = self.copy()
        for m in moves:
            if m not in MOVES:
                raise ValueError(f"无效的移动: {m}")
        new._moves.extend(moves)
        return new

    def scramble(self, num_moves: int = 20) -> List[str]:
        """随机打乱魔方（原地修改），返回打乱步骤"""
        base = ['U', 'D', 'L', 'R', 'F', 'B']
        last = None
        moves: List[str] = []
        for _ in range(num_moves):
            available = [m for m in base if m != last]
            face = random.choice(available)
            suffix = random.choice(['', "'", '2'])
            moves.append(face + suffix)
            last = face
        self._moves.extend(moves)
        return moves

    def to_kociemba_string(self) -> str:
        cube = self._build_cube()
        return _cube_to_kociemba(cube)

    def to_internal_state(self) -> str:
        """返回内部颜色字符串 (WYROGB)"""
        cube = self._build_cube()
        state = ''
        for face_name in ['U', 'R', 'F', 'D', 'L', 'B']:
            face = cube.get_face(face_name)
            for row in face:
                for sticker in row:
                    state += _COLOR_TO_INTERNAL.get(sticker.colour, '?')
        return state

    def to_json(self) -> dict:
        faces = {}
        for i, name in enumerate(['UP', 'RIGHT', 'FRONT', 'DOWN', 'LEFT', 'BACK']):
            faces[name] = self.get_face(Face(i))
        return {
            'state': self.to_kociemba_string(),
            'faces': faces,
            'is_solved': self.is_solved(),
            'kociemba': self.to_kociemba_string(),
        }

    def __str__(self) -> str:
        result = []
        for face in Face:
            matrix = self.get_face_matrix(face)
            result.append(f"{face.name}:")
            for row in matrix:
                result.append(' '.join(row))
            result.append('')
        return '\n'.join(result)

    def __repr__(self) -> str:
        return f"RubikCube(moves={self._moves})"

    def __eq__(self, other) -> bool:
        if not isinstance(other, RubikCube):
            return False
        return self.to_kociemba_string() == other.to_kociemba_string()


# ---------- 工厂函数 ----------

def create_solved_cube() -> RubikCube:
    return RubikCube()


def create_scrambled_cube(num_moves: int = 20) -> Tuple[RubikCube, List[str]]:
    cube = RubikCube()
    scramble_moves = cube.scramble(num_moves)
    return cube, scramble_moves


def validate_state(state: str) -> dict:
    """验证 kociemba 格式的魔方状态字符串是否合法"""
    if len(state) != 54:
        return {'valid': False, 'error': f'长度必须为54，当前为{len(state)}'}
    state = state.upper()
    valid = set('URFDLB')
    if not set(state) <= valid:
        return {'valid': False, 'error': '包含非法字符，合法格式为 URFDLB'}
    from collections import Counter
    cnt = Counter(state)
    expected = {'U': 9, 'R': 9, 'F': 9, 'D': 9, 'L': 9, 'B': 9}
    if cnt != expected:
        wrong = {k: v for k, v in cnt.items() if expected.get(k, 0) != v}
        return {'valid': False, 'error': f'颜色数量错误: {wrong}'}
    centers = [state[4], state[13], state[22], state[31], state[40], state[49]]
    if len(set(centers)) != 6:
        return {'valid': False, 'error': '中心块颜色必须各不相同'}
    return {'valid': True, 'error': None}


if __name__ == '__main__':
    cube = RubikCube()
    print(f"Solved: {cube.is_solved()}")
    print(f"KC: {cube.to_kociemba_string()}")

    scramble = cube.scramble(10)
    print(f"Scramble: {scramble}")
    print(f"KC after scramble: {cube.to_kociemba_string()}")

    # 逆操作
    c = RubikCube().apply_move('R').apply_move("R'")
    print(f"R+R' solved: {c.is_solved()}")

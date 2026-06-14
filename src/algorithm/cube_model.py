"""
Rubik's Cube State Model
三阶魔方状态模型 - 使用pycuber管理魔方状态，kociemba求解

核心设计:
- 使用 pycuber 做状态管理和移动应用
- 使用 kociemba 做最优解求解
- 通过 move history 实现 copy（pycuber不支持deepcopy）

Typing: PEP 484 完整类型注解
"""

import random
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum
import pycuber as pc


class Face(Enum):
    """魔方面枚举，对应六面体的六个面。

    Attributes:
        UP: 上面 (U)
        RIGHT: 右面 (R)
        FRONT: 前面 (F)
        DOWN: 下面 (D)
        LEFT: 左面 (L)
        BACK: 后面 (B)
    """
    UP = 0
    RIGHT = 1
    FRONT = 2
    DOWN = 3
    LEFT = 4
    BACK = 5


# 所有合法的魔方移动（18种）
MOVES: List[str] = [
    'U', "U'", 'U2', 'D', "D'", 'D2',
    'L', "L'", 'L2', 'R', "R'", 'R2',
    'F', "F'", 'F2', 'B', "B'", 'B2'
]

# pycuber 颜色名 → 内部字符映射
_COLOR_TO_INTERNAL: Dict[str, str] = {
    'white': 'W', 'yellow': 'Y', 'red': 'R',
    'orange': 'O', 'blue': 'B', 'green': 'G'
}

# kociemba 解出来的已还原状态（54字符）
_SOLVED_KOCIEMBA: str = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

# 六个面名称顺序（kociemba 格式要求）
_FACE_ORDER: List[str] = ['U', 'R', 'F', 'D', 'L', 'B']


def _build_cube_from_moves(moves: List[str]) -> pc.Cube:
    """从零开始，应用给定的移动序列，返回一个新的 pycuber Cube。

    Args:
        moves: 移动序列，每个元素为标准魔方记号（如 'R', "U'", 'F2'）。

    Returns:
        应用所有移动后的 pycuber Cube 实例。

    Note:
        如果 moves 为空，返回已还原的魔方。
    """
    cube = pc.Cube()
    if moves:
        cube(pc.Formula(' '.join(moves)))
    return cube


def _cube_to_kociemba(cube: pc.Cube) -> str:
    """将 pycuber Cube 转换为 kociemba 格式字符串（54字符）。

    Kociemba 格式顺序: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
    颜色使用面名字符: U, R, F, D, L, B

    Args:
        cube: pycuber Cube 实例。

    Returns:
        54字符的 kociemba 格式状态字符串。
    """
    center_map: Dict[str, str] = {}
    for face_name in _FACE_ORDER:
        face = cube.get_face(face_name)
        center_color = face[1][1].colour
        center_map[center_color] = face_name

    state: str = ''
    for face_name in _FACE_ORDER:
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

    也可以通过 from_kociemba_string() 从已有状态字符串创建实例。

    Attributes:
        _moves (List[str]): 操作历史记录。

    Example::

        cube = RubikCube()
        cube = cube.apply_move('R').apply_move("R'")
        assert cube.is_solved()  # R 和 R' 互相抵消
    """

    # kociemba 面名字符 → pycuber 颜色名
    _KOCIEMBA_TO_COLOR: Dict[str, str] = {
        'U': 'yellow', 'R': 'orange', 'F': 'green',
        'D': 'white', 'L': 'red', 'B': 'blue'
    }

    def __init__(self, move_history: Optional[List[str]] = None) -> None:
        """初始化魔方。

        Args:
            move_history: 可选的初始移动历史。为 None 时创建已还原魔方。
        """
        self._moves: List[str] = list(move_history) if move_history else []

    @classmethod
    def from_kociemba_string(cls, state: str) -> 'RubikCube':
        """从 kociemba 格式的状态字符串创建 RubikCube 实例。

        通过 kociemba 求解器获取还原序列，然后取逆序得到
        从已还原到目标状态的移动序列。

        Args:
            state: 54字符的 kociemba 格式状态字符串。

        Returns:
            对应状态的 RubikCube 实例。

        Raises:
            ValueError: 如果状态字符串长度不为54或状态无效。
        """
        if len(state) != 54:
            raise ValueError(f"状态字符串长度必须为54，当前为{len(state)}")

        state = state.upper()

        # 检查是否为已还原状态
        if state == _SOLVED_KOCIEMBA:
            return cls()

        # 使用 kociemba 求解，获取从当前状态到已还原的步骤
        from src.algorithm.kociemba_solver import KociembaSolver
        solver = KociembaSolver()
        result = solver.solve(state)

        if result.error:
            raise ValueError(f"无法创建魔方，状态无效: {result.error}")

        # 解法是从当前状态到已还原的路径
        # 取逆序得到从已还原到当前状态的路径
        inverse_moves: List[str] = []
        for move in reversed(result.solution):
            if "'" in move:
                inverse_moves.append(move.replace("'", ""))
            elif '2' in move:
                inverse_moves.append(move)  # 180度旋转是自逆的
            else:
                inverse_moves.append(move + "'")

        return cls(inverse_moves)

    # ---------- 内部 helpers ----------

    def _build_cube(self) -> pc.Cube:
        """根据历史重建 pycuber Cube。

        Returns:
            应用所有历史移动后的 Cube 实例。
        """
        return _build_cube_from_moves(self._moves)

    # ---------- 公开 API ----------

    def get_face(self, face: Face) -> List[str]:
        """获取指定面的9个色块状态。

        Args:
            face: 要查询的面（Face 枚举值）。

        Returns:
            9个元素的列表，使用内部颜色格式 (WYROGB)。
            顺序为从左到右、从上到下。
        """
        cube = self._build_cube()
        face_data = cube.get_face(_FACE_ORDER[face.value])
        return [_COLOR_TO_INTERNAL.get(s.colour, '?') for row in face_data for s in row]

    def get_face_matrix(self, face: Face) -> List[List[str]]:
        """获取指定面的 3x3 矩阵。

        Args:
            face: 要查询的面（Face 枚举值）。

        Returns:
            3x3 的二维列表，[row][col] 索引。
        """
        flat = self.get_face(face)
        return [flat[i * 3:(i + 1) * 3] for i in range(3)]

    def is_solved(self) -> bool:
        """判断魔方是否已还原。

        Returns:
            True 如果魔方处于已还原状态。
        """
        return self.to_kociemba_string() == _SOLVED_KOCIEMBA

    def copy(self) -> 'RubikCube':
        """轻量复制 — 只复制操作历史，不重建 Cube。

        Returns:
            具有相同操作历史的新 RubikCube 实例。
        """
        return RubikCube(self._moves)

    def apply_move(self, move: str) -> 'RubikCube':
        """应用单个移动，返回新状态（不修改自身）。

        Args:
            move: 标准魔方记号（如 'R', "U'", 'F2'）。

        Returns:
            应用移动后的新 RubikCube 实例。

        Raises:
            ValueError: 如果 move 不在合法移动列表中。
        """
        if move not in MOVES:
            raise ValueError(f"无效的移动: {move}，有效移动: {MOVES}")
        new = self.copy()
        new._moves.append(move)
        return new

    def apply_moves(self, moves: List[str]) -> 'RubikCube':
        """应用多个移动，返回新状态。

        Args:
            moves: 移动序列列表。

        Returns:
            应用所有移动后的新 RubikCube 实例。

        Raises:
            ValueError: 如果任一移动不合法。
        """
        new = self.copy()
        for m in moves:
            if m not in MOVES:
                raise ValueError(f"无效的移动: {m}")
        new._moves.extend(moves)
        return new

    def scramble(self, num_moves: int = 20) -> List[str]:
        """随机打乱魔方（原地修改），返回打乱步骤。

        确保不会出现连续旋转同一面的情况。

        Args:
            num_moves: 打乱步数，默认20。

        Returns:
            实际执行的打乱步骤列表。
        """
        base = ['U', 'D', 'L', 'R', 'F', 'B']
        last: Optional[str] = None
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
        """转换为 kociemba 格式字符串。

        Returns:
            54字符的 kociemba 格式状态字符串。
        """
        cube = self._build_cube()
        return _cube_to_kociemba(cube)

    def to_internal_state(self) -> str:
        """返回内部颜色字符串 (WYROGB)，54字符。

        Returns:
            使用内部颜色字符的状态字符串。
        """
        cube = self._build_cube()
        state: str = ''
        for face_name in _FACE_ORDER:
            face = cube.get_face(face_name)
            for row in face:
                for sticker in row:
                    state += _COLOR_TO_INTERNAL.get(sticker.colour, '?')
        return state

    def to_json(self) -> Dict[str, Any]:
        """导出为 JSON 友好的字典。

        Returns:
            包含 state、faces、is_solved、kociemba 字段的字典。
        """
        faces: Dict[str, List[str]] = {}
        for i, name in enumerate(['UP', 'RIGHT', 'FRONT', 'DOWN', 'LEFT', 'BACK']):
            faces[name] = self.get_face(Face(i))
        return {
            'state': self.to_kociemba_string(),
            'faces': faces,
            'is_solved': self.is_solved(),
            'kociemba': self.to_kociemba_string(),
        }

    def __str__(self) -> str:
        """返回人类可读的魔方状态表示。"""
        result: List[str] = []
        for face in Face:
            matrix = self.get_face_matrix(face)
            result.append(f"{face.name}:")
            for row in matrix:
                result.append(' '.join(row))
            result.append('')
        return '\n'.join(result)

    def __repr__(self) -> str:
        """返回 RubikCube 的开发者字符串表示。"""
        return f"RubikCube(moves={self._moves})"

    def __eq__(self, other: object) -> bool:
        """判断两个魔方状态是否相等。

        Args:
            other: 另一个对象。

        Returns:
            True 如果 other 是 RubikCube 且 kociemba 状态相同。
        """
        if not isinstance(other, RubikCube):
            return False
        return self.to_kociemba_string() == other.to_kociemba_string()

    def __hash__(self) -> int:
        """返回基于 kociemba 状态的哈希值。"""
        return hash(self.to_kociemba_string())


# ---------- 工厂函数 ----------

def create_solved_cube() -> RubikCube:
    """创建已还原的魔方。

    Returns:
        已还原状态的 RubikCube 实例。
    """
    return RubikCube()


def create_scrambled_cube(num_moves: int = 20) -> Tuple[RubikCube, List[str]]:
    """创建随机打乱的魔方。

    Args:
        num_moves: 打乱步数，默认20。

    Returns:
        (打乱后的魔方, 打乱步骤列表) 的元组。
    """
    cube = RubikCube()
    scramble_moves = cube.scramble(num_moves)
    return cube, scramble_moves


def validate_state(state: str) -> Dict[str, Any]:
    """验证 kociemba 格式的魔方状态字符串是否合法。

    检查:
    1. 长度是否为54
    2. 是否只包含合法字符 (URFDLB)
    3. 每种颜色是否恰好出现9次
    4. 中心块颜色是否各不相同

    Args:
        state: 54字符的 kociemba 格式状态字符串。

    Returns:
        包含 'valid' (bool) 和 'error' (Optional[str]) 的字典。
    """
    if len(state) != 54:
        return {'valid': False, 'error': f'长度必须为54，当前为{len(state)}'}
    state = state.upper()
    valid = set('URFDLB')
    if not set(state) <= valid:
        return {'valid': False, 'error': '包含非法字符，合法格式为 URFDLB'}
    from collections import Counter
    cnt = Counter(state)
    expected: Dict[str, int] = {'U': 9, 'R': 9, 'F': 9, 'D': 9, 'L': 9, 'B': 9}
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

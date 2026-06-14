"""
Kociemba Two-Phase Algorithm Solver
魔方最优解算法 - Kociemba二阶段算法实现

算法原理：
1. 第一阶段：将魔方还原至< U, D, R2, L2, F2, B2 >子群状态
2. 第二阶段：在子群内搜索最优解

使用kociemba库实现高效求解。

Typing: PEP 484 完整类型注解
"""

import time
import kociemba
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass, asdict


@dataclass
class SolveResult:
    """求解结果数据类。

    Attributes:
        solution: 解法步骤列表。
        num_moves: 总步数。
        solve_time_ms: 求解耗时（毫秒）。
        phase1_moves: 第一阶段步数估算。
        phase2_moves: 第二阶段步数估算。
        is_optimal: 是否最优解（<=20步）。
        error: 错误信息，None 表示求解成功。
    """
    solution: List[str]
    num_moves: int
    solve_time_ms: float
    phase1_moves: int
    phase2_moves: int
    is_optimal: bool
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典（兼容 JSON 序列化）。

        Returns:
            包含所有字段的字典。
        """
        return asdict(self)


# 面名 → 中文名映射
_FACE_NAMES: Dict[str, str] = {
    'U': '上层', 'D': '下层', 'R': '右层',
    'L': '左层', 'F': '前层', 'B': '后层'
}

# 效率评分阈值（步数 → 星级）
_EFFICIENCY_THRESHOLDS: List[Tuple[int, str]] = [
    (18, "★★★★★ 完美"),
    (20, "★★★★☆ 优秀"),
    (22, "★★★☆☆ 良好"),
    (25, "★★☆☆☆ 一般"),
]


class KociembaSolver:
    """
    Kociemba二阶段算法求解器。

    特点：
    - 平均求解时间 < 20ms
    - 平均步数约18-20步
    - 符合上帝之数(20步)约束

    Attributes:
        solve_count (int): 累计求解次数。
        total_solve_time (float): 累计求解时间（毫秒）。
        total_moves (int): 累计解法步数。

    Example::

        solver = KociembaSolver()
        result = solver.solve("UUUUUUUUURRRRRRRRR...")
        if result.error is None:
            print(f"解法: {result.solution}, 步数: {result.num_moves}")
    """

    def __init__(self) -> None:
        """初始化求解器，统计计数归零。"""
        self.solve_count: int = 0
        self.total_solve_time: float = 0.0
        self.total_moves: int = 0

    def solve(self, cube_state: str) -> SolveResult:
        """求解魔方最优解。

        Args:
            cube_state: Kociemba格式的状态字符串（54字符）。
                        顺序: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
                        颜色: U, R, F, D, L, B

        Returns:
            SolveResult: 求解结果，包含解法步骤、步数、耗时等。
            如果输入非法，返回带 error 字段的 SolveResult。
        """
        start_time: float = time.perf_counter()

        try:
            # 验证状态字符串长度
            if len(cube_state) != 54:
                return SolveResult(
                    solution=[], num_moves=0, solve_time_ms=0,
                    phase1_moves=0, phase2_moves=0, is_optimal=False,
                    error=f"状态字符串长度错误: {len(cube_state)}, 应为54"
                )

            # 验证字符合法性
            valid_chars: set[str] = set('URFDLB')
            invalid: set[str] = set(cube_state) - valid_chars
            if invalid:
                return SolveResult(
                    solution=[], num_moves=0, solve_time_ms=0,
                    phase1_moves=0, phase2_moves=0, is_optimal=False,
                    error=f"包含非法字符: {invalid}，Kociemba格式只接受 U,R,F,D,L,B"
                )

            # 调用 Kociemba 算法求解
            solution_str: str = kociemba.solve(cube_state)

            # 计算求解时间
            solve_time: float = (time.perf_counter() - start_time) * 1000

            # 解析解法步骤
            moves: List[str] = solution_str.split() if solution_str else []

            # 统计阶段步数
            phase1_moves, phase2_moves = self._count_phases(moves)

            # 更新统计
            self.solve_count += 1
            self.total_solve_time += solve_time
            self.total_moves += len(moves)

            return SolveResult(
                solution=moves,
                num_moves=len(moves),
                solve_time_ms=round(solve_time, 2),
                phase1_moves=phase1_moves,
                phase2_moves=phase2_moves,
                is_optimal=(len(moves) <= 20)
            )

        except Exception as e:
            solve_time = (time.perf_counter() - start_time) * 1000
            error_msg: str = str(e)
            # 常见错误友好提示
            if 'Invalid' in error_msg or 'invalid' in error_msg:
                error_msg = '无效的魔方状态，请检查输入'
            return SolveResult(
                solution=[], num_moves=0, solve_time_ms=round(solve_time, 2),
                phase1_moves=0, phase2_moves=0, is_optimal=False,
                error=error_msg
            )

    def solve_with_visualization_data(self, cube_state: str) -> Dict[str, Any]:
        """求解并返回前端可视化所需的数据。

        Args:
            cube_state: Kociemba格式的状态字符串。

        Returns:
            包含解法、动画数据和效率评分的字典。
            成功时 success=True，失败时 success=False 且 error 非空。
        """
        result: SolveResult = self.solve(cube_state)

        if result.error:
            return {'success': False, 'error': result.error}

        # 为每个步骤生成动画数据
        animation_steps: List[Dict[str, Any]] = []
        for i, move in enumerate(result.solution):
            face: str = move[0]
            name: str = _FACE_NAMES.get(face, face)
            if '2' in move:
                desc: str = f"{name}旋转180°"
                direction: str = 'double'
            elif "'" in move:
                desc = f"{name}逆时针旋转90°"
                direction = 'counter-clockwise'
            else:
                desc = f"{name}顺时针旋转90°"
                direction = 'clockwise'

            animation_steps.append({
                'step': i + 1,
                'move': move,
                'face': face,
                'direction': direction,
                'is_double': '2' in move,
                'description': desc
            })

        return {
            'success': True,
            'solution': result.solution,
            'num_moves': result.num_moves,
            'solve_time_ms': result.solve_time_ms,
            'phase1_moves': result.phase1_moves,
            'phase2_moves': result.phase2_moves,
            'is_optimal': result.is_optimal,
            'animation_steps': animation_steps,
            'efficiency_score': self._calculate_efficiency(result.num_moves)
        }

    def _count_phases(self, moves: List[str]) -> Tuple[int, int]:
        """估算两个阶段的步数划分。

        注：Kociemba 库返回的是合并后的解法，
        这里通过启发式方法估算阶段划分点。

        Args:
            moves: 解法步骤列表。

        Returns:
            (phase1_moves, phase2_moves) 的元组。
        """
        if not moves:
            return 0, 0

        # 第一阶段通常包含单层旋转(U, D, R, L, F, B)
        # 第二阶段主要是180度旋转和U/D
        phase1_end: int = 0
        for i, move in enumerate(moves):
            if '2' in move and i > 0 and '2' in moves[i - 1]:
                phase1_end = i
                break
            phase1_end = i + 1

        # 如果没有明确分界，按比例估算（2/3 为第一阶段）
        if phase1_end == len(moves):
            phase1_end = len(moves) * 2 // 3

        return phase1_end, len(moves) - phase1_end

    def _calculate_efficiency(self, num_moves: int) -> str:
        """计算效率评分。

        Args:
            num_moves: 解法步数。

        Returns:
            带星级的效率描述字符串。
        """
        for threshold, rating in _EFFICIENCY_THRESHOLDS:
            if num_moves <= threshold:
                return rating
        return "★☆☆☆☆ 较差"

    def get_statistics(self) -> Dict[str, Any]:
        """获取求解统计信息。

        Returns:
            包含 total_solves、avg_solve_time_ms、avg_moves 等字段的字典。
        """
        if self.solve_count == 0:
            return {
                'total_solves': 0,
                'avg_solve_time_ms': 0,
                'avg_moves': 0,
                'total_solve_time_ms': 0,
                'total_moves': 0
            }

        return {
            'total_solves': self.solve_count,
            'avg_solve_time_ms': round(self.total_solve_time / self.solve_count, 2),
            'avg_moves': round(self.total_moves / self.solve_count, 1),
            'total_solve_time_ms': round(self.total_solve_time, 2),
            'total_moves': self.total_moves
        }

    def reset_statistics(self) -> None:
        """重置所有统计信息为初始值。"""
        self.solve_count = 0
        self.total_solve_time = 0.0
        self.total_moves = 0


# ---------- 便捷函数 ----------

def solve_cube(cube_state: str) -> Dict[str, Any]:
    """便捷求解函数（创建临时求解器）。

    Args:
        cube_state: Kociemba格式的状态字符串。

    Returns:
        包含解法和可视化数据的字典。
    """
    solver = KociembaSolver()
    return solver.solve_with_visualization_data(cube_state)


def solve_scrambled_cube(num_moves: int = 20) -> Dict[str, Any]:
    """求解随机打乱的魔方。

    Args:
        num_moves: 打乱步数，默认20。

    Returns:
        包含解法、打乱步骤和可视化数据的字典。
    """
    from .cube_model import RubikCube

    cube = RubikCube()
    scramble_moves: List[str] = cube.scramble(num_moves)
    kociemba_state: str = cube.to_kociemba_string()

    solver = KociembaSolver()
    result: Dict[str, Any] = solver.solve_with_visualization_data(kociemba_state)

    result['scramble'] = scramble_moves
    result['scramble_moves'] = len(scramble_moves)
    result['cube_state'] = kociemba_state

    return result

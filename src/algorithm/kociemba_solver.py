"""
Kociemba Two-Phase Algorithm Solver
魔方最优解算法 - Kociemba二阶段算法实现

算法原理：
1. 第一阶段：将魔方还原至< U, D, R2, L2, F2, B2 >子群状态
2. 第二阶段：在子群内搜索最优解

使用kociemba库实现高效求解
"""

import time
import kociemba
from typing import List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class SolveResult:
    """求解结果数据类"""
    solution: List[str]        # 解法步骤
    num_moves: int             # 总步数
    solve_time_ms: float       # 求解耗时(毫秒)
    phase1_moves: int          # 第一阶段步数
    phase2_moves: int          # 第二阶段步数
    is_optimal: bool           # 是否最优解(<=20步)
    error: Optional[str] = None  # 错误信息


class KociembaSolver:
    """
    Kociemba二阶段算法求解器
    
    特点：
    - 平均求解时间 < 20ms
    - 平均步数约18-20步
    - 符合上帝之数(20步)约束
    """
    
    def __init__(self):
        """初始化求解器"""
        self.solve_count = 0
        self.total_solve_time = 0.0
        self.total_moves = 0
    
    def solve(self, cube_state: str) -> SolveResult:
        """
        求解魔方最优解
        
        Args:
            cube_state: Kociemba格式的状态字符串(54字符)
                        顺序: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
                        颜色: U, R, F, D, L, B
        
        Returns:
            SolveResult: 求解结果
        """
        start_time = time.perf_counter()
        
        try:
            # 验证状态字符串
            if len(cube_state) != 54:
                return SolveResult(
                    solution=[],
                    num_moves=0,
                    solve_time_ms=0,
                    phase1_moves=0,
                    phase2_moves=0,
                    is_optimal=False,
                    error=f"状态字符串长度错误: {len(cube_state)}, 应为54"
                )
            
            # 调用Kociemba算法求解
            solution_str = kociemba.solve(cube_state)
            
            # 计算求解时间
            solve_time = (time.perf_counter() - start_time) * 1000
            
            # 解析解法步骤
            moves = solution_str.split() if solution_str else []
            
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
            return SolveResult(
                solution=[],
                num_moves=0,
                solve_time_ms=round(solve_time, 2),
                phase1_moves=0,
                phase2_moves=0,
                is_optimal=False,
                error=str(e)
            )
    
    def solve_with_visualization_data(self, cube_state: str) -> dict:
        """
        求解并返回可视化所需的数据
        
        Args:
            cube_state: Kociemba格式的状态字符串
        
        Returns:
            包含解法和可视化数据的字典
        """
        result = self.solve(cube_state)
        
        if result.error:
            return {
                'success': False,
                'error': result.error
            }
        
        # 为每个步骤生成动画数据
        animation_steps = []
        for i, move in enumerate(result.solution):
            animation_steps.append({
                'step': i + 1,
                'move': move,
                'face': move[0],
                'direction': 'clockwise' if "'" not in move else 'counter-clockwise',
                'is_double': '2' in move,
                'description': self._move_description(move)
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
        """
        统计两个阶段的步数
        
        注：Kociemba库返回的是合并后的解法，
        这里通过启发式方法估算阶段划分
        """
        if not moves:
            return 0, 0
        
        # 第一阶段通常包含单层旋转(U, D, R, L, F, B)
        # 第二阶段主要是180度旋转和U/D
        phase1_end = 0
        for i, move in enumerate(moves):
            # 如果出现连续的180度旋转，可能是第二阶段开始
            if '2' in move and i > 0 and '2' in moves[i-1]:
                phase1_end = i
                break
            phase1_end = i + 1
        
        # 如果没有明确分界，按比例估算
        if phase1_end == len(moves):
            phase1_end = len(moves) * 2 // 3
        
        return phase1_end, len(moves) - phase1_end
    
    def _move_description(self, move: str) -> str:
        """生成移动的中文描述"""
        face_names = {
            'U': '上层', 'D': '下层',
            'R': '右层', 'L': '左层',
            'F': '前层', 'B': '后层'
        }
        
        face = move[0]
        name = face_names.get(face, face)
        
        if '2' in move:
            return f"{name}旋转180°"
        elif "'" in move:
            return f"{name}逆时针旋转90°"
        else:
            return f"{name}顺时针旋转90°"
    
    def _calculate_efficiency(self, num_moves: int) -> str:
        """计算效率评分"""
        if num_moves <= 18:
            return "★★★★★ 完美"
        elif num_moves <= 20:
            return "★★★★☆ 优秀"
        elif num_moves <= 22:
            return "★★★☆☆ 良好"
        elif num_moves <= 25:
            return "★★☆☆☆ 一般"
        else:
            return "★☆☆☆☆ 较差"
    
    def get_statistics(self) -> dict:
        """获取求解统计信息"""
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
    
    def reset_statistics(self):
        """重置统计信息"""
        self.solve_count = 0
        self.total_solve_time = 0.0
        self.total_moves = 0


# 便捷函数
def solve_cube(cube_state: str) -> dict:
    """
    便捷求解函数
    
    Args:
        cube_state: Kociemba格式的状态字符串
    
    Returns:
        求解结果字典
    """
    solver = KociembaSolver()
    return solver.solve_with_visualization_data(cube_state)


def solve_scrambled_cube(num_moves: int = 20) -> dict:
    """
    求解随机打乱的魔方
    
    Args:
        num_moves: 打乱步数
    
    Returns:
        包含打乱和解法的字典
    """
    from .cube_model import RubikCube
    
    # 创建并打乱魔方
    cube = RubikCube()
    scramble_moves = cube.scramble(num_moves)
    
    # 转换为Kociemba格式
    kociemba_state = cube.to_kociemba_string()
    
    # 求解
    solver = KociembaSolver()
    result = solver.solve_with_visualization_data(kociemba_state)
    
    # 添加打乱信息
    result['scramble'] = scramble_moves
    result['scramble_moves'] = len(scramble_moves)
    result['cube_state'] = kociemba_state
    
    return result


if __name__ == '__main__':
    # 测试代码
    print("=" * 60)
    print("魔方最优解算法测试")
    print("=" * 60)
    
    # 测试1: 随机打乱求解
    print("\n【测试1】随机打乱魔方求解")
    print("-" * 40)
    
    result = solve_scrambled_cube(20)
    
    if result['success']:
        print(f"打乱步骤: {' '.join(result['scramble'])}")
        print(f"求解步骤: {' '.join(result['solution'])}")
        print(f"总步数: {result['num_moves']}")
        print(f"求解耗时: {result['solve_time_ms']}ms")
        print(f"是否最优: {'是' if result['is_optimal'] else '否'}")
        print(f"效率评分: {result['efficiency_score']}")
    else:
        print(f"求解失败: {result['error']}")
    
    # 测试2: 多次求解统计
    print("\n【测试2】多次求解统计")
    print("-" * 40)
    
    solver = KociembaSolver()
    
    for i in range(5):
        result = solve_scrambled_cube(20)
        if result['success']:
            print(f"第{i+1}次: {result['num_moves']}步, {result['solve_time_ms']}ms")
    
    stats = solver.get_statistics()
    print(f"\n平均步数: {stats['avg_moves']}")
    print(f"平均耗时: {stats['avg_solve_time_ms']}ms")

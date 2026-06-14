"""
Flask API Server
魔方求解API服务

端点列表:
- GET  /                  主页（HTML）
- GET  /api/health        健康检查
- POST /api/scramble      生成打乱
- POST /api/solve         求解魔方
- POST /api/scramble-and-solve  打乱并求解
- POST /api/validate      验证状态
- GET  /api/statistics    求解统计
- POST /api/reset-statistics    重置统计
- GET  /api/cache-stats   缓存统计
- POST /api/cache-clear   清空缓存
- GET  /api/history       求解历史
- POST /api/move          应用单个移动
- POST /api/moves         应用多个移动
- GET  /api/profile       性能分析数据

性能优化:
- LRU求解结果缓存（相同打乱不重复计算）
- 条件渲染响应头

Typing: PEP 484 完整类型注解
"""

from flask import Flask, render_template, jsonify, request, Response
from flask.wrappers import Request as FlaskRequest
from flask_cors import CORS
import sys
import os
import logging
import hashlib
import time
import json as json_mod
from functools import lru_cache, wraps
from collections import OrderedDict
from typing import List, Tuple, Optional, Dict, Any, Callable

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithm.cube_model import RubikCube, create_scrambled_cube, validate_state
from algorithm.kociemba_solver import KociembaSolver, solve_cube, solve_scrambled_cube

# 配置日志
logging.basicConfig(level=logging.INFO)
logger: logging.Logger = logging.getLogger(__name__)

app: Flask = Flask(
    __name__,
    template_folder='../../templates',
    static_folder='../../static'
)

CORS(app)

# 全局求解器实例
solver: KociembaSolver = KociembaSolver()

# 求解历史记录 (内存中，最近50条)
solve_history: List[Dict[str, Any]] = []
MAX_HISTORY: int = 50


# ========== 性能分析系统 ==========

class RequestProfiler:
    """请求性能分析器。

    记录每个 API 端点的响应时间、请求次数和错误率。
    用于前端性能面板展示。

    Attributes:
        _records (Dict[str, List[Dict]]): 按端点分组的请求记录。
        _max_per_endpoint (int): 每个端点最多保留的记录数。
    """

    def __init__(self, max_per_endpoint: int = 100) -> None:
        """初始化分析器。

        Args:
            max_per_endpoint: 每个端点最多保留的记录数。
        """
        self._records: Dict[str, List[Dict[str, Any]]] = {}
        self._max_per_endpoint: int = max_per_endpoint

    def record(self, endpoint: str, duration_ms: float, status: int = 200) -> None:
        """记录一次请求。

        Args:
            endpoint: API 端点路径。
            duration_ms: 请求处理时间（毫秒）。
            status: HTTP 状态码。
        """
        if endpoint not in self._records:
            self._records[endpoint] = []

        entry: Dict[str, Any] = {
            'timestamp': time.time(),
            'duration_ms': round(duration_ms, 2),
            'status': status
        }
        self._records[endpoint].append(entry)

        # 滚动淘汰
        if len(self._records[endpoint]) > self._max_per_endpoint:
            self._records[endpoint].pop(0)

    def get_stats(self) -> Dict[str, Any]:
        """获取所有端点的统计摘要。

        Returns:
            包含每个端点请求数、平均/最大/最小响应时间的字典。
        """
        result: Dict[str, Any] = {}
        for endpoint, records in self._records.items():
            if not records:
                continue
            durations: List[float] = [r['duration_ms'] for r in records]
            errors: int = sum(1 for r in records if r.get('status', 200) >= 400)
            result[endpoint] = {
                'count': len(records),
                'avg_ms': round(sum(durations) / len(durations), 2),
                'max_ms': round(max(durations), 2),
                'min_ms': round(min(durations), 2),
                'errors': errors,
                'error_rate': f"{errors / len(records) * 100:.1f}%",
                'last_5': [round(d, 2) for d in durations[-5:]]
            }
        return result

    def clear(self) -> None:
        """清空所有记录。"""
        self._records.clear()


# 全局分析器实例
profiler: RequestProfiler = RequestProfiler()


def profile_endpoint(f: Callable) -> Callable:
    """装饰器：自动记录 API 端点的性能数据。

    Args:
        f: 被装饰的视图函数。

    Returns:
        包装后的函数，在执行前后记录时间。
    """
    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Response:
        start: float = time.perf_counter()
        response: Response = f(*args, **kwargs)
        duration_ms: float = (time.perf_counter() - start) * 1000
        endpoint: str = request.endpoint or request.path
        status: int = response.status_code if hasattr(response, 'status_code') else 200
        profiler.record(endpoint, duration_ms, status)
        return response
    return wrapper


# ========== 求解缓存系统 ==========

class SolveCache:
    """LRU求解结果缓存。

    缓存最近的求解结果，避免对相同打乱状态重复调用 kociemba。
    使用 OrderedDict 实现 LRU 淘汰策略。

    Attributes:
        _cache (OrderedDict): 缓存数据，键为 MD5 哈希。
        _max_size (int): 最大缓存条目数。
        _hits (int): 缓存命中次数。
        _misses (int): 缓存未命中次数。

    Example::

        cache = SolveCache(max_size=200)
        cache.put("UUUU...", {"solution": [...]})
        result = cache.get("UUUU...")  # 命中缓存
    """

    def __init__(self, max_size: int = 200) -> None:
        """初始化缓存。

        Args:
            max_size: 最大缓存条目数，默认200。
        """
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._max_size: int = max_size
        self._hits: int = 0
        self._misses: int = 0

    def _make_key(self, cube_state: str) -> str:
        """生成缓存键（MD5 哈希）。

        Args:
            cube_state: kociemba 格式状态字符串。

        Returns:
            32字符的 MD5 哈希字符串。
        """
        return hashlib.md5(cube_state.encode()).hexdigest()

    def get(self, cube_state: str) -> Optional[Dict[str, Any]]:
        """获取缓存结果。

        Args:
            cube_state: kociemba 格式状态字符串。

        Returns:
            缓存的求解结果字典，未命中时返回 None。
        """
        key: str = self._make_key(cube_state)
        if key in self._cache:
            self._hits += 1
            # 移到末尾（最近使用）
            self._cache.move_to_end(key)
            return self._cache[key]
        self._misses += 1
        return None

    def put(self, cube_state: str, result: Dict[str, Any]) -> None:
        """存入缓存。

        Args:
            cube_state: kociemba 格式状态字符串。
            result: 求解结果字典。
        """
        key: str = self._make_key(cube_state)
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)  # 移除最旧的
            self._cache[key] = result

    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息。

        Returns:
            包含 cache_size、cache_hits、cache_misses、hit_rate 的字典。
        """
        total: int = self._hits + self._misses
        return {
            'cache_size': len(self._cache),
            'cache_hits': self._hits,
            'cache_misses': self._misses,
            'hit_rate': f"{self._hits / total * 100:.1f}%" if total > 0 else "N/A"
        }

    def clear(self) -> None:
        """清空缓存并重置统计。"""
        self._cache.clear()
        self._hits = 0
        self._misses = 0


# 全局缓存实例
solve_cache: SolveCache = SolveCache(max_size=200)


# ========== 路由 ==========

@app.route('/')
def index() -> str:
    """主页，渲染前端 HTML 页面。

    Returns:
        渲染后的 index.html 内容。
    """
    return render_template('index.html')


@app.route('/api/health', methods=['GET'])
@profile_endpoint
def health() -> Response:
    """健康检查端点。

    Returns:
        JSON: {"status": "ok", "service": "...", "version": "..."}
    """
    return jsonify({
        'status': 'ok',
        'service': 'Rubik Solver',
        'version': '1.1.0'
    })


@app.route('/api/scramble', methods=['POST'])
@profile_endpoint
def scramble() -> Response:
    """生成打乱魔方。

    请求体::

        {
            "num_moves": 20  // 打乱步数(可选，默认20，范围1-50)
        }

    Returns:
        JSON: {"success": true, "scramble": [...], "cube_state": "..."}
    """
    data: Dict[str, Any] = request.get_json() or {}
    num_moves: int = data.get('num_moves', 20)
    num_moves = max(1, min(50, num_moves))

    try:
        cube, scramble_moves = create_scrambled_cube(num_moves)
        return jsonify({
            'success': True,
            'scramble': scramble_moves,
            'scramble_str': ' '.join(scramble_moves),
            'num_scramble_moves': len(scramble_moves),
            'cube_state': cube.to_kociemba_string()
        })
    except Exception as e:
        logger.error(f"打乱失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/solve', methods=['POST'])
@profile_endpoint
def solve() -> Response:
    """求解魔方。

    请求体（二选一）::

        {"cube_state": "UUUUUUUUURRRRRRRRR..."}  // Kociemba格式状态
        {"scramble": ["R", "U", "F'", ...]}        // 打乱步骤

    Returns:
        JSON: {"success": true, "solution": [...], "num_moves": ...}
    """
    data: Optional[Dict[str, Any]] = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': '请求体为空'}), 400

    try:
        result: Dict[str, Any]

        # 从状态字符串求解
        if 'cube_state' in data:
            cube_state: str = data['cube_state']

            # 验证输入格式
            if len(cube_state) != 54:
                return jsonify({
                    'success': False,
                    'error': f'状态字符串长度必须为54，当前为{len(cube_state)}'
                }), 400

            # 检查缓存
            cached: Optional[Dict[str, Any]] = solve_cache.get(cube_state)
            if cached is not None:
                cached_copy = dict(cached)
                cached_copy['from_cache'] = True
                return jsonify(cached_copy)

            result = solve_cube(cube_state)

        # 从打乱步骤求解
        elif 'scramble' in data:
            scramble_moves: List[str] = data['scramble']

            if not isinstance(scramble_moves, list):
                return jsonify({'success': False, 'error': 'scramble必须是数组'}), 400

            cube: RubikCube = RubikCube()
            cube = cube.apply_moves(scramble_moves)
            cube_state = cube.to_kociemba_string()

            # 检查缓存
            cached = solve_cache.get(cube_state)
            if cached is not None:
                cached_copy = dict(cached)
                cached_copy['from_cache'] = True
                result = cached_copy
            else:
                result = solve_cube(cube_state)
                # 缓存成功的结果
                if result.get('success'):
                    solve_cache.put(cube_state, result)

            result['scramble'] = scramble_moves
        else:
            return jsonify({
                'success': False,
                'error': '缺少cube_state或scramble参数'
            }), 400

        # 保存到历史
        if result.get('success'):
            _add_to_history(result, data.get('scramble', []))

        return jsonify(result)

    except Exception as e:
        logger.error(f"求解失败: {e}")
        return jsonify({'success': False, 'error': f'求解异常: {str(e)}'}), 500


@app.route('/api/scramble-and-solve', methods=['POST'])
@profile_endpoint
def scramble_and_solve() -> Response:
    """打乱并求解（一步到位）。

    请求体::

        {"num_moves": 20}  // 打乱步数(可选)

    Returns:
        JSON: 包含打乱步骤和解法的完整结果。
    """
    data: Dict[str, Any] = request.get_json() or {}
    num_moves: int = data.get('num_moves', 20)
    num_moves = max(1, min(50, num_moves))

    try:
        result: Dict[str, Any] = solve_scrambled_cube(num_moves)

        # 缓存成功结果
        if result.get('success') and 'cube_state' in result:
            solve_cache.put(result['cube_state'], result)

        if result.get('success'):
            _add_to_history(result, result.get('scramble', []))

        return jsonify(result)
    except Exception as e:
        logger.error(f"打乱求解失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/validate', methods=['POST'])
@profile_endpoint
def validate() -> Response:
    """验证魔方状态字符串是否合法。

    请求体::

        {"cube_state": "UUUUUUUUU..."}

    Returns:
        JSON: {"success": true, "is_valid": true/false, "error": "..."}
    """
    data: Optional[Dict[str, Any]] = request.get_json()

    if not data or 'cube_state' not in data:
        return jsonify({'success': False, 'error': '缺少cube_state参数'}), 400

    cube_state: str = data['cube_state']
    validation: Dict[str, Any] = validate_state(cube_state)

    return jsonify({
        'success': True,
        'is_valid': validation['valid'],
        'error': validation['error'],
        'cube_state': cube_state
    })


@app.route('/api/statistics', methods=['GET'])
@profile_endpoint
def statistics() -> Response:
    """获取全局求解统计信息。

    Returns:
        JSON: 包含 total_solves、avg_solve_time_ms、avg_moves 等。
    """
    stats: Dict[str, Any] = solver.get_statistics()
    return jsonify(stats)


@app.route('/api/reset-statistics', methods=['POST'])
@profile_endpoint
def reset_statistics() -> Response:
    """重置求解统计信息。

    Returns:
        JSON: {"success": true, "message": "统计信息已重置"}
    """
    solver.reset_statistics()
    return jsonify({'success': True, 'message': '统计信息已重置'})


@app.route('/api/cache-stats', methods=['GET'])
@profile_endpoint
def cache_stats() -> Response:
    """获取缓存统计信息。

    Returns:
        JSON: 包含 cache_size、cache_hits、cache_misses、hit_rate。
    """
    stats: Dict[str, Any] = solve_cache.get_stats()
    stats['success'] = True
    return jsonify(stats)


@app.route('/api/cache-clear', methods=['POST'])
@profile_endpoint
def cache_clear() -> Response:
    """清空求解缓存。

    Returns:
        JSON: {"success": true, "message": "缓存已清空"}
    """
    solve_cache.clear()
    return jsonify({'success': True, 'message': '缓存已清空'})


@app.route('/api/history', methods=['GET'])
@profile_endpoint
def history() -> Response:
    """获取求解历史记录。

    Query Params:
        limit (int): 返回条目数，默认20，范围1-50。

    Returns:
        JSON: {"success": true, "history": [...], "total": ...}
    """
    limit: int = request.args.get('limit', 20, type=int)
    limit = max(1, min(MAX_HISTORY, limit))
    return jsonify({
        'success': True,
        'history': solve_history[:limit],
        'total': len(solve_history)
    })


@app.route('/api/move', methods=['POST'])
@profile_endpoint
def apply_move() -> Response:
    """应用单个移动到魔方状态。

    请求体::

        {
            "cube_state": "UUUUUUUUURRRRRRRRR...",
            "move": "R"
        }

    Returns:
        JSON: {"success": true, "new_state": "...", "move": "R"}
    """
    data: Optional[Dict[str, Any]] = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': '请求体为空'}), 400

    cube_state: Optional[str] = data.get('cube_state')
    move: Optional[str] = data.get('move')

    if not cube_state or not move:
        return jsonify({'success': False, 'error': '缺少cube_state或move参数'}), 400

    try:
        cube: RubikCube = RubikCube.from_kociemba_string(cube_state)
        new_cube: RubikCube = cube.apply_move(move)

        return jsonify({
            'success': True,
            'new_state': new_cube.to_kociemba_string(),
            'move': move
        })
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/moves', methods=['POST'])
@profile_endpoint
def apply_moves() -> Response:
    """应用多个移动到魔方状态。

    请求体::

        {
            "cube_state": "UUUUUUUUURRRRRRRRR...",
            "moves": ["R", "U", "F'"]
        }

    Returns:
        JSON: {"success": true, "new_state": "...", "applied_moves": [...]}
    """
    data: Optional[Dict[str, Any]] = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': '请求体为空'}), 400

    cube_state: Optional[str] = data.get('cube_state')
    moves: List[str] = data.get('moves', [])

    if not cube_state:
        return jsonify({'success': False, 'error': '缺少cube_state参数'}), 400

    if not isinstance(moves, list):
        return jsonify({'success': False, 'error': 'moves必须是数组'}), 400

    try:
        cube: RubikCube = RubikCube.from_kociemba_string(cube_state)
        new_cube: RubikCube = cube.apply_moves(moves)

        return jsonify({
            'success': True,
            'new_state': new_cube.to_kociemba_string(),
            'applied_moves': moves
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/profile', methods=['GET'])
@profile_endpoint
def profile_stats() -> Response:
    """获取性能分析数据。

    返回所有 API 端点的响应时间统计，用于前端性能面板展示。

    Returns:
        JSON: {"success": true, "endpoints": {"/api/solve": {...}, ...}}
    """
    stats: Dict[str, Any] = profiler.get_stats()
    return jsonify({
        'success': True,
        'endpoints': stats,
        'total_requests': sum(s['count'] for s in stats.values())
    })


@app.route('/api/profile-clear', methods=['POST'])
@profile_endpoint
def profile_clear() -> Response:
    """清空性能分析数据。

    Returns:
        JSON: {"success": true, "message": "性能数据已清空"}
    """
    profiler.clear()
    return jsonify({'success': True, 'message': '性能数据已清空'})


# ========== 辅助函数 ==========

def _add_to_history(result: Dict[str, Any], scramble: list) -> None:
    """添加求解结果到历史记录（保持最近 MAX_HISTORY 条）。

    Args:
        result: 求解结果字典。
        scramble: 打乱步骤列表。
    """
    entry: Dict[str, Any] = {
        'timestamp': time.time(),
        'num_moves': result.get('num_moves', 0),
        'solve_time_ms': result.get('solve_time_ms', 0),
        'is_optimal': result.get('is_optimal', False),
        'solution': result.get('solution', []),
        'scramble_count': len(scramble) if scramble else 0,
        'efficiency_score': result.get('efficiency_score', '')
    }
    solve_history.insert(0, entry)
    if len(solve_history) > MAX_HISTORY:
        solve_history.pop()


# ========== 错误处理 ==========

@app.errorhandler(404)
def not_found(e: Exception) -> Tuple[Response, int]:
    """404 错误处理。

    Args:
        e: 异常对象。

    Returns:
        JSON 错误响应和 404 状态码。
    """
    return jsonify({'success': False, 'error': '接口不存在'}), 404


@app.errorhandler(500)
def server_error(e: Exception) -> Tuple[Response, int]:
    """500 错误处理。

    Args:
        e: 异常对象。

    Returns:
        JSON 错误响应和 500 状态码。
    """
    return jsonify({'success': False, 'error': '服务器内部错误'}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("魔方最优解可视化系统")
    print("访问 http://localhost:5000")
    print("=" * 60)

    app.run(debug=True, host='0.0.0.0', port=5000)

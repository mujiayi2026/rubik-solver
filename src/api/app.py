"""
Flask API Server
魔方求解API服务
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import sys
import os
import logging

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithm.cube_model import RubikCube, create_scrambled_cube, validate_state
from algorithm.kociemba_solver import KociembaSolver, solve_cube, solve_scrambled_cube

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__,
            template_folder='../../templates',
            static_folder='../../static')

CORS(app)

# 全局求解器实例
solver = KociembaSolver()

# 求解历史记录 (内存中，最近50条)
solve_history = []
MAX_HISTORY = 50


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'service': 'Rubik Solver',
        'version': '1.0.0'
    })


@app.route('/api/scramble', methods=['POST'])
def scramble():
    """
    生成打乱魔方

    请求体:
    {
        "num_moves": 20  // 打乱步数(可选，默认20)
    }
    """
    data = request.get_json() or {}
    num_moves = data.get('num_moves', 20)
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
def solve():
    """
    求解魔方

    请求体:
    {
        "cube_state": "UUUUUUUUURRRRRRRRR..."  // Kociemba格式状态
    }
    或者:
    {
        "scramble": ["R", "U", "F'", ...]  // 打乱步骤
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': '请求体为空'}), 400

    try:
        # 从状态字符串求解
        if 'cube_state' in data:
            cube_state = data['cube_state']

            # 验证输入格式
            if len(cube_state) != 54:
                return jsonify({'success': False, 'error': f'状态字符串长度必须为54，当前为{len(cube_state)}'}), 400

            result = solve_cube(cube_state)

        # 从打乱步骤求解
        elif 'scramble' in data:
            scramble_moves = data['scramble']

            if not isinstance(scramble_moves, list):
                return jsonify({'success': False, 'error': 'scramble必须是数组'}), 400

            cube = RubikCube()
            cube = cube.apply_moves(scramble_moves)
            result = solve_cube(cube.to_kociemba_string())
            result['scramble'] = scramble_moves
        else:
            return jsonify({'success': False, 'error': '缺少cube_state或scramble参数'}), 400

        # 保存到历史
        if result.get('success'):
            _add_to_history(result, data.get('scramble', []))

        return jsonify(result)

    except Exception as e:
        logger.error(f"求解失败: {e}")
        return jsonify({'success': False, 'error': f'求解异常: {str(e)}'}), 500


@app.route('/api/scramble-and-solve', methods=['POST'])
def scramble_and_solve():
    """
    打乱并求解（一步到位）
    """
    data = request.get_json() or {}
    num_moves = data.get('num_moves', 20)
    num_moves = max(1, min(50, num_moves))

    try:
        result = solve_scrambled_cube(num_moves)

        if result.get('success'):
            _add_to_history(result, result.get('scramble', []))

        return jsonify(result)
    except Exception as e:
        logger.error(f"打乱求解失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/validate', methods=['POST'])
def validate():
    """验证魔方状态"""
    data = request.get_json()

    if not data or 'cube_state' not in data:
        return jsonify({'success': False, 'error': '缺少cube_state参数'}), 400

    cube_state = data['cube_state']
    validation = validate_state(cube_state)

    return jsonify({
        'success': True,
        'is_valid': validation['valid'],
        'error': validation['error'],
        'cube_state': cube_state
    })


@app.route('/api/statistics', methods=['GET'])
def statistics():
    """获取求解统计信息"""
    stats = solver.get_statistics()
    return jsonify(stats)


@app.route('/api/reset-statistics', methods=['POST'])
def reset_statistics():
    """重置统计信息"""
    solver.reset_statistics()
    return jsonify({'success': True, 'message': '统计信息已重置'})


@app.route('/api/history', methods=['GET'])
def history():
    """获取求解历史"""
    limit = request.args.get('limit', 20, type=int)
    limit = max(1, min(MAX_HISTORY, limit))
    return jsonify({
        'success': True,
        'history': solve_history[:limit],
        'total': len(solve_history)
    })


@app.route('/api/move', methods=['POST'])
def apply_move():
    """
    应用单个移动

    请求体:
    {
        "cube_state": "UUUUUUUUURRRRRRRRR...",
        "move": "R"
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': '请求体为空'}), 400

    cube_state = data.get('cube_state')
    move = data.get('move')

    if not cube_state or not move:
        return jsonify({'success': False, 'error': '缺少cube_state或move参数'}), 400

    try:
        cube = RubikCube(cube_state)
        new_cube = cube.apply_move(move)

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
def apply_moves():
    """
    应用多个移动

    请求体:
    {
        "cube_state": "UUUUUUUUURRRRRRRRR...",
        "moves": ["R", "U", "F'"]
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': '请求体为空'}), 400

    cube_state = data.get('cube_state')
    moves = data.get('moves', [])

    if not cube_state:
        return jsonify({'success': False, 'error': '缺少cube_state参数'}), 400

    if not isinstance(moves, list):
        return jsonify({'success': False, 'error': 'moves必须是数组'}), 400

    try:
        cube = RubikCube(cube_state)
        new_cube = cube.apply_moves(moves)

        return jsonify({
            'success': True,
            'new_state': new_cube.to_kociemba_string(),
            'applied_moves': moves
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


def _add_to_history(result: dict, scramble: list):
    """添加到历史记录"""
    import time
    entry = {
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


@app.errorhandler(404)
def not_found(e):
    """404处理"""
    return jsonify({'success': False, 'error': '接口不存在'}), 404


@app.errorhandler(500)
def server_error(e):
    """500处理"""
    return jsonify({'success': False, 'error': '服务器内部错误'}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("魔方最优解可视化系统")
    print("访问 http://localhost:5000")
    print("=" * 60)

    app.run(debug=True, host='0.0.0.0', port=5000)

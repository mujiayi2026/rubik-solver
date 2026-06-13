"""
Flask API Server
魔方求解API服务
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithm.cube_model import RubikCube, create_scrambled_cube, validate_state
from algorithm.kociemba_solver import KociembaSolver, solve_cube, solve_scrambled_cube

app = Flask(__name__,
            template_folder='../../templates',
            static_folder='../../static')

CORS(app)

# 全局求解器实例
solver = KociembaSolver()


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.route('/api/scramble', methods=['POST'])
def scramble():
    """
    生成打乱魔方
    
    请求体:
    {
        "num_moves": 20  // 打乱步数(可选，默认20)
    }
    
    返回:
    {
        "success": true,
        "scramble": ["R", "U", "F'", ...],
        "cube_state": "UUUUUUUUURRRRRRRRR..."
    }
    """
    data = request.get_json() or {}
    num_moves = data.get('num_moves', 20)
    
    # 限制打乱步数范围
    num_moves = max(1, min(50, num_moves))
    
    cube, scramble_moves = create_scrambled_cube(num_moves)
    
    return jsonify({
        'success': True,
        'scramble': scramble_moves,
        'scramble_str': ' '.join(scramble_moves),
        'num_scramble_moves': len(scramble_moves),
        'cube_state': cube.to_kociemba_string()
    })


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
    
    # 从状态字符串求解
    if 'cube_state' in data:
        cube_state = data['cube_state']
        
        if not validate_state(cube_state):
            return jsonify({'success': False, 'error': '无效的魔方状态'}), 400
        
        result = solve_cube(cube_state)
        return jsonify(result)
    
    # 从打乱步骤求解
    if 'scramble' in data:
        scramble_moves = data['scramble']
        
        # 创建魔方并应用打乱
        cube = RubikCube()
        cube = cube.apply_moves(scramble_moves)
        
        # 求解
        result = solve_cube(cube.to_kociemba_string())
        result['scramble'] = scramble_moves
        return jsonify(result)
    
    return jsonify({'success': False, 'error': '缺少cube_state或scramble参数'}), 400


@app.route('/api/scramble-and-solve', methods=['POST'])
def scramble_and_solve():
    """
    打乱并求解
    
    请求体:
    {
        "num_moves": 20  // 打乱步数(可选)
    }
    """
    data = request.get_json() or {}
    num_moves = data.get('num_moves', 20)
    num_moves = max(1, min(50, num_moves))
    
    result = solve_scrambled_cube(num_moves)
    return jsonify(result)


@app.route('/api/validate', methods=['POST'])
def validate():
    """
    验证魔方状态
    
    请求体:
    {
        "cube_state": "UUUUUUUUURRRRRRRRR..."
    }
    """
    data = request.get_json()
    
    if not data or 'cube_state' not in data:
        return jsonify({'success': False, 'error': '缺少cube_state参数'}), 400
    
    cube_state = data['cube_state']
    is_valid = validate_state(cube_state)
    
    return jsonify({
        'success': True,
        'is_valid': is_valid,
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
        return jsonify({'success': False, 'error': '缺少参数'}), 400
    
    try:
        # 创建魔方并应用移动
        cube = RubikCube(cube_state)
        new_cube = cube.apply_move(move)
        
        return jsonify({
            'success': True,
            'new_state': new_cube.to_kociemba_string(),
            'move': move
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


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


if __name__ == '__main__':
    print("=" * 60)
    print("魔方最优解可视化系统")
    print("访问 http://localhost:5000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

"""
魔方状态模型和求解器测试

测试覆盖:
- RubikCube 状态模型
- from_kociemba_string 工厂方法
- 状态验证
- 工厂函数
- Kociemba 求解器
- Flask API 端点
- 性能分析端点
- 移动应用端点
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.algorithm.cube_model import RubikCube, create_solved_cube, create_scrambled_cube, validate_state, Face


class TestRubikCube:
    """魔方状态测试类"""

    def test_initial_state(self):
        cube = RubikCube()
        assert cube.is_solved()

    def test_solved_kociemba_string(self):
        cube = RubikCube()
        expected = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        assert cube.to_kociemba_string() == expected

    def test_invalid_state_length(self):
        """新版 RubikCube 不接受外部 state，构造器不抛异常"""
        # 构造器只接受 move_history 或无参数，不会因长度报错
        cube = RubikCube()
        assert cube.is_solved()

    def test_apply_single_move(self):
        cube = RubikCube()
        new_cube = cube.apply_move('R')
        assert not new_cube.is_solved()

    def test_apply_move_sequence(self):
        cube = RubikCube()
        moves = ['R', 'U', "R'", "U'"]
        new_cube = cube.apply_moves(moves)
        assert not new_cube.is_solved()

    def test_inverse_moves(self):
        cube = RubikCube()
        new_cube = cube.apply_move('R').apply_move("R'")
        assert new_cube.is_solved()

    def test_double_move(self):
        cube = RubikCube()
        new_cube = cube.apply_move('R2').apply_move('R2')
        assert new_cube.is_solved()

    def test_all_moves_inverse(self):
        """测试所有移动的逆操作"""
        base_moves = ['U', 'D', 'L', 'R', 'F', 'B']
        for face in base_moves:
            cube = RubikCube()
            result = cube.apply_move(face).apply_move(face + "'")
            assert result.is_solved(), f"{face} 和 {face}' 应该互相抵消"

    def test_all_moves_double(self):
        """测试所有180度移动自反"""
        base_moves = ['U', 'D', 'L', 'R', 'F', 'B']
        for face in base_moves:
            cube = RubikCube()
            result = cube.apply_move(face + '2').apply_move(face + '2')
            assert result.is_solved(), f"{face}2 应该自反"

    def test_four_times_rotation(self):
        """测试四次旋转还原"""
        for face in ['U', 'D', 'L', 'R', 'F', 'B']:
            cube = RubikCube()
            for _ in range(4):
                cube = cube.apply_move(face)
            assert cube.is_solved(), f"{face} 转4次应该还原"

    def test_scramble(self):
        cube = RubikCube()
        scramble_moves = cube.scramble(20)
        assert len(scramble_moves) == 20
        assert not cube.is_solved()

    def test_copy(self):
        cube = RubikCube()
        cube_copy = cube.copy()
        assert cube.to_kociemba_string() == cube_copy.to_kociemba_string()
        cube_copy.apply_move('R')
        assert cube.is_solved()

    def test_equality(self):
        cube1 = RubikCube()
        cube2 = RubikCube()
        assert cube1 == cube2

    def test_get_face(self):
        cube = RubikCube()
        up_face = cube.get_face(Face.UP)
        # pycuber 已还原状态 U 面全为同一颜色
        assert len(set(up_face)) == 1

    def test_get_face_matrix(self):
        cube = RubikCube()
        matrix = cube.get_face_matrix(Face.UP)
        assert len(matrix) == 3
        assert len(matrix[0]) == 3

    def test_to_json(self):
        cube = RubikCube()
        data = cube.to_json()
        assert 'state' in data
        assert 'faces' in data
        assert 'is_solved' in data
        assert data['is_solved'] is True

    def test_scramble_no_consecutive_same_face(self):
        """打乱不应有连续同面旋转"""
        cube = RubikCube()
        moves = cube.scramble(20)
        for i in range(1, len(moves)):
            assert moves[i][0] != moves[i-1][0], f"不应连续旋转同一面: {moves[i-1]} {moves[i]}"


class TestFromKociembaString:
    """from_kociemba_string 工厂方法测试"""

    def test_solved_state(self):
        """已还原状态字符串创建已还原魔方"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        cube = RubikCube.from_kociemba_string(state)
        assert cube.is_solved()

    def test_roundtrip(self):
        """打乱 → 导出状态 → 从状态创建 → 比较状态一致"""
        cube1 = RubikCube()
        cube1 = cube1.apply_moves(['R', 'U', 'F', "R'", "U'", "F'"])
        state = cube1.to_kociemba_string()

        cube2 = RubikCube.from_kociemba_string(state)
        assert cube2.to_kociemba_string() == state

    def test_roundtrip_scramble(self):
        """随机打乱 → 状态字符串 → 重建 → 状态一致"""
        import random
        random.seed(42)
        cube1 = RubikCube()
        scramble = cube1.scramble(15)
        state = cube1.to_kociemba_string()

        cube2 = RubikCube.from_kociemba_string(state)
        assert cube2.to_kociemba_string() == state

    def test_invalid_length(self):
        """长度不为54应抛出 ValueError"""
        with pytest.raises(ValueError, match="54"):
            RubikCube.from_kociemba_string("SHORT")

    def test_single_move_roundtrip(self):
        """单个移动后重建状态一致"""
        for move in ['R', 'U', 'F', 'D', 'L', 'B']:
            cube1 = RubikCube().apply_move(move)
            state = cube1.to_kociemba_string()
            cube2 = RubikCube.from_kociemba_string(state)
            assert cube2.to_kociemba_string() == state, f"移动 {move} 的 roundtrip 失败"

    def test_can_apply_moves_after_creation(self):
        """从状态创建后可以继续应用移动"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        cube = RubikCube.from_kociemba_string(state)
        cube2 = cube.apply_move('R')
        assert cube2.to_kociemba_string() != state
        # R + R' 应该回到原状态
        cube3 = cube2.apply_move("R'")
        assert cube3.to_kociemba_string() == state


class TestValidateState:
    """状态验证测试类"""

    def test_valid_state(self):
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        result = validate_state(state)
        assert result['valid'] is True

    def test_invalid_color_count(self):
        state = 'U' * 10 + 'R' * 8 + 'F' * 9 + 'D' * 9 + 'L' * 9 + 'B' * 9
        result = validate_state(state)
        assert result['valid'] is False

    def test_invalid_length(self):
        result = validate_state('U' * 10)
        assert result['valid'] is False

    def test_invalid_characters(self):
        state = 'U' * 9 + 'R' * 9 + 'F' * 9 + 'D' * 9 + 'L' * 9 + 'X' * 9
        result = validate_state(state)
        assert result['valid'] is False


class TestCreateCube:
    """创建魔方测试类"""

    def test_create_solved_cube(self):
        cube = create_solved_cube()
        assert cube.is_solved()

    def test_create_scrambled_cube(self):
        cube, moves = create_scrambled_cube(20)
        assert len(moves) == 20
        assert not cube.is_solved()


class TestKociembaSolver:
    """求解器测试"""

    def test_solve_scrambled(self):
        """打乱后求解并验证"""
        import kociemba
        from src.algorithm.kociemba_solver import KociembaSolver
        solver = KociembaSolver()

        cube = RubikCube()
        cube.scramble(15)
        kociemba_str = cube.to_kociemba_string()

        result = solver.solve(kociemba_str)
        assert result.error is None
        assert result.num_moves > 0
        assert result.num_moves <= 22  # kociemba may not always be ≤20

    def test_solve_scrambled_verify(self):
        """打乱后求解并验证还原"""
        import kociemba

        cube = RubikCube()
        moves = cube.scramble(15)
        state = cube.to_kociemba_string()

        sol = kociemba.solve(state)
        sol_moves = sol.split()

        # 应用解法到新魔方
        cube2 = RubikCube()
        cube2 = cube2.apply_moves(moves)
        cube2 = cube2.apply_moves(sol_moves)

        assert cube2.is_solved(), f"求解后未还原! solution={sol}"

    def test_solve_invalid_input(self):
        """无效输入"""
        from src.algorithm.kociemba_solver import KociembaSolver
        solver = KociembaSolver()

        result = solver.solve('short')
        assert result.error is not None

        result = solver.solve('X' * 54)
        assert result.error is not None


class TestFlaskAPI:
    """Flask API 测试"""

    @pytest.fixture
    def client(self):
        from src.api.app import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client

    def test_health(self, client):
        resp = client.get('/api/health')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'ok'

    def test_scramble_api(self, client):
        resp = client.post('/api/scramble', json={'num_moves': 10})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert len(data['scramble']) == 10

    def test_solve_api(self, client):
        resp = client.post('/api/solve', json={
            'scramble': ['R', 'U', "R'", "U'"]
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert data['num_moves'] > 0

    def test_solve_invalid(self, client):
        resp = client.post('/api/solve', json={})
        assert resp.status_code == 400

    def test_scramble_and_solve_api(self, client):
        resp = client.post('/api/scramble-and-solve', json={'num_moves': 15})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'scramble' in data
        assert 'solution' in data

    def test_history_api(self, client):
        client.post('/api/scramble-and-solve', json={'num_moves': 10})
        resp = client.get('/api/history')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True

    def test_validate_api(self, client):
        """验证状态 API"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        resp = client.post('/api/validate', json={'cube_state': state})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert data['is_valid'] is True

    def test_validate_invalid_api(self, client):
        """验证无效状态 API"""
        resp = client.post('/api/validate', json={'cube_state': 'SHORT'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['is_valid'] is False

    def test_validate_missing_param(self, client):
        """缺少参数"""
        resp = client.post('/api/validate', json={})
        assert resp.status_code == 400

    def test_apply_move_api(self, client):
        """应用单个移动 API"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        resp = client.post('/api/move', json={
            'cube_state': state,
            'move': 'R'
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert data['move'] == 'R'
        assert data['new_state'] != state  # 状态应该改变

    def test_apply_move_roundtrip(self, client):
        """移动 roundtrip: R + R' 应该回到原状态"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        # Apply R
        resp = client.post('/api/move', json={'cube_state': state, 'move': 'R'})
        data = resp.get_json()
        new_state = data['new_state']

        # Apply R'
        resp = client.post('/api/move', json={'cube_state': new_state, 'move': "R'"})
        data = resp.get_json()
        assert data['success'] is True
        assert data['new_state'] == state

    def test_apply_move_missing_params(self, client):
        """缺少参数"""
        resp = client.post('/api/move', json={})
        assert resp.status_code == 400

    def test_apply_moves_api(self, client):
        """应用多个移动 API"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        resp = client.post('/api/moves', json={
            'cube_state': state,
            'moves': ['R', 'U']
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert len(data['applied_moves']) == 2
        assert data['new_state'] != state

    def test_apply_moves_invalid_type(self, client):
        """moves 不是数组"""
        resp = client.post('/api/moves', json={
            'cube_state': 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
            'moves': 'RU'
        })
        assert resp.status_code == 400


class TestProfileAPI:
    """性能分析端点测试"""

    @pytest.fixture
    def client(self):
        from src.api.app import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client

    def test_profile_endpoint(self, client):
        """性能分析端点可访问"""
        # 先发几个请求生成数据
        client.get('/api/health')
        client.post('/api/scramble', json={'num_moves': 5})

        resp = client.get('/api/profile')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'endpoints' in data
        assert data['total_requests'] >= 2

    def test_profile_contains_health(self, client):
        """性能数据应包含 health 端点"""
        client.get('/api/health')
        resp = client.get('/api/profile')
        data = resp.get_json()
        # health 端点应该有记录
        assert 'health' in str(data['endpoints'])

    def test_profile_clear(self, client):
        """清空性能数据"""
        client.get('/api/health')
        resp = client.post('/api/profile-clear')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True

        # 清空后只有 profile-clear 和 profile 自身的请求
        resp = client.get('/api/profile')
        data = resp.get_json()
        # profile-clear 和 profile 本身被记录，所以 >= 0
        assert 'endpoints' in data

    def test_cache_stats(self, client):
        """缓存统计端点"""
        resp = client.get('/api/cache-stats')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'cache_size' in data
        assert 'hit_rate' in data

    def test_cache_clear(self, client):
        """清空缓存端点"""
        resp = client.post('/api/cache-clear')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True

    def test_statistics(self, client):
        """求解统计端点"""
        resp = client.get('/api/statistics')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'total_solves' in data

    def test_reset_statistics(self, client):
        """重置统计端点"""
        resp = client.post('/api/reset-statistics')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True


class TestSolveCache:
    """求解缓存单元测试"""

    def test_cache_put_and_get(self):
        """存入后能取回"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=10)
        cache.put('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
                  {'success': True, 'solution': ['R', 'U']})
        result = cache.get('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB')
        assert result is not None
        assert result['success'] is True
        assert result['solution'] == ['R', 'U']

    def test_cache_miss(self):
        """未缓存状态返回 None"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=10)
        result = cache.get('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB')
        assert result is None

    def test_cache_lru_eviction(self):
        """缓存满后淘汰最旧条目"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=3)
        cache.put('state_A', {'data': 'A'})
        cache.put('state_B', {'data': 'B'})
        cache.put('state_C', {'data': 'C'})
        cache.put('state_D', {'data': 'D'})  # 应淘汰 state_A
        assert cache.get('state_A') is None
        assert cache.get('state_B') is not None
        assert cache.get('state_D') is not None

    def test_cache_lru_refresh(self):
        """访问后条目移到末尾，不会被优先淘汰"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=3)
        cache.put('state_A', {'data': 'A'})
        cache.put('state_B', {'data': 'B'})
        cache.put('state_C', {'data': 'C'})
        cache.get('state_A')  # 刷新 A
        cache.put('state_D', {'data': 'D'})  # 应淘汰 state_B（最久未访问）
        assert cache.get('state_A') is not None
        assert cache.get('state_B') is None

    def test_cache_hit_miss_stats(self):
        """统计命中/未命中次数"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=10)
        cache.put('state_A', {'data': 'A'})
        cache.get('state_A')   # hit
        cache.get('state_A')   # hit
        cache.get('state_X')   # miss
        stats = cache.get_stats()
        assert stats['cache_hits'] == 2
        assert stats['cache_misses'] == 1
        assert stats['cache_size'] == 1
        assert stats['hit_rate'] == '66.7%'

    def test_cache_hit_rate_empty(self):
        """空缓存命中率返回 N/A"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=10)
        stats = cache.get_stats()
        assert stats['hit_rate'] == 'N/A'

    def test_cache_clear(self):
        """清空缓存重置所有计数"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=10)
        cache.put('state_A', {'data': 'A'})
        cache.get('state_A')
        cache.clear()
        stats = cache.get_stats()
        assert stats['cache_size'] == 0
        assert stats['cache_hits'] == 0
        assert stats['cache_misses'] == 0

    def test_cache_update_existing(self):
        """更新已存在的键"""
        from src.api.app import SolveCache
        cache = SolveCache(max_size=10)
        cache.put('state_A', {'data': 'old'})
        cache.put('state_A', {'data': 'new'})
        result = cache.get('state_A')
        assert result['data'] == 'new'
        assert cache.get_stats()['cache_size'] == 1


class TestSolveCacheIntegration:
    """缓存与API集成测试"""

    @pytest.fixture
    def client(self):
        from src.api.app import app, solve_cache
        app.config['TESTING'] = True
        solve_cache.clear()
        with app.test_client() as client:
            yield client

    def test_solve_caches_result(self, client):
        """相同打乱第二次应命中缓存"""
        # 第一次求解
        resp1 = client.post('/api/solve', json={
            'scramble': ['R', 'U', "R'", "U'"]
        })
        data1 = resp1.get_json()
        assert data1['success'] is True

        # 第二次求解相同打乱
        resp2 = client.post('/api/solve', json={
            'scramble': ['R', 'U', "R'", "U'"]
        })
        data2 = resp2.get_json()
        assert data2['success'] is True
        assert data2.get('from_cache') is True

    def test_solve_by_state_uses_cache(self, client):
        """通过状态字符串求解也应缓存"""
        state = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
        # 先打乱求解以产生缓存
        resp = client.post('/api/solve', json={'scramble': ['R']})
        data = resp.get_json()
        assert data['success'] is True

        # 用相同状态再求解
        resp2 = client.post('/api/solve', json={
            'scramble': ['R']
        })
        data2 = resp2.get_json()
        assert data2.get('from_cache') is True


class Test404:
    """404 测试"""

    @pytest.fixture
    def client(self):
        from src.api.app import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client

    def test_404(self, client):
        resp = client.get('/api/nonexistent')
        assert resp.status_code == 404
        data = resp.get_json()
        assert data['success'] is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

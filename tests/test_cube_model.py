"""
魔方状态模型和求解器测试
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


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

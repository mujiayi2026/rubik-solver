"""
魔方状态模型测试
"""

import pytest
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.algorithm.cube_model import RubikCube, create_solved_cube, create_scrambled_cube, validate_state


class TestRubikCube:
    """魔方状态测试类"""
    
    def test_initial_state(self):
        """测试初始状态"""
        cube = RubikCube()
        assert cube.is_solved()
    
    def test_solved_state_string(self):
        """测试已还原状态字符串"""
        cube = RubikCube()
        expected = 'W' * 9 + 'R' * 9 + 'B' * 9 + 'Y' * 9 + 'O' * 9 + 'G' * 9
        assert ''.join(cube.state) == expected
    
    def test_custom_state(self):
        """测试自定义状态"""
        state = 'W' * 9 + 'R' * 9 + 'B' * 9 + 'Y' * 9 + 'O' * 9 + 'G' * 9
        cube = RubikCube(state)
        assert cube.is_solved()
    
    def test_invalid_state_length(self):
        """测试无效状态长度"""
        with pytest.raises(ValueError):
            RubikCube('W' * 10)  # 长度不对
    
    def test_apply_single_move(self):
        """测试单个移动"""
        cube = RubikCube()
        new_cube = cube.apply_move('R')
        assert not new_cube.is_solved()
    
    def test_apply_move_sequence(self):
        """测试移动序列"""
        cube = RubikCube()
        moves = ['R', 'U', "R'", "U'"]
        new_cube = cube.apply_moves(moves)
        # R U R' U' 是一个标准公式，不会还原魔方
        assert not new_cube.is_solved()
    
    def test_inverse_moves(self):
        """测试逆移动"""
        cube = RubikCube()
        # R 然后 R' 应该还原
        new_cube = cube.apply_move('R').apply_move("R'")
        assert new_cube.is_solved()
    
    def test_double_move(self):
        """测试180度移动"""
        cube = RubikCube()
        # R2 然后 R2 应该还原
        new_cube = cube.apply_move('R2').apply_move('R2')
        assert new_cube.is_solved()
    
    def test_scramble(self):
        """测试打乱"""
        cube = RubikCube()
        scramble_moves = cube.scramble(20)
        assert len(scramble_moves) == 20
        assert not cube.is_solved()
    
    def test_copy(self):
        """测试复制"""
        cube = RubikCube()
        cube_copy = cube.copy()
        assert cube.state == cube_copy.state
        
        # 修改副本不影响原版
        cube_copy.apply_move('R')
        assert cube.is_solved()
    
    def test_to_kociemba_string(self):
        """测试转换为Kociemba格式"""
        cube = RubikCube()
        kociemba_str = cube.to_kociemba_string()
        assert len(kociemba_str) == 54
        assert kociemba_str == 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
    
    def test_get_face(self):
        """测试获取面状态"""
        cube = RubikCube()
        from src.algorithm.cube_model import Face
        up_face = cube.get_face(Face.UP)
        assert all(c == 'W' for c in up_face)
    
    def test_get_face_matrix(self):
        """测试获取面矩阵"""
        cube = RubikCube()
        from src.algorithm.cube_model import Face
        matrix = cube.get_face_matrix(Face.UP)
        assert matrix.shape == (3, 3)
        assert all(c == 'W' for c in matrix.flatten())


class TestValidateState:
    """状态验证测试类"""
    
    def test_valid_state(self):
        """测试有效状态"""
        state = 'W' * 9 + 'R' * 9 + 'B' * 9 + 'Y' * 9 + 'O' * 9 + 'G' * 9
        assert validate_state(state) == True
    
    def test_invalid_color_count(self):
        """测试无效颜色数量"""
        state = 'W' * 10 + 'R' * 8 + 'B' * 9 + 'Y' * 9 + 'O' * 9 + 'G' * 9
        assert validate_state(state) == False
    
    def test_invalid_length(self):
        """测试无效长度"""
        assert validate_state('W' * 10) == False
    
    def test_invalid_characters(self):
        """测试无效字符"""
        state = 'W' * 9 + 'R' * 9 + 'B' * 9 + 'Y' * 9 + 'O' * 9 + 'X' * 9
        assert validate_state(state) == False


class TestCreateCube:
    """创建魔方测试类"""
    
    def test_create_solved_cube(self):
        """测试创建已还原魔方"""
        cube = create_solved_cube()
        assert cube.is_solved()
    
    def test_create_scrambled_cube(self):
        """测试创建打乱魔方"""
        cube, moves = create_scrambled_cube(20)
        assert len(moves) == 20
        assert not cube.is_solved()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

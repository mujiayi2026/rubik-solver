#!/usr/bin/env python3
"""
魔方最优解可视化系统启动脚本
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.api.app import app


def main():
    """主函数"""
    print("=" * 60)
    print("🎲 魔方最优解可视化系统")
    print("=" * 60)
    print("\n正在启动服务...")
    print("\n访问地址: http://localhost:5000")
    print("\n按 Ctrl+C 停止服务")
    print("=" * 60)
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000
    )


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
魔方最优解可视化系统启动脚本

支持两种模式:
  - 开发模式: python run.py
  - 生产模式: gunicorn --bind 0.0.0.0:5000 --workers 2 src.api.app:app
  - Docker:   docker compose up -d
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.api.app import app


def main():
    """主函数 - 开发模式启动"""
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') != 'production'

    print("=" * 60)
    print("🎲 魔方最优解可视化系统")
    print("=" * 60)
    print(f"\n模式: {'开发' if debug else '生产'}")
    print(f"端口: {port}")
    print(f"\n访问地址: http://localhost:{port}")
    print("\n按 Ctrl+C 停止服务")
    print("=" * 60)

    app.run(
        debug=debug,
        host='0.0.0.0',
        port=port
    )


if __name__ == '__main__':
    main()

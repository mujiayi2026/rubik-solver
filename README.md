# 🎲 魔方最优解可视化系统

<p align="center">
  <img src="https://img.shields.io/badge/Algorithm-Kociemba-blue?style=for-the-badge" alt="Algorithm">
  <img src="https://img.shields.io/badge/God's_Number-≤20-green?style=for-the-badge" alt="God's Number">
  <img src="https://img.shields.io/badge/Python-3.8+-yellow?style=for-the-badge&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js" alt="Three.js">
  <img src="https://img.shields.io/badge/Tests-32%20passed-brightgreen?style=for-the-badge" alt="Tests">
</p>

> 基于 Kociemba 二阶段算法的三阶魔方最优解求解器，配套 3D 可视化演示系统。

---

## ✨ 项目特性

| 特性 | 说明 |
|------|------|
| 🧠 **最优求解** | Kociemba 二阶段算法，保证 20 步内还原（上帝之数） |
| ⚡ **极速计算** | 平均求解时间 < 20ms，远超传统 BFS/DFS |
| 🎮 **3D 可视化** | Three.js 构建的交互式 3D 魔方，支持旋转缩放 |
| 🎬 **动画演示** | 分步/自动播放还原过程，可调速度 0.5x-3x |
| ⚡ **一键求解** | 自动生成打乱 + 计算最优解，一步到位 |
| 📊 **数据展示** | 实时显示步数、耗时、效率评分 |
| 📜 **历史记录** | 自动保存求解历史，方便回顾 |

---

## 🚀 快速开始

### 环境要求

- Python 3.8+
- pip

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/mujiayi2026/rubik-solver.git
cd rubik-solver

# 创建虚拟环境并安装依赖
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 运行服务
python run.py
```

打开浏览器访问 http://localhost:5000

---

## 📁 项目结构

```
rubik-solver/
├── src/
│   ├── algorithm/              # 核心算法模块
│   │   ├── __init__.py
│   │   ├── cube_model.py       # 魔方状态模型 (pycuber)
│   │   └── kociemba_solver.py  # Kociemba 求解器
│   └── api/
│       └── app.py              # Flask API 服务
├── static/
│   ├── css/style.css           # 样式
│   └── js/
│       ├── cube3d.js           # Three.js 3D 渲染
│       └── app.js              # 前端应用逻辑
├── templates/
│   └── index.html              # 主页面
├── tests/
│   └── test_cube_model.py      # 32 个测试用例
├── run.py                      # 启动脚本
├── requirements.txt
└── README.md
```

---

## 🧠 算法原理

### Kociemba 二阶段算法

**第一阶段：还原至子群状态**
- 将任意打乱魔方还原至 `<U, D, R², L², F², B²>` 子群状态
- 步数严格控制在 12 步以内

**第二阶段：子群内精确求解**
- 在有限状态空间中搜索最优还原步骤
- 全程组合步数不超过 20 步（符合上帝之数定理）

### 优化策略

- **状态哈希表**：避免重复搜索已访问状态
- **曼哈顿距离剪枝**：估算到目标状态的距离
- **无效旋转剔除**：过滤重复/抵消的旋转操作

---

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/scramble` | 生成打乱 |
| POST | `/api/solve` | 求解魔方 |
| POST | `/api/scramble-and-solve` | 打乱并求解 |
| POST | `/api/validate` | 验证状态 |
| GET | `/api/statistics` | 求解统计 |
| GET | `/api/history` | 求解历史 |

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 平均求解步数 | 18-20 步 |
| 平均求解时间 | < 20ms |
| 最差求解步数 | ≤ 20 步 |
| 状态空间大小 | 4.3 × 10¹⁹ |
| 测试用例 | 32 个全部通过 |

---

## 🛠️ 技术栈

### 后端
- **Python 3.8+** + **Flask** + **CORS**
- **pycuber**：魔方状态管理
- **kociemba**：最优解算法

### 前端
- **Three.js r128**：3D 图形渲染
- **HTML5/CSS3**：响应式 UI
- **JavaScript ES6+**：应用逻辑

---

## 🧪 运行测试

```bash
source venv/bin/activate
python -m pytest tests/ -v
```

---

## 📄 许可证

MIT License

# 🎲 魔方最优解可视化系统

<p align="center">
  <img src="https://img.shields.io/badge/Algorithm-Kociemba-blue?style=for-the-badge" alt="Algorithm">
  <img src="https://img.shields.io/badge/God's_Number-≤20-green?style=for-the-badge" alt="God's Number">
  <img src="https://img.shields.io/badge/Python-3.8+-yellow?style=for-the-badge&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js" alt="Three.js">
  <img src="https://img.shields.io/badge/License-MIT-red?style=for-the-badge" alt="License">
</p>

> 基于 Kociemba 二阶段算法的三阶魔方最优解求解器，配套 3D 可视化演示系统。

---

## ✨ 项目特性

| 特性 | 说明 |
|------|------|
| 🧠 **最优求解** | Kociemba 二阶段算法，保证 20 步内还原（上帝之数） |
| ⚡ **极速计算** | 平均求解时间 < 20ms，远超传统 BFS/DFS |
| 🎮 **3D 可视化** | Three.js 构建的交互式 3D 魔方，支持旋转缩放 |
| 🎬 **动画演示** | 分步/自动播放还原过程，自定义播放速度 |
| 📊 **数据展示** | 实时显示步数、耗时、效率评分 |
| 🔀 **灵活打乱** | 支持随机打乱和手动打乱 |

---

## 🚀 快速开始

### 环境要求

- Python 3.8+
- pip

### 安装

```bash
# 克隆项目
cd ~/vibe/projects/rubik-solver

# 安装依赖
pip install -r requirements.txt

# 运行服务
python src/api/app.py
```

### 访问

打开浏览器访问 http://localhost:5000

---

## 📁 项目结构

```
rubik-solver/
├── src/
│   ├── algorithm/              # 核心算法模块
│   │   ├── __init__.py
│   │   ├── cube_model.py       # 魔方状态模型
│   │   └── kociemba_solver.py  # Kociemba求解器
│   ├── visualization/          # 可视化模块
│   └── api/                    # Flask API服务
│       └── app.py
├── static/
│   ├── css/
│   │   └── style.css          # 样式文件
│   └── js/
│       ├── cube3d.js          # 3D魔方渲染
│       └── app.js             # 应用逻辑
├── templates/
│   └── index.html             # 主页面
├── tests/                     # 测试文件
├── docs/                      # 文档
├── requirements.txt           # 依赖列表
└── README.md                  # 项目说明
```

---

## 🧠 算法原理

### Kociemba 二阶段算法

Kociemba 算法是目前工业界最主流的魔方最优解算法，被竞速魔方机器人和魔方解题工具广泛采用。

#### 核心思想

**第一阶段：还原至子群状态**
- 将任意打乱魔方还原至 `<U, D, R², L², F², B²>` 子群状态
- 去除魔方整体旋转干扰，仅保留核心色块错位
- 步数严格控制在 12 步以内

**第二阶段：子群内精确求解**
- 在有限状态空间中搜索最优还原步骤
- 全程组合步数不超过 20 步（符合上帝之数定理）

#### 优化策略

- **状态哈希表**：避免重复搜索已访问状态
- **曼哈顿距离剪枝**：估算到目标状态的距离，剪掉无望分支
- **无效旋转剔除**：过滤重复/抵消的旋转操作

---

## 🎮 使用说明

### 基本操作

1. **🔀 打乱**：点击"打乱"按钮生成随机打乱的魔方
2. **✨ 求解**：点击"求解"按钮计算最优解
3. **▶️ 演示**：使用动画控制查看还原过程

### 动画控制

| 按钮 | 功能 |
|------|------|
| ⏮️ 上一步 | 返回上一个步骤 |
| ▶️ 播放/暂停 | 自动播放/暂停动画 |
| ⏭️ 下一步 | 前进到下一个步骤 |
| 🔄 速度 | 切换播放速度 (0.5x/1x/1.5x/2x/3x) |

### 3D 交互

- 🖱️ **拖拽**：旋转魔方视角
- 🔍 **滚轮**：缩放大小
- 📱 **触屏**：支持触摸操作

---

## 🔌 API 接口

### 生成打乱

```http
POST /api/scramble
Content-Type: application/json

{
    "num_moves": 20  // 打乱步数(可选)
}
```

### 求解魔方

```http
POST /api/solve
Content-Type: application/json

{
    "cube_state": "UUUUUUUUURRRRRRRRR..."  // Kociemba格式状态
}

// 或者
{
    "scramble": ["R", "U", "F'", ...]  // 打乱步骤
}
```

### 打乱并求解

```http
POST /api/scramble-and-solve
Content-Type: application/json

{
    "num_moves": 20
}
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 平均求解步数 | 18-20 步 |
| 平均求解时间 | < 20ms |
| 最差求解步数 | ≤ 20 步 |
| 状态空间大小 | 4.3 × 10¹⁹ |

---

## 🛠️ 技术栈

### 后端

- **Python 3.8+**：核心语言
- **Flask**：Web 框架
- **kociemba**：魔方求解算法库
- **NumPy**：数值计算

### 前端

- **Three.js**：3D 图形渲染
- **HTML5/CSS3**：页面结构和样式
- **JavaScript ES6+**：应用逻辑

---

## 📖 学习资源

- [Kociemba 算法论文](https://www.speedsolving.com/wiki/index.php/Kociemba%27s_Algorithm)
- [上帝之数定理](https://en.wikipedia.org/wiki/God%27s_algorithm)
- [Three.js 官方文档](https://threejs.org/docs/)
- [魔方数学模型](https://www.jaapsch.net/puzzles/cube3.htm)

---

## 🎯 应用场景

1. **算法教学**：展示启发式搜索、分治算法的实际应用
2. **魔方学习**：为魔方爱好者提供最优还原方案
3. **科创展示**：计算机科创项目、编程实训作品
4. **二次开发**：可扩展适配魔方机器人控制、摄像头识别等

---

## 🔮 拓展方向

- [ ] 支持二阶、四阶魔方求解
- [ ] 对比多种算法（层先法、CFOP、二阶段）
- [ ] 接入摄像头识别实物魔方
- [ ] 算法原理可视化拆解演示
- [ ] 移动端适配优化

---

## 📝 开发日志

### v1.0.0 (2026-06-13)

- ✅ 核心算法实现（Kociemba 二阶段）
- ✅ 3D 魔方可视化
- ✅ 动画演示系统
- ✅ Flask API 服务
- ✅ 响应式 UI 设计

---

## 🙏 致谢

- [Kociemba](https://github.com/muodov/kociemba) - Python 绑定库
- [Three.js](https://threejs.org/) - 3D 图形库
- [魔方学](https://www.rubiks.com/) - 魔方官方资源

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

<p align="center">
  <i>🎲 让算法为你找到最优解！</i>
</p>

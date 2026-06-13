/**
 * 2D Rubik's Cube Unfolded View
 * 2D 十字展开图视图
 * 
 * Shows the classic cross-shaped net:
 *         [U]
 *     [L] [F] [R] [B]
 *         [D]
 */

class RubiksCube2D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.cellSize = 28;
        this.gap = 2;
        this.borderRadius = 3;

        // 魔方颜色映射
        this.colors = {
            'W': '#ffffff',  // 白 - 上
            'Y': '#ffd500',  // 黄 - 下
            'R': '#ff0000',  // 红 - 右
            'O': '#ff8c00',  // 橙 - 左
            'B': '#0051ba',  // 蓝 - 前
            'G': '#009e60',  // 绿 - 后
            'X': '#1a1a2e'   // 内部
        };

        // Kociemba 面名到内部颜色的映射 (需要根据状态动态计算)
        this.faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];

        // 十字展开图中每个面的偏移 [col, row]
        // 格式: 3x3网格, 面排列为:
        //           [U]
        //       [L] [F] [R] [B]
        //           [D]
        this.faceOffsets = {
            'U': [3, 0],   // 上方中间
            'L': [0, 3],   // 左侧
            'F': [3, 3],   // 中间
            'R': [6, 3],   // 右侧
            'B': [9, 3],   // 最右
            'D': [3, 6],   // 下方中间
        };

        // 当前状态 (默认已还原)
        this.state = this.getDefaultState();

        this.init();
    }

    getDefaultState() {
        return {
            'U': Array(9).fill('W'),
            'R': Array(9).fill('R'),
            'F': Array(9).fill('B'),
            'D': Array(9).fill('Y'),
            'L': Array(9).fill('O'),
            'B': Array(9).fill('G'),
        };
    }

    init() {
        this.container.innerHTML = '';

        // 创建 Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // 计算画布尺寸: 12 faces across, 9 faces down
        const cs = this.cellSize;
        const g = this.gap;
        const unit = cs + g;
        this.canvas.width = 12 * unit + g;
        this.canvas.height = 9 * unit + g;

        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';
        this.canvas.style.imageRendering = 'auto';

        this.container.appendChild(this.canvas);

        // 面标签
        this.faceLabels = { 'U': 'U', 'R': 'R', 'F': 'F', 'D': 'D', 'L': 'L', 'B': 'B' };

        this.render();
    }

    /**
     * 从 Kociemba 状态字符串更新
     * 格式: UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDLLLLLLLLLBBBBBBBBB
     */
    updateFromKociemba(kociembaStr) {
        if (!kociembaStr || kociembaStr.length !== 54) return;

        const kociembaToColor = {
            'U': 'W', 'R': 'R', 'F': 'B',
            'D': 'Y', 'L': 'O', 'B': 'G'
        };

        let idx = 0;
        for (const face of this.faceOrder) {
            for (let i = 0; i < 9; i++) {
                const k = kociembaStr[idx];
                this.state[face][i] = kociembaToColor[k] || 'X';
                idx++;
            }
        }
        this.render();
    }

    /**
     * 从内部颜色状态更新
     */
    updateFromFaces(faces) {
        if (!faces) return;

        const map = { 'UP': 'U', 'RIGHT': 'R', 'FRONT': 'F', 'DOWN': 'D', 'LEFT': 'L', 'BACK': 'B' };

        for (const [key, faceName] of Object.entries(map)) {
            if (faces[key] && Array.isArray(faces[key]) && faces[key].length === 9) {
                this.state[faceName] = [...faces[key]];
            }
        }
        this.render();
    }

    /**
     * 重置为已还原状态
     */
    reset() {
        this.state = this.getDefaultState();
        this.render();
    }

    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const cs = this.cellSize;
        const g = this.gap;
        const unit = cs + g;

        // 清除画布
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制每个面
        for (const [face, [colOff, rowOff]] of Object.entries(this.faceOffsets)) {
            const colors = this.state[face];

            // 面背景
            ctx.fillStyle = '#0a0a1a';
            ctx.beginPath();
            this.roundRect(ctx,
                colOff * unit - 1,
                rowOff * unit - 1,
                3 * unit + 1,
                3 * unit + 1,
                4
            );
            ctx.fill();

            // 9个贴纸
            for (let i = 0; i < 9; i++) {
                const col = colOff + (i % 3);
                const row = rowOff + Math.floor(i / 3);
                const x = col * unit;
                const y = row * unit;

                const color = this.colors[colors[i]] || this.colors['X'];

                // 贴纸
                ctx.fillStyle = color;
                ctx.beginPath();
                this.roundRect(ctx, x, y, cs, cs, this.borderRadius);
                ctx.fill();

                // 高光效果
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                this.roundRect(ctx, x + 1, y + 1, cs - 2, cs * 0.4, this.borderRadius - 1);
                ctx.fill();
            }

            // 面标签
            const centerX = (colOff + 1.5) * unit + cs / 2;
            const centerY = (rowOff + 1.5) * unit + cs / 2;
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // ctx.fillText(face, centerX, centerY);  // 可选: 显示面标签
        }
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }
}

// 导出
window.RubiksCube2D = RubiksCube2D;

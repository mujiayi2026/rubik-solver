/**
 * Main Application Logic
 * 主应用逻辑 - 魔方最优解可视化
 */

class RubikApp {
    constructor() {
        this.cube = null;
        this.currentScramble = [];
        this.currentSolution = [];
        this.isPlaying = false;
        this.playSpeed = 1;
        this.currentStep = 0;
        this.isBusy = false;

        this.init();
    }

    init() {
        // 初始化3D魔方
        this.cube = new RubiksCube3D('cube-canvas');
        this.bindEvents();
        this.loadHistory();
        console.log('✅ 魔方最优解可视化系统已初始化');
    }

    bindEvents() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bind('btn-reset', () => this.reset());
        bind('btn-scramble', () => this.scramble());
        bind('btn-solve', () => this.solve());
        bind('btn-auto', () => this.autoScrambleAndSolve());
        bind('btn-prev', () => this.prevStep());
        bind('btn-play', () => this.togglePlay());
        bind('btn-next', () => this.nextStep());
        bind('btn-speed', () => this.toggleSpeed());
    }

    // ========== 核心操作 ==========

    async scramble() {
        if (this.isBusy) return;
        this.isBusy = true;
        this.setButtonsEnabled(false);
        this.showLoading('正在生成打乱...');

        try {
            const res = await fetch('/api/scramble', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ num_moves: 20 })
            });
            const data = await res.json();

            if (data.success) {
                this.currentScramble = data.scramble;
                this.currentSolution = [];
                this.currentStep = 0;

                this.displayScramble(data);

                this.cube.reset();
                await this.cube.applyMoves(data.scramble, 2);

                document.getElementById('animation-controls').style.display = 'none';
                this.updateResult('🔀 打乱完成，点击「求解」计算最优解');
            } else {
                this.showError('打乱失败: ' + data.error);
            }
        } catch (err) {
            this.showError('请求失败: ' + err.message);
        } finally {
            this.isBusy = false;
            this.setButtonsEnabled(true);
        }
    }

    async solve() {
        if (this.isBusy) return;

        if (this.currentScramble.length === 0) {
            this.showError('请先点击「打乱」生成魔方状态，或使用「一键求解」');
            return;
        }

        this.isBusy = true;
        this.setButtonsEnabled(false);
        this.showLoading('🧠 正在计算最优解...');

        try {
            const res = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scramble: this.currentScramble })
            });
            const data = await res.json();

            if (data.success) {
                this.currentSolution = data.solution;
                this.currentStep = 0;
                this.displaySolution(data);
                document.getElementById('animation-controls').style.display = 'block';
                this.updateStepDisplay();
                this.updateStats(data);
                this.updateResult(`✅ 最优解找到！${data.num_moves} 步，耗时 ${data.solve_time_ms}ms`);
                this.loadHistory();
            } else {
                this.showError('求解失败: ' + data.error);
            }
        } catch (err) {
            this.showError('请求失败: ' + err.message);
        } finally {
            this.isBusy = false;
            this.setButtonsEnabled(true);
        }
    }

    async autoScrambleAndSolve() {
        if (this.isBusy) return;
        this.isBusy = true;
        this.setButtonsEnabled(false);
        this.showLoading('⚡ 一键求解中...');

        try {
            const res = await fetch('/api/scramble-and-solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ num_moves: 20 })
            });
            const data = await res.json();

            if (data.success) {
                this.currentScramble = data.scramble || [];
                this.currentSolution = data.solution;
                this.currentStep = 0;

                // 显示打乱信息
                if (data.scramble) {
                    this.displayScramble({
                        scramble: data.scramble,
                        num_scramble_moves: data.scramble.length
                    });
                }

                // 显示解法
                this.displaySolution(data);
                this.updateStats(data);

                // 先演示打乱
                this.cube.reset();
                if (data.scramble && data.scramble.length > 0) {
                    await this.cube.applyMoves(data.scramble, 2);
                }

                // 显示动画控制
                document.getElementById('animation-controls').style.display = 'block';
                this.updateStepDisplay();

                this.updateResult(`✅ 一键求解完成！${data.num_moves} 步，耗时 ${data.solve_time_ms}ms`);
                this.loadHistory();
            } else {
                this.showError('一键求解失败: ' + data.error);
            }
        } catch (err) {
            this.showError('请求失败: ' + err.message);
        } finally {
            this.isBusy = false;
            this.setButtonsEnabled(true);
        }
    }

    // ========== 动画控制 ==========

    async prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            await this.resetToStep(this.currentStep);
            this.updateStepDisplay();
            this.highlightCurrentMove();
        }
    }

    async nextStep() {
        if (this.currentStep < this.currentSolution.length) {
            const move = this.currentSolution[this.currentStep];
            await this.cube.applyMove(move, 300 / this.playSpeed);
            this.currentStep++;
            this.updateStepDisplay();
            this.highlightCurrentMove();
        }
    }

    async togglePlay() {
        const btn = document.getElementById('btn-play');

        if (this.isPlaying) {
            this.isPlaying = false;
            btn.textContent = '▶ 播放';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        } else {
            this.isPlaying = true;
            btn.textContent = '⏸ 暂停';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            await this.playAnimation();
        }
    }

    async playAnimation() {
        while (this.isPlaying && this.currentStep < this.currentSolution.length) {
            await this.nextStep();
            await this.delay(300 / this.playSpeed);
        }

        if (this.currentStep >= this.currentSolution.length) {
            this.isPlaying = false;
            const btn = document.getElementById('btn-play');
            btn.textContent = '▶ 播放';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        }
    }

    toggleSpeed() {
        const speeds = [0.5, 1, 1.5, 2, 3];
        const currentIndex = speeds.indexOf(this.playSpeed);
        this.playSpeed = speeds[(currentIndex + 1) % speeds.length];
        document.getElementById('btn-speed').textContent = this.playSpeed + 'x';
    }

    async resetToStep(step) {
        this.cube.reset();
        await this.cube.applyMoves(this.currentScramble, 2);
        const movesToApply = this.currentSolution.slice(0, step);
        for (const move of movesToApply) {
            await this.cube.applyMove(move, 50);
        }
    }

    // ========== UI 更新 ==========

    displayScramble(data) {
        const panel = document.getElementById('scramble-panel');
        const movesDisplay = document.getElementById('scramble-moves');
        const countDisplay = document.getElementById('scramble-count');

        panel.style.display = 'block';
        movesDisplay.innerHTML = (data.scramble || []).map(move =>
            `<span class="move-tag scramble-move">${move}</span>`
        ).join('');
        countDisplay.textContent = data.num_scramble_moves || data.scramble?.length || 0;
    }

    displaySolution(data) {
        const panel = document.getElementById('solution-panel');
        const movesDisplay = document.getElementById('solution-moves');
        const countDisplay = document.getElementById('solution-count');
        const timeDisplay = document.getElementById('solve-time');

        panel.style.display = 'block';
        movesDisplay.innerHTML = data.solution.map((move, index) =>
            `<span class="move-tag" id="move-${index}">${move}</span>`
        ).join('');
        countDisplay.textContent = data.num_moves;
        timeDisplay.textContent = data.solve_time_ms;
    }

    updateStats(data) {
        document.getElementById('stat-moves').textContent = data.num_moves;
        document.getElementById('stat-time').textContent = data.solve_time_ms;
        const efficiency = data.efficiency_score || (data.is_optimal ? '最优' : '非最优');
        document.getElementById('stat-efficiency').textContent = efficiency;
    }

    updateResult(message) {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML =
            `<div style="text-align: center; color: var(--success); font-weight: 600; font-size: 1rem;">${message}</div>`;
    }

    showError(message) {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML =
            `<div style="text-align: center; color: var(--danger); font-size: 0.95rem;">⚠️ ${message}</div>`;
    }

    showLoading(message = '加载中...') {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML =
            `<div style="text-align: center;"><div class="loading"></div><br><span style="color: var(--text-gray);">${message}</span></div>`;
    }

    setButtonsEnabled(enabled) {
        ['btn-reset', 'btn-scramble', 'btn-solve', 'btn-auto'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
    }

    updateStepDisplay() {
        const curEl = document.getElementById('current-step');
        const totalEl = document.getElementById('total-steps');
        if (curEl) curEl.textContent = this.currentStep;
        if (totalEl) totalEl.textContent = this.currentSolution.length;

        const progress = this.currentSolution.length > 0
            ? (this.currentStep / this.currentSolution.length) * 100
            : 0;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = progress + '%';
    }

    highlightCurrentMove() {
        document.querySelectorAll('.move-tag').forEach(tag => tag.classList.remove('active'));

        if (this.currentStep > 0 && this.currentStep <= this.currentSolution.length) {
            const currentTag = document.getElementById(`move-${this.currentStep - 1}`);
            if (currentTag) {
                currentTag.classList.add('active');
                currentTag.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }

    async loadHistory() {
        try {
            const res = await fetch('/api/history?limit=10');
            const data = await res.json();
            if (data.success && data.history.length > 0) {
                const container = document.getElementById('history-list');
                container.innerHTML = data.history.map((h, i) => {
                    const time = new Date(h.timestamp * 1000).toLocaleTimeString('zh-CN');
                    return `<div class="history-item">
                        <span class="history-num">${h.num_moves}步</span>
                        <span class="history-time">${h.solve_time_ms}ms</span>
                        <span class="history-eff">${h.efficiency_score || ''}</span>
                        <span class="history-clock">${time}</span>
                    </div>`;
                }).join('');
            }
        } catch (e) {
            // 静默失败
        }
    }

    // ========== 重置 ==========

    reset() {
        this.currentScramble = [];
        this.currentSolution = [];
        this.currentStep = 0;
        this.isPlaying = false;

        this.cube.reset();

        document.getElementById('scramble-panel').style.display = 'none';
        document.getElementById('solution-panel').style.display = 'none';
        document.getElementById('animation-controls').style.display = 'none';

        this.updateResult('点击「打乱」后点击「求解」，或直接点击「一键求解」');

        document.getElementById('stat-moves').textContent = '-';
        document.getElementById('stat-time').textContent = '-';
        document.getElementById('stat-efficiency').textContent = '-';

        const btn = document.getElementById('btn-play');
        if (btn) {
            btn.textContent = '▶ 播放';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        }

        this.setButtonsEnabled(true);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RubikApp();
});

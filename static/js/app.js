/**
 * Main Application Logic
 * 主应用逻辑
 */

class RubikApp {
    constructor() {
        this.cube = null;
        this.currentScramble = [];
        this.currentSolution = [];
        this.isPlaying = false;
        this.playSpeed = 1;
        this.currentStep = 0;
        
        this.init();
    }
    
    init() {
        // 初始化3D魔方
        this.cube = new RubiksCube3D('cube-canvas');
        
        // 绑定按钮事件
        this.bindEvents();
        
        console.log('魔方最优解可视化系统已初始化');
    }
    
    bindEvents() {
        // 重置按钮
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.reset();
        });
        
        // 打乱按钮
        document.getElementById('btn-scramble').addEventListener('click', () => {
            this.scramble();
        });
        
        // 求解按钮
        document.getElementById('btn-solve').addEventListener('click', () => {
            this.solve();
        });
        
        // 动画控制按钮
        document.getElementById('btn-prev').addEventListener('click', () => {
            this.prevStep();
        });
        
        document.getElementById('btn-play').addEventListener('click', () => {
            this.togglePlay();
        });
        
        document.getElementById('btn-next').addEventListener('click', () => {
            this.nextStep();
        });
        
        document.getElementById('btn-speed').addEventListener('click', () => {
            this.toggleSpeed();
        });
    }
    
    async scramble() {
        // 禁用按钮
        this.setButtonsEnabled(false);
        this.showLoading('正在生成打乱...');
        
        try {
            const response = await fetch('/api/scramble', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ num_moves: 20 })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentScramble = data.scramble;
                
                // 显示打乱信息
                this.displayScramble(data);
                
                // 重置魔方并应用打乱
                this.cube.reset();
                await this.cube.applyMoves(data.scramble, 2);
                
                // 隐藏动画控制
                document.getElementById('animation-controls').style.display = 'none';
                
                this.updateResult('打乱完成，点击"求解"计算最优解');
            } else {
                this.showError('打乱失败: ' + data.error);
            }
        } catch (error) {
            this.showError('请求失败: ' + error.message);
        } finally {
            this.setButtonsEnabled(true);
            this.hideLoading();
        }
    }
    
    async solve() {
        if (this.currentScramble.length === 0) {
            this.showError('请先点击"打乱"生成魔方状态');
            return;
        }
        
        this.setButtonsEnabled(false);
        this.showLoading('正在计算最优解...');
        
        try {
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scramble: this.currentScramble })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentSolution = data.solution;
                this.currentStep = 0;
                
                // 显示解法信息
                this.displaySolution(data);
                
                // 显示动画控制
                document.getElementById('animation-controls').style.display = 'block';
                this.updateStepDisplay();
                
                // 更新统计
                this.updateStats(data);
                
                this.updateResult(`求解完成！最优解 ${data.num_moves} 步`);
            } else {
                this.showError('求解失败: ' + data.error);
            }
        } catch (error) {
            this.showError('请求失败: ' + error.message);
        } finally {
            this.setButtonsEnabled(true);
            this.hideLoading();
        }
    }
    
    displayScramble(data) {
        const panel = document.getElementById('scramble-panel');
        const movesDisplay = document.getElementById('scramble-moves');
        const countDisplay = document.getElementById('scramble-count');
        
        panel.style.display = 'block';
        
        movesDisplay.innerHTML = data.scramble.map(move => 
            `<span class="move-tag">${move}</span>`
        ).join('');
        
        countDisplay.textContent = data.num_scramble_moves;
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
        document.getElementById('stat-efficiency').textContent = data.is_optimal ? '最优' : '非最优';
    }
    
    updateResult(message) {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML = 
            `<div style="text-align: center; color: var(--success); font-weight: 600;">${message}</div>`;
    }
    
    showError(message) {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML = 
            `<div style="text-align: center; color: var(--danger);">${message}</div>`;
    }
    
    showLoading(message = '加载中...') {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML = 
            `<div style="text-align: center;"><div class="loading"></div><br>${message}</div>`;
    }
    
    hideLoading() {
        // 由其他方法替换内容
    }
    
    setButtonsEnabled(enabled) {
        document.getElementById('btn-reset').disabled = !enabled;
        document.getElementById('btn-scramble').disabled = !enabled;
        document.getElementById('btn-solve').disabled = !enabled;
    }
    
    async prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            // 重置到当前步骤
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
            btn.textContent = '播放';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        } else {
            this.isPlaying = true;
            btn.textContent = '暂停';
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
            btn.textContent = '播放';
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
        // 重置魔方并重新应用到指定步骤
        this.cube.reset();
        await this.cube.applyMoves(this.currentScramble, 2);
        
        // 应用解法到当前步骤
        const movesToApply = this.currentSolution.slice(0, step);
        for (const move of movesToApply) {
            await this.cube.applyMove(move, 50);
        }
    }
    
    updateStepDisplay() {
        document.getElementById('current-step').textContent = this.currentStep;
        document.getElementById('total-steps').textContent = this.currentSolution.length;
        
        // 更新进度条
        const progress = this.currentSolution.length > 0 
            ? (this.currentStep / this.currentSolution.length) * 100 
            : 0;
        document.getElementById('progress-fill').style.width = progress + '%';
    }
    
    highlightCurrentMove() {
        // 移除所有高亮
        document.querySelectorAll('.move-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        
        // 高亮当前步骤
        if (this.currentStep > 0 && this.currentStep <= this.currentSolution.length) {
            const currentTag = document.getElementById(`move-${this.currentStep - 1}`);
            if (currentTag) {
                currentTag.classList.add('active');
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    reset() {
        this.currentScramble = [];
        this.currentSolution = [];
        this.currentStep = 0;
        this.isPlaying = false;
        
        this.cube.reset();
        
        // 重置UI
        document.getElementById('scramble-panel').style.display = 'none';
        document.getElementById('solution-panel').style.display = 'none';
        document.getElementById('animation-controls').style.display = 'none';
        
        this.updateResult('点击"打乱"后点击"求解"开始');
        
        document.getElementById('stat-moves').textContent = '-';
        document.getElementById('stat-time').textContent = '-';
        document.getElementById('stat-efficiency').textContent = '-';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RubikApp();
});

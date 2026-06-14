/**
 * Main Application Logic
 * 主应用逻辑 - 魔方最优解可视化
 * v9.0 多语言支持: 中英文切换、L键快捷键
 */

class RubikApp {
    constructor() {
        this.cube = null;
        this.cube2d = null;
        this.stateTracker = null;
        this.currentScramble = [];
        this.currentSolution = [];
        this.isPlaying = false;
        this.playSpeed = 1;
        this.currentStep = 0;
        this.isBusy = false;
        this.phase1Moves = 0;  // 第一阶段步数
        this.phase2Moves = 0;  // 第二阶段步数

        this.init();
        this.initSound();
        this.initTheme();
        this.initI18n();
    }

    init() {
        this.cube = new RubiksCube3D('cube-canvas');
        this.cube2d = new RubiksCube2D('cube-2d');
        this.stateTracker = new CubeStateTracker();
        this.bindEvents();
        this.bindKeyboard();
        this.bindTouchGestures();
        this.loadHistory();
        this.showKeyboardHints();
        this.sync2DView();
        this.setupMobileMeta();
        console.log('✅ 魔方最优解可视化系统已初始化');
    }

    initSound() {
        // 初始化音效系统（首次用户交互时启动）
        const initAudio = () => {
            window.soundManager.init();
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);

        // 绑定静音按钮
        const muteBtn = document.getElementById('btn-mute');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const muted = window.soundManager.toggleMute();
                muteBtn.textContent = muted ? '🔇' : '🔊';
                muteBtn.title = muted
                    ? window.i18n.t('sound.mute_on')
                    : window.i18n.t('sound.mute_off');
                muteBtn.setAttribute('data-i18n-title', muted ? 'sound.mute_on' : 'sound.mute_off');
            });
        }
    }

    // ========== i18n 系统 ==========

    initI18n() {
        // Apply initial translations
        window.i18n.updateDOM();

        // Bind language toggle button
        const langBtn = document.getElementById('btn-lang');
        if (langBtn) {
            langBtn.addEventListener('click', () => this.toggleLanguage());
        }

        // Listen for language changes to update dynamic content
        window.i18n.onChange(() => {
            this.updateDynamicText();
        });
    }

    toggleLanguage() {
        const newLang = window.i18n.toggle();
        window.soundManager.playClick();

        // Update the language button text
        const langBtn = document.getElementById('btn-lang');
        if (langBtn) {
            langBtn.textContent = window.i18n.t('btn.lang');
        }
    }

    updateDynamicText() {
        // Update elements that are set dynamically (not in HTML template)

        // Update result panel placeholder if showing default
        const resultContent = document.querySelector('#result-panel .result-content');
        if (resultContent) {
            const placeholder = resultContent.querySelector('.placeholder');
            if (placeholder && !placeholder.querySelector('.loading')) {
                // Only update if showing default text
                const currentText = placeholder.textContent.trim();
                if (currentText.includes('打乱') || currentText.includes('Scramble') ||
                    currentText.includes('按 S') || currentText.includes('scramble')) {
                    placeholder.textContent = window.i18n.t('result.placeholder');
                }
            }
        }

        // Update history panel placeholder
        const historyContent = document.getElementById('history-list');
        if (historyContent) {
            const placeholder = historyContent.querySelector('.placeholder');
            if (placeholder && !historyContent.querySelector('.history-item')) {
                placeholder.textContent = window.i18n.t('history.empty');
            }
        }

        // Update play/pause button
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            if (this.isPlaying) {
                playBtn.textContent = window.i18n.t('btn.pause');
            } else {
                playBtn.textContent = window.i18n.t('btn.play');
            }
        }

        // Update mute button title
        const muteBtn = document.getElementById('btn-mute');
        if (muteBtn) {
            const isMuted = muteBtn.textContent === '🔇';
            muteBtn.title = isMuted
                ? window.i18n.t('sound.mute_on')
                : window.i18n.t('sound.mute_off');
        }

        // Update theme button title
        const themeBtn = document.getElementById('btn-theme');
        if (themeBtn) {
            if (this.currentTheme === 'light') {
                themeBtn.title = window.i18n.t('theme.dark');
            } else {
                themeBtn.title = window.i18n.t('theme.light');
            }
        }

        // Update language button
        const langBtn = document.getElementById('btn-lang');
        if (langBtn) {
            langBtn.textContent = window.i18n.t('btn.lang');
        }

        // Re-render keyboard hints (rebuild the hints panel)
        this.rebuildKeyboardHints();

        // Re-render touch hints if they exist
        this.rebuildTouchHints();

        // Update phase counts with correct suffix
        this.updatePhaseVisualizer();
    }

    // ========== 主题系统 ==========

    initTheme() {
        // 从 localStorage 读取主题偏好，默认深色
        const saved = localStorage.getItem('rubik-theme') || 'dark';
        this.currentTheme = saved;
        this.applyTheme(saved);

        // 绑定主题按钮
        const themeBtn = document.getElementById('btn-theme');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    applyTheme(theme) {
        const root = document.documentElement;
        const themeBtn = document.getElementById('btn-theme');

        if (theme === 'light') {
            root.classList.add('theme-light');
            if (themeBtn) {
                themeBtn.textContent = '☀️';
                themeBtn.title = window.i18n ? window.i18n.t('theme.dark') : '切换深色主题 (T)';
                if (themeBtn.hasAttribute('data-i18n-title')) {
                    themeBtn.setAttribute('data-i18n-title', 'theme.dark');
                }
            }
        } else {
            root.classList.remove('theme-light');
            if (themeBtn) {
                themeBtn.textContent = '🌙';
                themeBtn.title = window.i18n ? window.i18n.t('theme.light') : '切换浅色主题 (T)';
                if (themeBtn.hasAttribute('data-i18n-title')) {
                    themeBtn.setAttribute('data-i18n-title', 'theme.light');
                }
            }
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('rubik-theme', this.currentTheme);
        window.soundManager.playClick();
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

        // 按钮点击音效
        ['btn-reset', 'btn-scramble', 'btn-solve', 'btn-auto',
         'btn-prev', 'btn-play', 'btn-next', 'btn-speed'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', () => {
                    window.soundManager.playClick();
                });
            }
        });
    }

    // ========== 键盘快捷键 ==========

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            // 如果焦点在输入框中，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (this.currentSolution.length > 0) this.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevStep();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextStep();
                    break;
                case 'r':
                case 'R':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.reset();
                    }
                    break;
                case 's':
                case 'S':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.scramble();
                    }
                    break;
                case 'a':
                case 'A':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.autoScrambleAndSolve();
                    }
                    break;
                case '1':
                    e.preventDefault();
                    this.playSpeed = 1;
                    document.getElementById('btn-speed').textContent = '1x';
                    break;
                case '2':
                    e.preventDefault();
                    this.playSpeed = 2;
                    document.getElementById('btn-speed').textContent = '2x';
                    break;
                case '3':
                    e.preventDefault();
                    this.playSpeed = 3;
                    document.getElementById('btn-speed').textContent = '3x';
                    break;
                case 'm':
                case 'M':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        const muteBtn = document.getElementById('btn-mute');
                        if (muteBtn) muteBtn.click();
                    }
                    break;
                case 't':
                case 'T':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.toggleTheme();
                    }
                    break;
                case 'l':
                case 'L':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.toggleLanguage();
                    }
                    break;
            }
        });
    }

    // ========== 移动端触屏支持 ==========

    detectMobile() {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    }

    setupMobileMeta() {
        // 禁止双击缩放（防止干扰手势操作）
        if (this.detectMobile()) {
            document.body.classList.add('is-mobile');
            // 添加触觉反馈支持
            if ('vibrate' in navigator) {
                this._canVibrate = true;
            }
        }
    }

    hapticFeedback(style = 'light') {
        // 触觉反馈（iOS不支持vibrate，Android支持）
        if (this._canVibrate) {
            switch (style) {
                case 'light': navigator.vibrate(10); break;
                case 'medium': navigator.vibrate(20); break;
                case 'heavy': navigator.vibrate([30, 10, 30]); break;
            }
        }
    }

    bindTouchGestures() {
        // 动画控制区域的滑动手势（左右滑动切换步骤）
        const animControls = document.getElementById('animation-controls');
        if (animControls) {
            this._setupSwipeNavigation(animControls);
        }

        // 进度条区域的滑动手势
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            this._setupProgressTouchDrag(progressBar);
        }

        // 按钮触摸反馈增强
        this._enhanceTouchButtons();

        // cube 区域的双指缩放提示
        const cubeCanvas = document.getElementById('cube-canvas');
        if (cubeCanvas) {
            // 防止canvas区域的默认缩放行为干扰Three.js OrbitControls
            cubeCanvas.style.touchAction = 'none';

            // 添加触摸开始/结束视觉反馈
            cubeCanvas.addEventListener('touchstart', () => {
                cubeCanvas.classList.add('touching');
            }, { passive: true });

            cubeCanvas.addEventListener('touchend', () => {
                cubeCanvas.classList.remove('touching');
            }, { passive: true });
        }

        // 显示触摸手势提示（仅移动设备）
        if (this.detectMobile()) {
            this.showTouchHints();
        }
    }

    _setupSwipeNavigation(element) {
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let isDragging = false;

        element.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            isDragging = true;
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
            // 只跟踪，不阻止默认
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;

            const touch = e.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const dt = Date.now() - startTime;

            // 水平滑动判定：水平距离>50px，垂直距离<水平距离的一半，时间<500ms
            if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.5 && dt < 500) {
                if (dx > 0) {
                    // 右滑 -> 下一步
                    this.nextStep();
                    this.hapticFeedback('light');
                } else {
                    // 左滑 -> 上一步
                    this.prevStep();
                    this.hapticFeedback('light');
                }
            }
        }, { passive: true });
    }

    _setupProgressTouchDrag(progressBar) {
        let isDragging = false;

        const handleTouch = (e) => {
            if (!this.currentSolution.length) return;
            const touch = e.touches ? e.touches[0] : e;
            const rect = progressBar.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            const targetStep = Math.round(pct * this.currentSolution.length);

            if (targetStep !== this.currentStep) {
                this.currentStep = targetStep;
                this.resetToStep(this.currentStep);
                this.updateStepDisplay();
                this.highlightCurrentMove();
            }
        };

        progressBar.addEventListener('touchstart', (e) => {
            isDragging = true;
            handleTouch(e);
        }, { passive: true });

        progressBar.addEventListener('touchmove', (e) => {
            if (isDragging) handleTouch(e);
        }, { passive: true });

        progressBar.addEventListener('touchend', () => {
            isDragging = false;
            this.hapticFeedback('light');
        }, { passive: true });
    }

    _enhanceTouchButtons() {
        // 给所有按钮添加触摸反馈
        const buttons = document.querySelectorAll('.btn, .btn-icon, .hints-toggle');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', () => {
                btn.classList.add('touch-active');
            }, { passive: true });

            btn.addEventListener('touchend', () => {
                setTimeout(() => btn.classList.remove('touch-active'), 150);
            }, { passive: true });

            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    showTouchHints() {
        const hints = document.createElement('div');
        hints.className = 'touch-hints';
        hints.id = 'touch-hints-panel';
        hints.innerHTML = `
            <div class="touch-hints-toggle" id="touch-hints-toggle">${window.i18n.t('hints.touch')}</div>
            <div class="touch-hints-content" id="touch-hints-content" style="display:none;">
                <div class="hint-row">${window.i18n.t('hints.touch_rotate')}</div>
                <div class="hint-row">${window.i18n.t('hints.touch_zoom')}</div>
                <div class="hint-row">${window.i18n.t('hints.touch_swipe')}</div>
                <div class="hint-row">${window.i18n.t('hints.touch_progress')}</div>
            </div>
        `;
        document.querySelector('.app-container').appendChild(hints);

        document.getElementById('touch-hints-toggle').addEventListener('click', () => {
            const content = document.getElementById('touch-hints-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });
    }

    rebuildTouchHints() {
        const existing = document.getElementById('touch-hints-panel');
        if (existing) {
            const toggle = existing.querySelector('#touch-hints-toggle');
            if (toggle) toggle.textContent = window.i18n.t('hints.touch');
            const rows = existing.querySelectorAll('.hint-row');
            const keys = ['hints.touch_rotate', 'hints.touch_zoom', 'hints.touch_swipe', 'hints.touch_progress'];
            rows.forEach((row, i) => {
                if (keys[i]) row.textContent = window.i18n.t(keys[i]);
            });
        }
    }

    showKeyboardHints() {
        // 添加快捷键提示到页面
        const hints = document.createElement('div');
        hints.className = 'keyboard-hints';
        hints.id = 'keyboard-hints-panel';
        hints.innerHTML = `
            <div class="hints-toggle" id="hints-toggle">${window.i18n.t('hints.keyboard')}</div>
            <div class="hints-content" id="hints-content" style="display:none;">
                <div class="hint-row"><kbd>Space</kbd> ${window.i18n.t('hints.play_pause')}</div>
                <div class="hint-row"><kbd>←</kbd><kbd>→</kbd> ${window.i18n.t('hints.prev_next')}</div>
                <div class="hint-row"><kbd>S</kbd> ${window.i18n.t('hints.scramble')}</div>
                <div class="hint-row"><kbd>A</kbd> ${window.i18n.t('hints.auto_solve')}</div>
                <div class="hint-row"><kbd>R</kbd> ${window.i18n.t('hints.reset')}</div>
                <div class="hint-row"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> ${window.i18n.t('hints.speed')}</div>
                <div class="hint-row"><kbd>M</kbd> ${window.i18n.t('hints.mute')}</div>
                <div class="hint-row"><kbd>T</kbd> ${window.i18n.t('hints.theme')}</div>
                <div class="hint-row"><kbd>L</kbd> ${window.i18n.t('hints.lang')}</div>
            </div>
        `;
        document.querySelector('.app-container').appendChild(hints);

        document.getElementById('hints-toggle').addEventListener('click', () => {
            const content = document.getElementById('hints-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });
    }

    rebuildKeyboardHints() {
        const existing = document.getElementById('keyboard-hints-panel');
        if (existing) {
            const toggle = existing.querySelector('#hints-toggle');
            if (toggle) toggle.textContent = window.i18n.t('hints.keyboard');
            const rows = existing.querySelectorAll('.hint-row');
            const keys = [
                'hints.play_pause', 'hints.prev_next', 'hints.scramble',
                'hints.auto_solve', 'hints.reset', 'hints.speed',
                'hints.mute', 'hints.theme', 'hints.lang'
            ];
            rows.forEach((row, i) => {
                if (keys[i]) {
                    // Preserve kbd elements, update only the text part
                    const kbds = row.querySelectorAll('kbd');
                    const textNode = window.i18n.t(keys[i]);
                    // Clear and rebuild
                    row.innerHTML = '';
                    kbds.forEach(kbd => row.appendChild(kbd));
                    row.appendChild(document.createTextNode(' ' + textNode));
                }
            });
        }
    }

    // ========== 2D 视图同步 ==========

    sync2DView() {
        if (this.cube2d && this.stateTracker) {
            this.cube2d.updateFromKociemba(this.stateTracker.getState());
        }
    }

    /**
     * 同步执行 3D 动画和 2D 状态更新
     * 每一步 3D 动画完成后立即更新 2D 视图，保证两者始终一致
     * 最后用 setStateFromKociemba 硬同步 3D，防止动画漂移
     */
    async applyMovesToBoth(moves, speed = 1) {
        const duration = 300 / speed;
        for (const move of moves) {
            await this.cube.applyMove(move, duration);
            this.stateTracker.applyMove(move);
            this.sync2DView();
        }
        // 硬同步：用 stateTracker 的最终状态重建 3D，杜绝漂移
        this.cube.setStateFromKociemba(this.stateTracker.getState());
    }

    // ========== 核心操作 ==========

    async scramble() {
        if (this.isBusy) return;
        this.isBusy = true;
        this.setButtonsEnabled(false);
        this.showLoading(window.i18n.t('loading.scramble'));

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

                // 更新状态追踪器和 3D 动画同步进行
                this.stateTracker.reset();
                this.cube.reset();
                await this.applyMovesToBoth(data.scramble, 2);

                window.soundManager.playScramble();

                document.getElementById('animation-controls').style.display = 'none';
                this.updateResult(`🔀 ${window.i18n.t('result.scramble_done')}`);
            } else {
                this.showError(window.i18n.t('error.scramble_fail') + data.error);
            }
        } catch (err) {
            this.showError(window.i18n.t('error.request_fail') + err.message);
        } finally {
            this.isBusy = false;
            this.setButtonsEnabled(true);
        }
    }

    async solve() {
        if (this.isBusy) return;

        if (this.currentScramble.length === 0) {
            this.showError(window.i18n.t('error.need_scramble'));
            return;
        }

        this.isBusy = true;
        this.setButtonsEnabled(false);
        this.showLoading(window.i18n.t('loading.solve'));
        window.soundManager.playSolveStart();

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
                const cacheTag = data.from_cache ? window.i18n.t('result.cache_hit') : '';
                this.updateResult(`✅ ${window.i18n.t('result.solve_done', {
                    num_moves: data.num_moves,
                    time: data.solve_time_ms,
                    cache: cacheTag
                })}`);
                this.loadHistory();
                window.soundManager.playSolveComplete();
            } else {
                this.showError(window.i18n.t('error.solve_fail') + data.error);
            }
        } catch (err) {
            this.showError(window.i18n.t('error.request_fail') + err.message);
        } finally {
            this.isBusy = false;
            this.setButtonsEnabled(true);
        }
    }

    async autoScrambleAndSolve() {
        if (this.isBusy) return;
        this.isBusy = true;
        this.setButtonsEnabled(false);
        this.showLoading(window.i18n.t('loading.auto'));

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

                if (data.scramble) {
                    this.displayScramble({
                        scramble: data.scramble,
                        num_scramble_moves: data.scramble.length
                    });
                }

                this.displaySolution(data);
                this.updateStats(data);

                this.cube.reset();
                this.stateTracker.reset();
                if (data.scramble && data.scramble.length > 0) {
                    await this.applyMovesToBoth(data.scramble, 2);
                }

                document.getElementById('animation-controls').style.display = 'block';
                this.updateStepDisplay();

                const cacheTag = data.from_cache ? window.i18n.t('result.cache_hit') : '';
                this.updateResult(`✅ ${window.i18n.t('result.auto_done', {
                    num_moves: data.num_moves,
                    time: data.solve_time_ms,
                    cache: cacheTag
                })}`);
                this.loadHistory();
                window.soundManager.playSolveComplete();
            } else {
                this.showError(window.i18n.t('error.auto_fail') + data.error);
            }
        } catch (err) {
            this.showError(window.i18n.t('error.request_fail') + err.message);
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
            this.stateTracker.applyMove(move);
            this.currentStep++;
            this.updateStepDisplay();
            this.highlightCurrentMove();
            this.sync2DView();
            window.soundManager.playRotate();
        }
    }

    async togglePlay() {
        const btn = document.getElementById('btn-play');

        if (this.isPlaying) {
            this.isPlaying = false;
            btn.textContent = window.i18n.t('btn.play');
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        } else {
            this.isPlaying = true;
            btn.textContent = window.i18n.t('btn.pause');
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
            btn.textContent = window.i18n.t('btn.play');
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
        this.stateTracker.reset();

        // 重放打乱 + 解题步骤，3D 和 2D 同步
        const allMoves = [...this.currentScramble, ...this.currentSolution.slice(0, step)];
        await this.applyMovesToBoth(allMoves, 10);

        this.cube.markNeedsRender();
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
        movesDisplay.innerHTML = data.solution.map((move, index) => {
            const phaseClass = index < (data.phase1_moves || 0) ? 'phase1' : 'phase2';
            return `<span class="move-tag ${phaseClass}-move" id="move-${index}">${move}</span>`;
        }).join('');
        countDisplay.textContent = data.num_moves;
        timeDisplay.textContent = data.solve_time_ms;

        // 更新阶段可视化
        this.phase1Moves = data.phase1_moves || 0;
        this.phase2Moves = data.phase2_moves || 0;
        this.updatePhaseVisualizer();
    }

    updateStats(data) {
        document.getElementById('stat-moves').textContent = data.num_moves;
        document.getElementById('stat-time').textContent = data.solve_time_ms;
        const efficiency = data.efficiency_score ||
            (data.is_optimal ? window.i18n.t('stat.optimal') : window.i18n.t('stat.suboptimal'));
        document.getElementById('stat-efficiency').textContent = efficiency;
    }

    // ========== 二阶段可视化 ==========

    updatePhaseVisualizer() {
        const visualizer = document.getElementById('phase-visualizer');
        if (!visualizer) return;

        const total = this.phase1Moves + this.phase2Moves;
        if (total === 0) {
            visualizer.style.display = 'none';
            return;
        }

        visualizer.style.display = 'block';

        // 更新阶段条宽度
        const p1Pct = (this.phase1Moves / total * 100);
        const p2Pct = (this.phase2Moves / total * 100);
        document.getElementById('phase1-bar').style.width = p1Pct + '%';
        document.getElementById('phase2-bar').style.width = p2Pct + '%';

        // 更新步数标签
        const suffix = window.i18n.t('algo.steps_suffix');
        document.getElementById('phase1-count').textContent = this.phase1Moves + suffix;
        document.getElementById('phase2-count').textContent = this.phase2Moves + suffix;

        // 重置标记位置
        this.updatePhaseMarker();
    }

    updatePhaseMarker() {
        const total = this.phase1Moves + this.phase2Moves;
        if (total === 0) return;

        const marker = document.getElementById('phase-marker');
        const indicator = document.getElementById('current-phase-indicator');
        const phaseText = document.getElementById('current-phase-text');
        const desc1 = document.querySelector('.phase-desc:first-child');
        const desc2 = document.querySelector('.phase-desc:last-child');

        if (!marker || !indicator) return;

        const pct = (this.currentStep / total * 100);
        marker.style.left = Math.min(pct, 100) + '%';

        // 更新当前阶段指示器
        indicator.classList.remove('phase1-active', 'phase2-active');
        if (desc1) desc1.classList.remove('active');
        if (desc2) desc2.classList.remove('active');

        if (this.currentStep === 0) {
            phaseText.textContent = window.i18n.t('algo.ready');
        } else if (this.currentStep <= this.phase1Moves) {
            indicator.classList.add('phase1-active');
            if (desc1) desc1.classList.add('active');
            phaseText.textContent = window.i18n.t('algo.phase1_active', {
                current: this.currentStep,
                total: this.phase1Moves
            });
        } else {
            indicator.classList.add('phase2-active');
            if (desc2) desc2.classList.add('active');
            phaseText.textContent = window.i18n.t('algo.phase2_active', {
                current: this.currentStep - this.phase1Moves,
                total: this.phase2Moves
            });
        }
    }

    updateResult(message) {
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML =
            `<div style="text-align: center; color: var(--success); font-weight: 600; font-size: 1rem;">${message}</div>`;
    }

    showError(message) {
        window.soundManager.playError();
        const panel = document.getElementById('result-panel');
        panel.querySelector('.result-content').innerHTML =
            `<div style="text-align: center; color: var(--danger); font-size: 0.95rem;">⚠️ ${message}</div>`;
    }

    showLoading(message = window.i18n.t('loading.scramble')) {
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

        // 更新阶段标记
        this.updatePhaseMarker();
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
                const lang = window.i18n.getLang();
                container.innerHTML = data.history.map((h, i) => {
                    const time = new Date(h.timestamp * 1000).toLocaleTimeString(
                        lang === 'zh' ? 'zh-CN' : 'en-US'
                    );
                    return `<div class="history-item">
                        <span class="history-num">${h.num_moves}${window.i18n.t('history.moves_suffix')}</span>
                        <span class="history-time">${h.solve_time_ms}${window.i18n.t('history.time_suffix')}</span>
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
        window.soundManager.playReset();
        this.currentScramble = [];
        this.currentSolution = [];
        this.currentStep = 0;
        this.isPlaying = false;
        this.phase1Moves = 0;
        this.phase2Moves = 0;

        this.cube.reset();
        this.stateTracker.reset();
        this.sync2DView();

        document.getElementById('scramble-panel').style.display = 'none';
        document.getElementById('solution-panel').style.display = 'none';
        document.getElementById('animation-controls').style.display = 'none';

        // 隐藏阶段可视化
        const visualizer = document.getElementById('phase-visualizer');
        if (visualizer) visualizer.style.display = 'none';

        this.updateResult(window.i18n.t('result.placeholder'));

        document.getElementById('stat-moves').textContent = '-';
        document.getElementById('stat-time').textContent = '-';
        document.getElementById('stat-efficiency').textContent = '-';

        const btn = document.getElementById('btn-play');
        if (btn) {
            btn.textContent = window.i18n.t('btn.play');
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

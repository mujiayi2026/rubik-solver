/**
 * i18n - Internationalization System
 * 多语言支持模块 - 中英文切换
 * v9.0
 */

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('rubik-lang') || 'zh';
        this.listeners = [];
        this.translations = {
            zh: {
                // 头部
                'app.title': '🎲 魔方最优解可视化系统',
                'app.subtitle': 'Kociemba二阶段算法 · 上帝之数20步内最优解',

                // 按钮
                'btn.reset': '🔄 重置',
                'btn.scramble': '🔀 打乱',
                'btn.solve': '✨ 求解',
                'btn.auto': '⚡ 一键求解',
                'btn.prev': '⏮ 上一步',
                'btn.play': '▶ 播放',
                'btn.pause': '⏸ 暂停',
                'btn.next': '下一步 ⏭',
                'btn.lang': 'EN',

                // 标题
                'panel.result': '📊 求解结果',
                'panel.scramble': '🔀 打乱步骤',
                'panel.solution': '✨ 最优解法',
                'panel.algorithm': '🧠 二阶段算法原理',
                'panel.stats': '📈 本次统计',
                'panel.history': '📜 求解历史',
                'panel.instructions': '📖 操作说明',

                // 2D展开图
                'label.2d': '📐 2D 展开图',

                // 求解结果
                'result.placeholder': '点击「打乱」后点击「求解」，或直接点击「一键求解」',
                'result.scramble_done': '打乱完成，点击「求解」计算最优解',
                'result.solve_done': '最优解找到！{num_moves} 步，耗时 {time}ms{cache}',
                'result.auto_done': '一键求解完成！{num_moves} 步，耗时 {time}ms{cache}',
                'result.cache_hit': ' ⚡(缓存命中)',

                // 错误消息
                'error.need_scramble': '请先打乱，或按一键求解',
                'error.scramble_fail': '打乱失败: ',
                'error.solve_fail': '求解失败: ',
                'error.request_fail': '请求失败: ',
                'error.auto_fail': '一键求解失败: ',

                // 加载消息
                'loading.scramble': '正在生成打乱...',
                'loading.solve': '🧠 正在计算最优解...',
                'loading.auto': '⚡ 一键求解中...',

                // 步骤信息
                'info.steps': '步数: ',
                'info.total_steps': '总步数: ',
                'info.solve_time': '求解耗时: ',
                'info.step': '步骤 ',
                'info.of': ' / ',

                // 算法面板
                'algo.algorithm': '算法',
                'algo.algorithm_value': 'Kociemba二阶段',
                'algo.god_number': '上帝之数',
                'algo.god_number_value': '≤ 20步',
                'algo.state_space': '状态空间',
                'algo.state_space_value': '4.3×10¹⁹',
                'algo.phase1_title': 'G₁ 子群还原',
                'algo.phase1_desc': '将魔方还原到 <U, D, R², L², F², B²> 子群状态：棱块方向正确、角块方向正确、中间层棱块归位',
                'algo.phase2_title': '子群内完全还原',
                'algo.phase2_desc': '在 G₁ 子群内搜索最优解：仅使用 U, D, R², L², F², B² 操作将魔方完全还原',
                'algo.ready': '准备就绪',
                'algo.phase1_active': '阶段 1：第 {current}/{total} 步',
                'algo.phase2_active': '阶段 2：第 {current}/{total} 步',
                'algo.phase': '阶段 ',
                'algo.steps_suffix': ' 步',

                // 统计
                'stat.moves': '总步数',
                'stat.time': '耗时(ms)',
                'stat.efficiency': '效率',
                'stat.optimal': '最优',
                'stat.suboptimal': '非最优',

                // 历史
                'history.empty': '暂无记录',
                'history.moves_suffix': '步',
                'history.time_suffix': 'ms',

                // 操作说明
                'help.drag': '🖱️ 拖拽旋转魔方视角',
                'help.zoom': '🔍 滚轮缩放大小',
                'help.auto': '⚡「一键求解」自动生成打乱并求解',
                'help.playback': '▶️ 使用动画控制查看还原过程',
                'help.speed': '🔄 速度按钮切换播放速率',
                'help.phases': '🧠 求解后查看二阶段算法分解',
                'help.sound': '🔊 右上角切换音效开关',
                'help.theme': '🌙 右上角切换深色/浅色主题',
                'help.touch_rotate': '👆 单指拖拽旋转视角 · 双指缩放',
                'help.touch_swipe': '👈👉 左右滑动切换步骤 · 拖动进度条跳转',

                // 快捷键提示
                'hints.keyboard': '⌨️ 快捷键',
                'hints.play_pause': '播放/暂停',
                'hints.prev_next': '上一步/下一步',
                'hints.scramble': '打乱',
                'hints.auto_solve': '一键求解',
                'hints.reset': '重置',
                'hints.speed': '调速',
                'hints.mute': '静音/取消',
                'hints.theme': '切换主题',
                'hints.lang': '切换语言',

                // 触屏提示
                'hints.touch': '👆 手势',
                'hints.touch_rotate': '👆 单指拖拽旋转视角',
                'hints.touch_zoom': '✌️ 双指缩放大小',
                'hints.touch_swipe': '👈 👉 左右滑动切换步骤',
                'hints.touch_progress': '📊 拖动进度条跳转',

                // 音效
                'sound.mute_on': '开启音效',
                'sound.mute_off': '关闭音效',

                // 主题
                'theme.dark': '切换深色主题 (L)',
                'theme.light': '切换浅色主题 (L)',

                // 底部
                'footer.text': '基于 Kociemba 二阶段算法 | 三阶魔方上帝之数 ≤ 20步',

                // 控制台
                'console.init': '✅ 魔方最优解可视化系统已初始化',
            },

            en: {
                // Header
                'app.title': '🎲 Rubik\'s Cube Optimal Solver',
                'app.subtitle': 'Kociemba Two-Phase Algorithm · ≤ 20 moves (God\'s Number)',

                // Buttons
                'btn.reset': '🔄 Reset',
                'btn.scramble': '🔀 Scramble',
                'btn.solve': '✨ Solve',
                'btn.auto': '⚡ One-Click',
                'btn.prev': '⏮ Prev',
                'btn.play': '▶ Play',
                'btn.pause': '⏸ Pause',
                'btn.next': 'Next ⏭',
                'btn.lang': '中',

                // Panel titles
                'panel.result': '📊 Result',
                'panel.scramble': '🔀 Scramble',
                'panel.solution': '✨ Optimal Solution',
                'panel.algorithm': '🧠 Two-Phase Algorithm',
                'panel.stats': '📈 Statistics',
                'panel.history': '📜 History',
                'panel.instructions': '📖 Instructions',

                // 2D unfold
                'label.2d': '📐 2D Unfold',

                // Results
                'result.placeholder': 'Click "Scramble" then "Solve", or click "One-Click"',
                'result.scramble_done': 'Scramble done. Click "Solve" to find optimal solution',
                'result.solve_done': 'Solution found! {num_moves} moves in {time}ms{cache}',
                'result.auto_done': 'One-Click done! {num_moves} moves in {time}ms{cache}',
                'result.cache_hit': ' ⚡(cached)',

                // Error messages
                'error.need_scramble': 'Please scramble first, or use one-click solve',
                'error.scramble_fail': 'Scramble failed: ',
                'error.solve_fail': 'Solve failed: ',
                'error.request_fail': 'Request failed: ',
                'error.auto_fail': 'One-click solve failed: ',

                // Loading messages
                'loading.scramble': 'Generating scramble...',
                'loading.solve': '🧠 Computing optimal solution...',
                'loading.auto': '⚡ One-click solving...',

                // Step info
                'info.steps': 'Moves: ',
                'info.total_steps': 'Total: ',
                'info.solve_time': 'Time: ',
                'info.step': 'Step ',
                'info.of': ' / ',

                // Algorithm panel
                'algo.algorithm': 'Algorithm',
                'algo.algorithm_value': 'Kociemba Two-Phase',
                'algo.god_number': 'God\'s Number',
                'algo.god_number_value': '≤ 20 moves',
                'algo.state_space': 'State Space',
                'algo.state_space_value': '4.3×10¹⁹',
                'algo.phase1_title': 'Phase 1: G₁ Subgroup',
                'algo.phase1_desc': 'Reduce to <U, D, R², L², F², B²> subgroup: correct edge orientation, correct corner orientation, middle-layer edges in place',
                'algo.phase2_title': 'Phase 2: Solve in G₁',
                'algo.phase2_desc': 'Search optimal solution within G₁ subgroup: use only U, D, R², L², F², B² moves to fully solve',
                'algo.ready': 'Ready',
                'algo.phase1_active': 'Phase 1: step {current}/{total}',
                'algo.phase2_active': 'Phase 2: step {current}/{total}',
                'algo.phase': 'Phase ',
                'algo.steps_suffix': ' moves',

                // Statistics
                'stat.moves': 'Total Moves',
                'stat.time': 'Time (ms)',
                'stat.efficiency': 'Efficiency',
                'stat.optimal': 'Optimal',
                'stat.suboptimal': 'Sub-optimal',

                // History
                'history.empty': 'No records yet',
                'history.moves_suffix': ' moves',
                'history.time_suffix': 'ms',

                // Instructions
                'help.drag': '🖱️ Drag to rotate view',
                'help.zoom': '🔍 Scroll to zoom in/out',
                'help.auto': '⚡ "One-Click" auto generates scramble & solves',
                'help.playback': '▶️ Use playback controls to watch solving',
                'help.speed': '🔄 Speed button cycles playback rate',
                'help.phases': '🧠 View two-phase algorithm breakdown after solving',
                'help.sound': '🔊 Toggle sound effects (top-right)',
                'help.theme': '🌙 Toggle dark/light theme (top-right)',
                'help.touch_rotate': '👆 One finger drag to rotate · Pinch to zoom',
                'help.touch_swipe': '👈👉 Swipe to change step · Drag progress bar',

                // Keyboard hints
                'hints.keyboard': '⌨️ Shortcuts',
                'hints.play_pause': 'Play / Pause',
                'hints.prev_next': 'Prev / Next step',
                'hints.scramble': 'Scramble',
                'hints.auto_solve': 'One-Click Solve',
                'hints.reset': 'Reset',
                'hints.speed': 'Speed',
                'hints.mute': 'Mute / Unmute',
                'hints.theme': 'Toggle theme',
                'hints.lang': 'Switch language',

                // Touch hints
                'hints.touch': '👆 Gestures',
                'hints.touch_rotate': '👆 One finger drag to rotate',
                'hints.touch_zoom': '✌️ Pinch to zoom',
                'hints.touch_swipe': '👈 👉 Swipe to change step',
                'hints.touch_progress': '📊 Drag progress bar to jump',

                // Sound
                'sound.mute_on': 'Enable sound',
                'sound.mute_off': 'Disable sound',

                // Theme
                'theme.dark': 'Switch to dark theme (L)',
                'theme.light': 'Switch to light theme (L)',

                // Footer
                'footer.text': 'Based on Kociemba Two-Phase Algorithm | God\'s Number ≤ 20 moves',

                // Console
                'console.init': '✅ Rubik\'s Cube Optimal Solver initialized',
            }
        };
    }

    /**
     * Get translated text for a key
     * @param {string} key - Translation key
     * @param {Object} [params] - Template parameters {key: value}
     * @returns {string}
     */
    t(key, params = {}) {
        const dict = this.translations[this.currentLang] || this.translations['zh'];
        let text = dict[key] || this.translations['zh'][key] || key;

        // Replace template parameters: {key} -> value
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    }

    /**
     * Get current language
     * @returns {string} 'zh' or 'en'
     */
    getLang() {
        return this.currentLang;
    }

    /**
     * Toggle language between zh and en
     * @returns {string} new language
     */
    toggle() {
        this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('rubik-lang', this.currentLang);
        this.updateDOM();
        this.notifyListeners();
        return this.currentLang;
    }

    /**
     * Set language explicitly
     * @param {string} lang - 'zh' or 'en'
     */
    setLang(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('rubik-lang', lang);
            this.updateDOM();
            this.notifyListeners();
        }
    }

    /**
     * Register a callback for language changes
     * @param {Function} callback
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.currentLang));
    }

    /**
     * Update all DOM elements with data-i18n attribute
     */
    updateDOM() {
        // Update elements with data-i18n attribute (textContent)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (text !== key) {
                el.textContent = text;
            }
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const text = this.t(key);
            if (text !== key) {
                el.title = text;
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang === 'zh' ? 'zh-CN' : 'en';

        // Update page title
        document.title = this.currentLang === 'zh'
            ? '魔方最优解可视化系统'
            : 'Rubik\'s Cube Optimal Solver';
    }
}

// Global i18n instance
window.i18n = new I18n();

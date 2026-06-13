/**
 * Sound Effects System
 * 音效系统 - 使用 Web Audio API 合成音效
 */

class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.muted = false;
        this.volume = 0.3;
        this.initialized = false;
    }

    /**
     * 初始化音频上下文（需要用户交互触发）
     */
    init() {
        if (this.initialized) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API 不可用:', e);
        }
    }

    /**
     * 确保音频上下文已初始化
     */
    ensureContext() {
        if (!this.initialized) this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * 播放旋转音效 - 短促清脆的 click 声
     */
    playRotate() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        // 噪声 + 滤波器模拟 click
        const bufferSize = ctx.sampleRate * 0.06;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const env = Math.exp(-i / (bufferSize * 0.08));
            data[i] = (Math.random() * 2 - 1) * env;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500;
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);
    }

    /**
     * 播放求解开始音效 - 上升音阶
     */
    playSolveStart() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const notes = [440, 554, 659]; // A4, C#5, E5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            const start = now + i * 0.08;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(this.volume * 0.2, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.15);
        });
    }

    /**
     * 播放求解完成音效 - 欢快的叮咚声
     */
    playSolveComplete() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        // 双音 + 光辉
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            const start = now + i * 0.12;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(this.volume * 0.25, start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.4);
        });

        // 添加泛音光泽
        const shimmer = ctx.createOscillator();
        shimmer.type = 'triangle';
        shimmer.frequency.value = 1568; // G6
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.setValueAtTime(0, now + 0.1);
        shimmerGain.gain.linearRampToValueAtTime(this.volume * 0.1, now + 0.2);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmer.start(now + 0.1);
        shimmer.stop(now + 0.8);
    }

    /**
     * 播放按钮点击音效 - 轻柔 tap
     */
    playClick() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * 播放错误/警告音效 - 低沉的嗡嗡声
     */
    playError() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * 播放打乱音效 - 快速连续音
     */
    playScramble() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = 300 + i * 150;

            const gain = ctx.createGain();
            const start = now + i * 0.06;
            gain.gain.setValueAtTime(this.volume * 0.15, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.08);
        }
    }

    /**
     * 播放重置音效 - 下降音
     */
    playReset() {
        if (this.muted || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * 切换静音状态
     */
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    /**
     * 设置音量
     */
    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
    }
}

// 导出全局实例
window.soundManager = new SoundManager();

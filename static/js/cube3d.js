/**
 * 3D Rubik's Cube Visualization
 * 三阶魔方3D可视化 - 增强版v3（圆角方块、阴影、环境光遮蔽）
 */

/**
 * 圆角方块几何体生成器
 * 使用ExtrudeGeometry实现圆角效果
 */
function createRoundedBoxGeometry(width, height, depth, radius, segments) {
    segments = segments || 2;
    radius = Math.min(radius, width / 2, height / 2, depth / 2);
    
    // 创建2D圆角矩形
    const shape = new THREE.Shape();
    const w = width / 2 - radius;
    const h = height / 2 - radius;
    
    shape.moveTo(-w, -height / 2);
    shape.lineTo(w, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
    shape.lineTo(width / 2, h);
    shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
    shape.lineTo(-w, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
    shape.lineTo(-width / 2, -h);
    shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);
    
    const extrudeSettings = {
        depth: depth - radius * 2,
        bevelEnabled: true,
        bevelThickness: radius,
        bevelSize: radius,
        bevelOffset: 0,
        bevelSegments: segments,
        curveSegments: segments
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
}

/**
 * 创建贴花面片（colored sticker on each face）
 * 给圆角方块的外露面添加带边距的彩色贴花
 */
function createStickerGeometry(faceSize, stickerSize, depth) {
    const shape = new THREE.Shape();
    const s = stickerSize / 2;
    const r = s * 0.12; // 贴花的圆角
    const w = s - r;
    const h = s - r;
    
    shape.moveTo(-w, -s);
    shape.lineTo(w, -s);
    shape.quadraticCurveTo(s, -s, s, -h);
    shape.lineTo(s, h);
    shape.quadraticCurveTo(s, s, w, s);
    shape.lineTo(-w, s);
    shape.quadraticCurveTo(-s, s, -s, h);
    shape.lineTo(-s, -h);
    shape.quadraticCurveTo(-s, -s, -w, -s);
    
    return new THREE.ShapeGeometry(shape);
}


class RubiksCube3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.cubeGroup = null;
        this.cubies = [];
        this.isAnimating = false;
        this.animationQueue = [];
        this._needsRender = true;
        this._idleFrames = 0;
        
        // 魔方颜色定义 - 更鲜艳的配色
        this.colors = {
            'W': 0xffffff,  // 白 - 上
            'Y': 0xffd500,  // 黄 - 下
            'R': 0xc41e3a,  // 红 - 右
            'O': 0xff5800,  // 橙 - 左
            'B': 0x0051ba,  // 蓝 - 前
            'G': 0x009e60,  // 绿 - 后
            'X': 0x1a1a2e   // 内部(不可见)
        };
        
        // 面法向量
        this.faceNormals = {
            'U': new THREE.Vector3(0, 1, 0),
            'D': new THREE.Vector3(0, -1, 0),
            'R': new THREE.Vector3(1, 0, 0),
            'L': new THREE.Vector3(-1, 0, 0),
            'F': new THREE.Vector3(0, 0, 1),
            'B': new THREE.Vector3(0, 0, -1)
        };
        
        // Kociemba 字符到内部颜色 key 的映射
        this.kociembaToColor = {
            'U': 'W', 'R': 'R', 'F': 'B',
            'D': 'Y', 'L': 'O', 'B': 'G'
        };
        
        // 当前 Kociemba 状态（由外部 stateTracker 同步）
        this._kociembaState = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
        
        this.init();
        this.createCube();
        this.createEnvironment();
        this.animate();
    }
    
    init() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
        
        // 相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
        this.camera.position.set(6, 5, 6);
        this.camera.lookAt(0, 0, 0);
        
        // 渲染器 - 启用阴影
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);
        
        // 控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 6;
        this.controls.maxDistance = 15;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
        
        // 光照系统 - 多层次光照实现环境光遮蔽效果
        
        // 半球光 - 模拟天空/地面反射
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.4);
        this.scene.add(hemisphereLight);
        
        // 环境光 - 基础填充
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        
        // 主光源 - 投射阴影
        this.mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
        this.mainLight.position.set(5, 10, 7);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.width = 2048;
        this.mainLight.shadow.mapSize.height = 2048;
        this.mainLight.shadow.camera.near = 0.5;
        this.mainLight.shadow.camera.far = 30;
        this.mainLight.shadow.camera.left = -5;
        this.mainLight.shadow.camera.right = 5;
        this.mainLight.shadow.camera.top = 5;
        this.mainLight.shadow.camera.bottom = -5;
        this.mainLight.shadow.bias = -0.001;
        this.mainLight.shadow.radius = 4;
        this.scene.add(this.mainLight);
        
        // 补光灯 - 减少暗面
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
        
        // 背光 - 增加轮廓感
        const rimLight = new THREE.DirectionalLight(0x88aaff, 0.2);
        rimLight.position.set(0, -3, -8);
        this.scene.add(rimLight);
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createEnvironment() {
        // 地面 - 接收阴影
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.95,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -3.5;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // 反射平台 - 给魔方底部一个微妙的反射效果
        const platformGeometry = new THREE.CylinderGeometry(3, 3.2, 0.15, 64);
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3,
            metalness: 0.6,
            transparent: true,
            opacity: 0.7
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = -2.5;
        platform.receiveShadow = true;
        platform.castShadow = true;
        this.scene.add(platform);
    }
    
    createCube() {
        this._rebuildCube('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB');
    }
    
    /**
     * 根据 Kociemba 状态字符串重建整个 3D 魔方
     * 这是保证 3D 和 2D 完全同步的核心方法
     */
    _rebuildCube(kociembaStr) {
        if (this.cubeGroup) {
            this.scene.remove(this.cubeGroup);
        }
        
        this.cubeGroup = new THREE.Group();
        this.cubies = [];
        this._kociembaState = kociembaStr;
        
        const cubeSize = 0.88;
        const gap = 0.06;
        const offset = (cubeSize + gap);
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const stickerColors = this._getStickerColors(x, y, z, kociembaStr);
                    const cubie = this._createCubieWithColors(x, y, z, cubeSize, stickerColors);
                    cubie.position.set(x * offset, y * offset, z * offset);
                    cubie.userData = { x, y, z };
                    this.cubies.push(cubie);
                    this.cubeGroup.add(cubie);
                }
            }
        }
        
        this.scene.add(this.cubeGroup);
        this.markNeedsRender();
    }
    
    /**
     * 根据 Kociemba 状态计算某个 cubie 各面的贴纸颜色
     * 
     * Kociemba 格式: 9 chars per face, order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)
     * 每个面从外部看:
     *   U(从上往下):  x=[-1,1] z=[-1,1]  → idx = (z+1)*3 + (x+1)
     *   D(从下往上):  x=[-1,1] z=[1,-1]  → idx = 27 + (1-z)*3 + (x+1)
     *   R(从右往左):  y=[1,-1] z=[-1,1]  → idx = 9 + (z+1)*3 + (1-y)
     *   L(从左往右):  y=[1,-1] z=[1,-1]  → idx = 36 + (1-y)*3 + (z+1)
     *   F(从前往后):  x=[-1,1] y=[1,-1]  → idx = 18 + (1-y)*3 + (x+1)
     *   B(从后往前):  x=[1,-1] y=[1,-1]  → idx = 45 + (1-y)*3 + (1-x)
     */
    _getStickerColors(x, y, z, state) {
        const result = {};
        
        if (y === 1) {
            const idx = (z + 1) * 3 + (x + 1);
            result.U = this.kociembaToColor[state[idx]] || 'X';
        }
        if (y === -1) {
            const idx = 27 + (1 - z) * 3 + (x + 1);
            result.D = this.kociembaToColor[state[idx]] || 'X';
        }
        if (x === 1) {
            const idx = 9 + (z + 1) * 3 + (1 - y);
            result.R = this.kociembaToColor[state[idx]] || 'X';
        }
        if (x === -1) {
            const idx = 36 + (1 - y) * 3 + (z + 1);
            result.L = this.kociembaToColor[state[idx]] || 'X';
        }
        if (z === 1) {
            const idx = 18 + (1 - y) * 3 + (x + 1);
            result.F = this.kociembaToColor[state[idx]] || 'X';
        }
        if (z === -1) {
            const idx = 45 + (1 - y) * 3 + (1 - x);
            result.B = this.kociembaToColor[state[idx]] || 'X';
        }
        
        return result;
    }
    
    /**
     * 创建带有指定贴纸颜色的 cubie
     * stickerColors: { U: 'W', R: 'R', ... } 使用内部颜色 key
     */
    _createCubieWithColors(x, y, z, size, stickerColors) {
        const group = new THREE.Group();
        const cornerRadius = 0.06;
        const segments = 3;
        
        // 圆角方块主体 - 黑色塑料质感
        const bodyGeometry = createRoundedBoxGeometry(size, size, size, cornerRadius, segments);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.4,
            metalness: 0.05
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // 贴花（彩色面）
        const stickerSize = size * 0.78;
        const stickerOffset = size / 2 + 0.001;
        
        const faceConfigs = [
            { face: 'R', pos: [stickerOffset, 0, 0], rotY: Math.PI / 2, rotX: 0 },
            { face: 'L', pos: [-stickerOffset, 0, 0], rotY: -Math.PI / 2, rotX: 0 },
            { face: 'U', pos: [0, stickerOffset, 0], rotY: 0, rotX: -Math.PI / 2 },
            { face: 'D', pos: [0, -stickerOffset, 0], rotY: 0, rotX: Math.PI / 2 },
            { face: 'F', pos: [0, 0, stickerOffset], rotY: 0, rotX: 0 },
            { face: 'B', pos: [0, 0, -stickerOffset], rotY: Math.PI, rotX: 0 }
        ];
        
        for (const config of faceConfigs) {
            const colorKey = stickerColors[config.face];
            if (colorKey && colorKey !== 'X') {
                const colorHex = this.colors[colorKey];
                const stickerGeo = createStickerGeometry(size, stickerSize, 0.01);
                const stickerMat = new THREE.MeshStandardMaterial({
                    color: colorHex,
                    roughness: 0.25,
                    metalness: 0.05,
                    emissive: colorHex,
                    emissiveIntensity: 0.05
                });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(...config.pos);
                sticker.rotation.order = 'YXZ';
                sticker.rotation.y = config.rotY;
                sticker.rotation.x = config.rotX;
                sticker.castShadow = true;
                group.add(sticker);
            }
        }
        
        return group;
    }
    
    /**
     * 从 Kociemba 状态字符串设置魔方（无动画，直接重建）
     * 用于同步、回退、错误恢复
     */
    setStateFromKociemba(kociembaStr) {
        if (!kociembaStr || kociembaStr.length !== 54) return;
        this._rebuildCube(kociembaStr);
    }
    
    /**
     * 获取当前 Kociemba 状态
     */
    getState() {
        return this._kociembaState;
    }
    
    applyMove(move, duration = 300) {
        return new Promise((resolve) => {
            if (this.isAnimating) {
                this.animationQueue.push({ move, resolve });
                return;
            }
            
            this.isAnimating = true;
            
            const face = move[0];
            const isPrime = move.includes("'");
            const isDouble = move.includes("2");
            
            const angle = (isPrime ? 1 : -1) * Math.PI / 2 * (isDouble ? 2 : 1);
            const axis = this.faceNormals[face];
            
            // 如果 face 无效（move 格式异常），直接跳过
            if (!axis) {
                console.warn('3D cube: unknown move face "' + face + '" from move "' + move + '"');
                this.isAnimating = false;
                resolve();
                if (this.animationQueue.length > 0) {
                    const next = this.animationQueue.shift();
                    this.applyMove(next.move).then(next.resolve);
                }
                return;
            }
            
            // 获取需要旋转的小方块
            const affectedCubies = this.getCubiesByFace(face);
            
            // 创建旋转组
            const rotationGroup = new THREE.Group();
            this.scene.add(rotationGroup);
            
            affectedCubies.forEach(cubie => {
                this.cubeGroup.remove(cubie);
                rotationGroup.add(cubie);
            });
            
            // 动画旋转
            const startTime = performance.now();
            const targetRotation = angle;
            const self = this;
            
            // 超时保护：如果 duration*3 ms 内动画没完成，强制结束
            const timeout = setTimeout(() => {
                console.warn('3D cube animation timeout, forcing completion');
                finishRotation();
            }, duration * 3 + 200);
            
            function finishRotation() {
                try {
                    affectedCubies.forEach(cubie => {
                        const worldPos = new THREE.Vector3();
                        const worldQuat = new THREE.Quaternion();
                        cubie.getWorldPosition(worldPos);
                        cubie.getWorldQuaternion(worldQuat);
                        
                        self.scene.remove(cubie);
                        self.cubeGroup.add(cubie);
                        
                        cubie.position.copy(worldPos);
                        cubie.quaternion.copy(worldQuat);
                        
                        cubie.userData = {
                            x: Math.round(worldPos.x / 0.94),
                            y: Math.round(worldPos.y / 0.94),
                            z: Math.round(worldPos.z / 0.94)
                        };
                    });
                    
                    self.scene.remove(rotationGroup);
                } catch (e) {
                    console.error('3D cube rotation completion error:', e);
                } finally {
                    self.isAnimating = false;
                    self.markNeedsRender();
                    resolve();
                    
                    if (self.animationQueue.length > 0) {
                        const next = self.animationQueue.shift();
                        self.applyMove(next.move).then(next.resolve);
                    }
                }
            }
            
            const animateRotation = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 使用缓动函数
                const eased = self.easeInOutCubic(progress);
                const currentAngle = targetRotation * eased;
                
                rotationGroup.rotation.set(0, 0, 0);
                if (axis.x) rotationGroup.rotation.x = currentAngle;
                if (axis.y) rotationGroup.rotation.y = currentAngle;
                if (axis.z) rotationGroup.rotation.z = currentAngle;
                
                if (progress < 1) {
                    requestAnimationFrame(animateRotation);
                } else {
                    clearTimeout(timeout);
                    finishRotation();
                }
            };
            
            requestAnimationFrame(animateRotation);
        });
    }
    
    getCubiesByFace(face) {
        const threshold = 0.5;
        return this.cubies.filter(cubie => {
            switch (face) {
                case 'U': return cubie.position.y > threshold;
                case 'D': return cubie.position.y < -threshold;
                case 'R': return cubie.position.x > threshold;
                case 'L': return cubie.position.x < -threshold;
                case 'F': return cubie.position.z > threshold;
                case 'B': return cubie.position.z < -threshold;
                default: return false;
            }
        });
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    async applyMoves(moves, speed = 1) {
        const duration = 300 / speed;
        
        for (const move of moves) {
            await this.applyMove(move, duration);
        }
    }
    
    reset() {
        this.animationQueue = [];
        this.isAnimating = false;
        this.createCube();
        this.markNeedsRender();
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    markNeedsRender() {
        this._needsRender = true;
        this._idleFrames = 0;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const controlsChanged = this.controls.update();

        // 条件渲染：仅在需要时渲染
        if (controlsChanged || this.isAnimating || this._needsRender || this._idleFrames < 30) {
            this.renderer.render(this.scene, this.camera);
            this._needsRender = false;
            this._idleFrames++;
        } else {
            // 空闲时降低到低频渲染（每10帧渲染一次兜底）
            if (this._idleFrames % 10 === 0) {
                this.renderer.render(this.scene, this.camera);
            }
            this._idleFrames++;
        }
    }
}

// 导出
window.RubiksCube3D = RubiksCube3D;

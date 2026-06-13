/**
 * 3D Rubik's Cube Visualization
 * 三阶魔方3D可视化
 */

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
        
        // 魔方颜色定义
        this.colors = {
            'W': 0xffffff,  // 白 - 上
            'Y': 0xffd500,  // 黄 - 下
            'R': 0xff0000,  // 红 - 右
            'O': 0xff8c00,  // 橙 - 左
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
        
        this.init();
        this.createCube();
        this.animate();
    }
    
    init() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e293b);
        
        // 相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(5, 4, 5);
        this.camera.lookAt(0, 0, 0);
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // 控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 6;
        this.controls.maxDistance = 15;
        
        // 光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, -5, -5);
        this.scene.add(backLight);
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createCube() {
        // 清除现有魔方
        if (this.cubeGroup) {
            this.scene.remove(this.cubeGroup);
        }
        
        this.cubeGroup = new THREE.Group();
        this.cubies = [];
        
        const cubeSize = 0.9;
        const gap = 0.05;
        const offset = (cubeSize + gap) * 1.5;
        
        // 创建27个小方块
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubie = this.createCubie(x, y, z, cubeSize);
                    cubie.position.set(
                        x * (cubeSize + gap),
                        y * (cubeSize + gap),
                        z * (cubeSize + gap)
                    );
                    cubie.userData = { x, y, z };
                    this.cubies.push(cubie);
                    this.cubeGroup.add(cubie);
                }
            }
        }
        
        this.scene.add(this.cubeGroup);
    }
    
    createCubie(x, y, z, size) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const materials = [];
        
        // 右面 (+X)
        materials.push(new THREE.MeshPhongMaterial({
            color: x === 1 ? this.colors['R'] : this.colors['X'],
            shininess: 100
        }));
        
        // 左面 (-X)
        materials.push(new THREE.MeshPhongMaterial({
            color: x === -1 ? this.colors['O'] : this.colors['X'],
            shininess: 100
        }));
        
        // 上面 (+Y)
        materials.push(new THREE.MeshPhongMaterial({
            color: y === 1 ? this.colors['W'] : this.colors['X'],
            shininess: 100
        }));
        
        // 下面 (-Y)
        materials.push(new THREE.MeshPhongMaterial({
            color: y === -1 ? this.colors['Y'] : this.colors['X'],
            shininess: 100
        }));
        
        // 前面 (+Z)
        materials.push(new THREE.MeshPhongMaterial({
            color: z === 1 ? this.colors['B'] : this.colors['X'],
            shininess: 100
        }));
        
        // 后面 (-Z)
        materials.push(new THREE.MeshPhongMaterial({
            color: z === -1 ? this.colors['G'] : this.colors['X'],
            shininess: 100
        }));
        
        const cube = new THREE.Mesh(geometry, materials);
        
        // 添加黑色边框
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        cube.add(wireframe);
        
        return cube;
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
            
            const animateRotation = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 使用缓动函数
                const eased = this.easeInOutCubic(progress);
                const currentAngle = targetRotation * eased;
                
                rotationGroup.rotation.set(0, 0, 0);
                if (axis.x) rotationGroup.rotation.x = currentAngle;
                if (axis.y) rotationGroup.rotation.y = currentAngle;
                if (axis.z) rotationGroup.rotation.z = currentAngle;
                
                if (progress < 1) {
                    requestAnimationFrame(animateRotation);
                } else {
                    // 完成旋转，更新小方块位置
                    affectedCubies.forEach(cubie => {
                        const worldPos = new THREE.Vector3();
                        const worldQuat = new THREE.Quaternion();
                        cubie.getWorldPosition(worldPos);
                        cubie.getWorldQuaternion(worldQuat);
                        
                        this.scene.remove(cubie);
                        this.cubeGroup.add(cubie);
                        
                        cubie.position.copy(worldPos);
                        cubie.quaternion.copy(worldQuat);
                        
                        // 更新用户数据
                        cubie.userData = {
                            x: Math.round(worldPos.x / 0.95),
                            y: Math.round(worldPos.y / 0.95),
                            z: Math.round(worldPos.z / 0.95)
                        };
                    });
                    
                    this.scene.remove(rotationGroup);
                    this.isAnimating = false;
                    resolve();
                    
                    // 处理队列中的下一个动画
                    if (this.animationQueue.length > 0) {
                        const next = this.animationQueue.shift();
                        this.applyMove(next.move).then(next.resolve);
                    }
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
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    getState() {
        // 获取当前魔方状态(简化版本)
        const state = [];
        // 这里需要根据实际小方块的位置和颜色来计算状态
        // 简化处理：返回默认状态
        return 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
    }
}

// 导出
window.RubiksCube3D = RubiksCube3D;

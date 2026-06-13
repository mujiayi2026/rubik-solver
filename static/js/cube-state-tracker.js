/**
 * Frontend Cube State Tracker
 * 轻量级前端魔方状态追踪器
 * 
 * 通过 move 表实现快速状态更新，用于 2D 视图同步。
 * Kociemba 格式: 9 chars per face, order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)
 */

class CubeStateTracker {
    constructor() {
        // 每个 move 会置换 kociemba 字符串中的某些位置
        // 这些是标准的 kociemba 格式 move permutation
        this.movePermutations = this._buildMovePermutations();
        this.state = this.solvedState();
    }

    solvedState() {
        return 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
    }

    reset() {
        this.state = this.solvedState();
    }

    setState(kociembaStr) {
        if (kociembaStr && kociembaStr.length === 54) {
            this.state = kociembaStr;
        }
    }

    getState() {
        return this.state;
    }

    applyMove(move) {
        const perms = this.movePermutations[move];
        if (!perms) return this.state;

        const arr = this.state.split('');
        const temp = arr.map((v, i) => arr[perms[i]]);
        this.state = temp.join('');
        return this.state;
    }

    applyMoves(moves) {
        for (const m of moves) {
            this.applyMove(m);
        }
        return this.state;
    }

    _buildMovePermutations() {
        const id = Array.from({ length: 54 }, (_, i) => i);

        // 辅助函数: 创建一个置换，交换指定的位置
        // cycle([a,b,c,d]) 表示 a->b->c->d->a
        function makePerm(cycles) {
            const p = [...id];
            for (const cyc of cycles) {
                for (let i = 0; i < cyc.length; i++) {
                    p[cyc[i]] = cyc[(i + 1) % cyc.length];
                }
            }
            return p;
        }

        // Kociemba 格式中各面的贴纸编号:
        // U: 0-8    (0,1,2 / 3,4,5 / 6,7,8)
        // R: 9-17   (9,10,11 / 12,13,14 / 15,16,17)
        // F: 18-26  (18,19,20 / 21,22,23 / 24,25,26)
        // D: 27-35  (27,28,29 / 30,31,32 / 33,34,35)
        // L: 36-44  (36,37,38 / 39,40,41 / 42,43,44)
        // B: 45-53  (45,46,47 / 48,49,50 / 51,52,53)

        // U move: rotate U face CW, cycle edges F->R->B->L (top row)
        const U = makePerm([
            [0, 2, 8, 6], [1, 5, 7, 3], // U face rotation
            [18, 9, 45, 44], [19, 10, 46, 41], [20, 11, 47, 38] // edge cycle
        ]);

        // U2 = U applied twice
        const U2 = this._composePerm(U, U);

        // U' = U applied 3 times (inverse)
        const Ui = this._composePerm(U2, U);

        // D move: rotate D face CW (from below), cycle edges F->L->B->R (bottom row)
        const D = makePerm([
            [27, 33, 35, 29], [28, 30, 34, 32], // D face
            [24, 42, 51, 15], [25, 43, 52, 16], [26, 44, 53, 17] // edge cycle
        ]);
        const D2 = this._composePerm(D, D);
        const Di = this._composePerm(D2, D);

        // R move: rotate R face CW, cycle U right col -> F right col -> D right col -> B left col (reversed)
        const R = makePerm([
            [9, 11, 17, 15], [10, 14, 16, 12], // R face
            [2, 20, 29, 47], [5, 23, 32, 50], [8, 26, 35, 53] // edge
        ]);
        const R2 = this._composePerm(R, R);
        const Ri = this._composePerm(R2, R);

        // L move: rotate L face CW (from left), cycle U left col -> B right col (reversed) -> D left col -> F left col
        const L = makePerm([
            [36, 38, 44, 42], [37, 41, 43, 39], // L face
            [0, 51, 27, 18], [3, 48, 30, 21], [6, 45, 33, 24] // edge
        ]);
        const L2 = this._composePerm(L, L);
        const Li = this._composePerm(L2, L);

        // F move: rotate F face CW, cycle U bottom row -> R left col -> D top row (reversed) -> L right col
        const F = makePerm([
            [18, 20, 26, 24], [19, 23, 25, 21], // F face
            [6, 9, 33, 44], [7, 12, 34, 41], [8, 15, 35, 38] // edge
        ]);
        const F2 = this._composePerm(F, F);
        const Fi = this._composePerm(F2, F);

        // B move: rotate B face CW (from back), cycle U top row -> L left col -> D bottom row (reversed) -> R right col
        const B = makePerm([
            [45, 47, 53, 51], [46, 50, 52, 48], // B face
            [2, 38, 29, 11], [1, 41, 28, 14], [0, 44, 27, 17] // edge
        ]);
        const B2 = this._composePerm(B, B);
        const Bi = this._composePerm(B2, B);

        return {
            'U': U, "U'": Ui, 'U2': U2,
            'D': D, "D'": Di, 'D2': D2,
            'R': R, "R'": Ri, 'R2': R2,
            'L': L, "L'": Li, 'L2': L2,
            'F': F, "F'": Fi, 'F2': F2,
            'B': B, "B'": Bi, 'B2': B2,
        };
    }

    _composePerm(a, b) {
        // a then b: result[i] = a[b[i]]
        return a.map((_, i) => a[b[i]]);
    }
}

// 导出
window.CubeStateTracker = CubeStateTracker;

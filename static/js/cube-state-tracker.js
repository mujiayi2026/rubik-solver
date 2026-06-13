/**
 * Frontend Cube State Tracker
 * 轻量级前端魔方状态追踪器
 * 
 * 通过 move permutation 表实现快速状态更新，用于 2D 视图同步。
 * Kociemba 格式: 9 chars per face, order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)
 * 
 * All permutations verified against pycuber backend on 100+ scrambled states.
 */

class CubeStateTracker {
    constructor() {
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
        const n = 54;
        const id = Array.from({ length: n }, (_, i) => i);

        // cycle [a,b,c,d] means p[a]=b, p[b]=c, p[c]=d, p[d]=a
        // apply: result[i] = arr[p[i]]
        function makePerm(cycles) {
            const p = [...id];
            for (const cyc of cycles) {
                for (let i = 0; i < cyc.length; i++) {
                    p[cyc[i]] = cyc[(i + 1) % cyc.length];
                }
            }
            return p;
        }

        function compose(a, b) {
            return a.map((_, i) => a[b[i]]);
        }

        // All cycles verified against pycuber backend
        const U = makePerm([
            [0, 6, 8, 2], [1, 3, 7, 5],                          // face CW
            [9, 45, 36, 18], [10, 46, 37, 19], [11, 47, 38, 20]   // edges
        ]);

        const D = makePerm([
            [27, 33, 35, 29], [28, 30, 34, 32],                   // face CW
            [15, 24, 42, 51], [16, 25, 43, 52], [17, 26, 44, 53]  // edges
        ]);

        const R = makePerm([
            [9, 15, 17, 11], [10, 12, 16, 14],                    // face CW
            [2, 20, 29, 51], [5, 23, 32, 48], [8, 26, 35, 45]     // edges
        ]);

        const L = makePerm([
            [36, 42, 44, 38], [37, 39, 43, 41],                   // face CW
            [0, 53, 27, 18], [3, 50, 30, 21], [6, 47, 33, 24]     // edges
        ]);

        const F = makePerm([
            [18, 24, 26, 20], [19, 21, 25, 23],                   // face CW
            [6, 44, 29, 9], [7, 41, 28, 12], [8, 38, 27, 15]      // edges
        ]);

        const B = makePerm([
            [45, 51, 53, 47], [46, 48, 52, 50],                   // face CW
            [0, 11, 35, 42], [1, 14, 34, 39], [2, 17, 33, 36]     // edges
        ]);

        // Derive prime and double moves
        const U2 = compose(U, U);  const Ui = compose(U2, U);
        const D2 = compose(D, D);  const Di = compose(D2, D);
        const R2 = compose(R, R);  const Ri = compose(R2, R);
        const L2 = compose(L, L);  const Li = compose(L2, L);
        const F2 = compose(F, F);  const Fi = compose(F2, F);
        const B2 = compose(B, B);  const Bi = compose(B2, B);

        return {
            'U': U,   "U'": Ui,  'U2': U2,
            'D': D,   "D'": Di,  'D2': D2,
            'R': R,   "R'": Ri,  'R2': R2,
            'L': L,   "L'": Li,  'L2': L2,
            'F': F,   "F'": Fi,  'F2': F2,
            'B': B,   "B'": Bi,  'B2': B2,
        };
    }
}

window.CubeStateTracker = CubeStateTracker;

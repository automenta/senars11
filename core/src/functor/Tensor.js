/**
 * N-dimensional array with optional gradient tracking (Tier 2)
 */
export class Tensor {
    constructor(data, options = {}) {
        this.data = this._flatten(data);
        this.shape = this._inferShape(data);
        this.requiresGrad = options.requiresGrad ?? false;
        this.backend = options.backend ?? null;
        this.grad = null;
        this._gradFn = null;
        this._parents = [];
    }


    _inferShape(data) {
        if (typeof data === 'number') return [1];
        if (!Array.isArray(data)) return [1];

        const shape = [];
        let current = data;
        while (Array.isArray(current)) {
            shape.push(current.length);
            current = current[0];
        }
        return shape;
    }

    _flatten(data) {
        if (typeof data === 'number') return [data];
        if (!Array.isArray(data)) return [data];

        const result = [];
        const flatten = (arr) => {
            for (const item of arr) {
                if (Array.isArray(item)) {
                    flatten(item);
                } else {
                    result.push(Number(item));
                }
            }
        };
        flatten(data);
        return result;
    }

    _unflatten(flat, shape) {
        if (shape.length === 1) return flat.slice(0, shape[0]);

        const result = [];
        const stride = shape.slice(1).reduce((a, b) => a * b, 1);

        for (let i = 0; i < shape[0]; i++) {
            const slice = flat.slice(i * stride, (i + 1) * stride);
            result.push(this._unflatten(slice, shape.slice(1)));
        }
        return result;
    }


    get ndim() {
        return this.shape.length;
    }

    get size() {
        return this.shape.reduce((a, b) => a * b, 1);
    }


    reshape(newShape) {
        const newSize = newShape.reduce((a, b) => a * b, 1);
        if (newSize !== this.size) {
            throw new Error(`Cannot reshape tensor of size ${this.size} to shape ${newShape}`);
        }

        const newTensor = new Tensor(this.data.slice(), {
            requiresGrad: this.requiresGrad,
            backend: this.backend
        });
        newTensor.shape = newShape.slice();
        return newTensor;
    }

    transpose(axes) {
        if (!axes) {
            if (this.ndim === 2) {
                axes = [1, 0];
            } else {
                axes = Array.from({ length: this.ndim }, (_, i) => this.ndim - 1 - i);
            }
        }

        // Validate axes
        if (axes.length !== this.ndim) {
            throw new Error(`Transpose axes must match ndim ${this.ndim}`);
        }

        const newShape = axes.map(i => this.shape[i]);
        const newData = new Array(this.size);

        // Compute strides for old and new layout
        const oldStrides = this._computeStrides(this.shape);
        const newStrides = this._computeStrides(newShape);

        for (let newIdx = 0; newIdx < this.size; newIdx++) {
            const newCoords = this._indexToCoords(newIdx, newStrides);
            // Map new coordinates to old coordinates: oldCoords[axes[i]] = newCoords[i]
            const oldCoords = new Array(this.ndim);
            for (let i = 0; i < this.ndim; i++) {
                oldCoords[axes[i]] = newCoords[i];
            }
            const oldIdx = this._coordsToIndex(oldCoords, oldStrides);
            newData[newIdx] = this.data[oldIdx];
        }

        const result = new Tensor(0, { requiresGrad: this.requiresGrad, backend: this.backend });
        result.data = newData;
        result.shape = newShape;
        return result;
    }

    _computeStrides(shape) {
        const strides = new Array(shape.length);
        strides[strides.length - 1] = 1;
        for (let i = strides.length - 2; i >= 0; i--) {
            strides[i] = strides[i + 1] * shape[i + 1];
        }
        return strides;
    }

    _indexToCoords(index, strides) {
        const coords = new Array(strides.length);
        for (let i = 0; i < strides.length; i++) {
            coords[i] = Math.floor(index / strides[i]);
            index %= strides[i];
        }
        return coords;
    }

    _coordsToIndex(coords, strides) {
        return coords.reduce((sum, coord, i) => sum + coord * strides[i], 0);
    }


    toJSON() {
        return {
            data: this._unflatten(this.data, this.shape),
            shape: this.shape,
            requiresGrad: this.requiresGrad
        };
    }

    static fromJSON(json) {
        return new Tensor(json.data, {
            requiresGrad: json.requiresGrad ?? false
        });
    }


    toArray() {
        return this._unflatten(this.data, this.shape);
    }

    toString() {
        return `Tensor(shape=${this.shape.join('x')}, data=${JSON.stringify(this.toArray())})`;
    }


    get(indices) {
        if (!Array.isArray(indices)) indices = [indices];
        const strides = this._computeStrides(this.shape);
        const index = this._coordsToIndex(indices, strides);
        return this.data[index];
    }

    set(indices, value) {
        if (!Array.isArray(indices)) indices = [indices];
        const strides = this._computeStrides(this.shape);
        const index = this._coordsToIndex(indices, strides);
        this.data[index] = value;
    }


    // === Autograd (Tier 2) ===

    backward() {
        if (!this.requiresGrad) return;

        if (this.grad === null) {
            this.grad = this.backend?.ones(this.shape) ??
                Object.assign(new Tensor(new Array(this.size).fill(1), { backend: this.backend }),
                    { shape: this.shape.slice() });
        }

        this._topologicalSort().forEach(tensor => tensor._gradFn?.());
    }

    _topologicalSort() {
        const topo = [];
        const visited = new Set();

        const dfs = (tensor) => {
            if (visited.has(tensor) || !tensor.requiresGrad) return;
            visited.add(tensor);
            tensor._parents?.forEach(dfs);
            topo.push(tensor);
        };

        dfs(this);
        return topo.reverse();
    }

    zeroGrad() {
        this.grad = null;
        this._parents?.forEach(parent => parent.zeroGrad?.());
    }
}


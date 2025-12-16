export class DataLoader {
    constructor(dataset, batchSize = 32, shuffle = false, collateFn = null) {
        this.dataset = dataset;
        this.batchSize = batchSize;
        this.shuffle = shuffle;
        this.collateFn = collateFn ?? this._defaultCollate;
    }

    _defaultCollate(batch) {
        return batch;
    }

    *[Symbol.iterator]() {
        let indices = [...Array(this.dataset.length).keys()];
        if (this.shuffle) {
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
        }
        for (let i = 0; i < indices.length; i += this.batchSize) {
            const batchIndices = indices.slice(i, i + this.batchSize);
            const batch = batchIndices.map(idx => this.dataset[idx]);
            yield this.collateFn(batch);
        }
    }
}

export class LRScheduler {
    constructor(optimizer, mode = 'step', ...args) {
        this.optimizer = optimizer;
        this.mode = mode;
        this.baseLR = optimizer.lr;
        this.stepSize = args[0] ?? 30;
        this.gamma = args[1] ?? 0.1;
        this.maxEpochs = args[2] ?? 100;
    }

    step(epoch) {
        switch (this.mode) {
            case 'step':
                this.optimizer.lr = this.baseLR * Math.pow(this.gamma, Math.floor(epoch / this.stepSize));
                break;
            case 'exponential':
                this.optimizer.lr = this.baseLR * Math.exp(-0.1 * epoch);
                break;
            case 'cosine':
                this.optimizer.lr = this.baseLR * 0.5 * (1 + Math.cos(Math.PI * epoch / this.maxEpochs));
                break;
            default:
                throw new Error(`Unknown LR scheduler mode: ${this.mode}`);
        }
    }
}

export class EarlyStopping {
    constructor(patience = 5, minDelta = 0) {
        this.patience = patience;
        this.minDelta = minDelta;
        this.bestLoss = Infinity;
        this.counter = 0;
    }

    step(loss) {
        if (loss < this.bestLoss - this.minDelta) {
            this.bestLoss = loss;
            this.counter = 0;
            return false;
        }
        this.counter++;
        return this.counter >= this.patience;
    }

    reset() {
        this.bestLoss = Infinity;
        this.counter = 0;
    }
}

export class MetricsTracker {
    constructor() {
        this.history = {};
    }

    log(epoch, metrics) {
        for (const [key, value] of Object.entries(metrics)) {
            if (!this.history[key]) this.history[key] = [];
            this.history[key].push({ epoch, value });
        }
    }

    get(metric) {
        return this.history[metric] ?? [];
    }

    clear() {
        this.history = {};
    }

    summary() {
        const summary = {};
        for (const [metric, values] of Object.entries(this.history)) {
            const latest = values[values.length - 1];
            const best = metric.includes('loss') || metric.includes('error')
                ? values.reduce((min, v) => v.value < min.value ? v : min)
                : values.reduce((max, v) => v.value > max.value ? v : max);
            summary[metric] = { latest: latest.value, best: best.value, bestEpoch: best.epoch };
        }
        return summary;
    }
}

// === Tier 3 Scaffolds (inline stubs) ===

export class SymbolicBackend {
    constructor() {
        throw new Error('SymbolicBackend not yet implemented - placeholder for symbolic computation graph');
    }
}

export class TensorOptimizer {
    constructor() {
        throw new Error('TensorOptimizer not yet implemented - placeholder for graph optimization passes');
    }
}

export class ONNXExporter {
    constructor() {
        throw new Error('ONNXExporter not yet implemented - placeholder for ONNX export');
    }
}

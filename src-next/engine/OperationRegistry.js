export class OperationRegistry {
    constructor() {
        this.ops = new Map();
    }

    register(name, handler) {
        this.ops.set(name, handler);
    }

    get(name) {
        return this.ops.get(name);
    }

    has(name) {
        return this.ops.has(name);
    }
}

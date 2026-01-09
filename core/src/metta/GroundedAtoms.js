import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { BUILTIN_OPERATIONS } from './helpers/MeTTaLib.js';

export class GroundedAtoms extends BaseMeTTaComponent {
    constructor(functorRegistry, config = {}, eventBus = null, termFactory = null) {
        super(config, 'GroundedAtoms', eventBus, termFactory);
        this.functorRegistry = functorRegistry;
        this.grounded = new Map();
        this.spaces = new Map();
        this._registerBuiltins();
    }

    _registerBuiltins() {
        this.register('&self', () => this.getCurrentSpace());

        for (const [op, fn] of Object.entries(BUILTIN_OPERATIONS.arithmetic)) {
            this.register(op, (...args) => {
                const nums = args.map(arg => Number(arg?.name ?? arg));
                return this.termFactory.atomic(String(fn(...nums)));
            });
        }

        const boolTerm = val => val ? this.termFactory.createTrue() : this.termFactory.createFalse();
        const makeCmp = fn => (a, b) => boolTerm(fn(Number(a?.name ?? a), Number(b?.name ?? b)));

        this.register('<', makeCmp((a, b) => a < b));
        this.register('>', makeCmp((a, b) => a > b));
        this.register('==', (a, b) => boolTerm((a?.name ?? a) === (b?.name ?? b)));

        this.register('&and', (...args) => boolTerm(args.every(a => (a?.name ?? a) === 'True')));
        this.register('&or', (...args) => boolTerm(args.some(a => (a?.name ?? a) === 'True')));
        this.register('&not', a => boolTerm((a?.name ?? a) !== 'True'));
    }

    _normalizeName(name) { return name.startsWith('&') ? name : `&${name}`; }

    register(name, executor) {
        this.trackOperation('register', () => {
            const normalized = this._normalizeName(name);
            this.grounded.set(normalized, executor);
            this.emitMeTTaEvent('grounded-registered', { name: normalized });
        });
    }

    execute(name, ...args) {
        return this.trackOperation('execute', () => {
            const normalized = this._normalizeName(name);
            const executor = this.grounded.get(normalized);
            if (!executor) throw new Error(`Grounded atom not found: ${normalized}`);
            this.emitMeTTaEvent('grounded-executed', { name: normalized, argCount: args.length });
            return executor(...args);
        });
    }

    has(name) { return this.grounded.has(this._normalizeName(name)); }
    getCurrentSpace() { return this.spaces.get('default') ?? null; }
    setSpace(name, space) { this.spaces.set(name, space); }
    getStats() { return { ...super.getStats(), groundedCount: this.grounded.size, spaceCount: this.spaces.size }; }
}


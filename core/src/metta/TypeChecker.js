import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TypeMismatchError } from './helpers/MeTTaHelpers.js';
import { TypeConstructors, freshTypeVar } from './helpers/TypeUtils.js';
import { HindleyMilnerUnification } from './strategies/UnificationStrategy.js';



export class TypeChecker extends BaseMeTTaComponent {
    /**
     * @param {TypeSystem} typeSystem
     * @param {Object} config
     * @param {Object} config.unificationStrategy - Custom unification strategy
     * @param {EventBus} eventBus
     * @param {TermFactory} termFactory
     */
    constructor(typeSystem, config = {}, eventBus = null, termFactory = null) {
        super(config, 'TypeChecker', eventBus, termFactory);
        this.typeSystem = typeSystem;
        this.unificationStrategy = config.unificationStrategy ?? new HindleyMilnerUnification();
        this.constraints = [];
        this.typeEnv = new Map();
    }

    infer(term, context = new Map()) {
        return this.trackOperation('infer', () => {
            this.constraints = [];
            const { type, constraints } = this.generate(term, context);
            const substitution = this.solve(constraints);
            return this.apply(substitution, type);
        });
    }

    check(term, expectedType, context = new Map()) {
        return this.trackOperation('check', () => {
            const inferredType = this.infer(term, context);
            // Use strategy for type equality check
            return this.unificationStrategy.typeEquals(inferredType, expectedType);
        });
    }

    generate(term, context) {
        if (term.name?.startsWith('$')) {
            const varType = context.get(term.name) ?? freshTypeVar();
            return { type: varType, constraints: [] };
        }

        if (!term.operator) {
            if (!isNaN(Number(term.name))) return { type: TypeConstructors.Number, constraints: [] };
            if (term.name?.startsWith('"')) return { type: TypeConstructors.String, constraints: [] };
            if (['True', 'False'].includes(term.name)) return { type: TypeConstructors.Bool, constraints: [] };
            return { type: context.get(term.name) ?? TypeConstructors.Atom, constraints: [] };
        }

        if (term.operator === '^') {
            const [func, args] = term.components;
            const { type: fType, constraints: fC } = this.generate(func, context);
            const { type: argType, constraints: argC } = this.generate(args, context);
            const resultType = freshTypeVar();

            return {
                type: resultType,
                constraints: [...fC, ...argC, { lhs: fType, rhs: TypeConstructors.Arrow(argType, resultType) }]
            };
        }

        if (term.operator === '*') {
            if (term.components.length > 0) return this.generate(term.components[0], context);
            return { type: TypeConstructors.Atom, constraints: [] };
        }

        if (term.operator === '=') {
            const [{ type: t1, constraints: c1 }, { type: t2, constraints: c2 }] = term.components.map(c => this.generate(c, context));
            return {
                type: TypeConstructors.Bool,
                constraints: [...c1, ...c2, { lhs: t1, rhs: t2 }]
            };
        }

        return { type: TypeConstructors.Atom, constraints: [] };
    }

    // Delegate core unification logic to strategy
    unify(t1, t2, subst) {
        return this.unificationStrategy.unify(t1, t2, subst);
    }

    solve(constraints) {
        return this.unificationStrategy.solve(constraints, this.typeToString.bind(this));
    }

    apply(subst, type) {
        return this.unificationStrategy.apply(subst, type);
    }

    typeToString(type) {
        if (!type) return 'Unknown';
        if (type.kind === 'TypeVar') return `t${type.id}`;
        if (type.kind === 'Arrow') return `(-> ${this.typeToString(type.from)} ${this.typeToString(type.to)})`;
        if (type.kind === 'List') return `(List ${this.typeToString(type.elemType)})`;
        if (type.kind === 'Maybe') return `(Maybe ${this.typeToString(type.elemType)})`;
        if (type.kind === 'Either') return `(Either ${this.typeToString(type.left)} ${this.typeToString(type.right)})`;
        if (type.kind === 'Vector') return `(Vector ${type.length})`;
        if (type.kind === 'Forall') return `(∀ ${type.var} ${this.typeToString(type.type)})`;
        return type.kind || 'Unknown';
    }

    // Exposed for tests or legacy use, effectively delegates to strategy via check() logic usually
    typeEquals(t1, t2) {
        return this.unificationStrategy.typeEquals(t1, t2);
    }
}

export const StandardOps = {
    'add': (args) => {
        const sum = args.reduce((acc, t) => acc + Number(t.name), 0);
        return sum;
    },

    'sub': (args) => {
        if (args.length < 2) return 0;
        return Number(args[0].name) - Number(args[1].name);
    },

    'log': (args) => {
        console.log('OP LOG:', ...args.map(a => a.name));
        return null; // No result task
    },

    'wait': (args) => {
        const ms = Number(args[0]?.name || 1000);
        const start = Date.now();
        while (Date.now() - start < ms) {} // Busy wait
        return 'done';
    }
};

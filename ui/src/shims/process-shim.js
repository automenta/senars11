
export const process = {
    cwd: () => '/',
    env: { NODE_ENV: 'production' },
    platform: 'browser',
    argv: [],
    stdout: { write: () => { } },
    stderr: { write: () => { } },
    versions: { node: '0.0.0' },
    on: () => { },
    exit: () => { },
    nextTick: (cb) => setTimeout(cb, 0),
};
globalThis.process = process;

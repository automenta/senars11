export default {
    readFile: async () => "{}",
    writeFile: async () => { },
    access: async () => { },
    stat: async () => ({ isDirectory: () => false }),
    mkdir: async () => { },
    readdir: async () => [],
    rm: async () => { },
    constants: {}
};

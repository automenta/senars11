// fs
export const readFile = async () => "{}";
export const writeFile = async () => { };
export const access = async () => { };
export const stat = async () => ({ isDirectory: () => false });
export const mkdir = async () => { };
export const readdir = async () => [];
export const rm = async () => { };
export const constants = {};
export const promises = { readFile, writeFile, access, stat, mkdir, readdir, rm, constants };

// path
export const join = (...args) => args.join('/');
export const resolve = (...args) => args.join('/');
export const dirname = (path) => path;
export const basename = (path) => path;
export const extname = (path) => '';

// child_process
export const spawn = () => ({ on: () => { }, stdout: { on: () => { } }, stderr: { on: () => { } } });
export const exec = () => { };

// os
export const platform = () => 'browser';
export const arch = () => 'javascript';

// crypto
export const randomUUID = () => 'uuid';
export const createHash = () => ({ update: () => { }, digest: () => 'hash' });

export default {
    readFile, writeFile, access, stat, mkdir, readdir, rm, constants, promises,
    join, resolve, dirname, basename, extname,
    spawn, exec,
    platform, arch,
    randomUUID, createHash
};

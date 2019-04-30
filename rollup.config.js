import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import replace from 'rollup-plugin-replace';
import typescript from 'rollup-plugin-typescript2'

const pkg = require('./package.json');

export default {
    input: './src/index.ts',
    output: [
        { file: pkg.main, format: 'umd', name: 'pouchVue' },
    ],
    plugins: [
        json(),
        resolve(),
        commonjs(),
        replace({ __VERSION__: pkg.version }),
        typescript( {typescript: require("typescript"), useTsconfigDeclarationDir: true }),
    ],
    banner: `
    /**
     * pouch vue v${pkg.version}
     * (c) ${new Date().getFullYear()} Simon Kunz
     * @license MIT
     */
  `.replace(/ {4}/gm, '').trim(),
};

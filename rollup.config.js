import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import buble from 'rollup-plugin-buble';

const pkg = require('./package.json');

export default {
    input: './src/index.js',
    output: [
        { file: pkg.main, format: 'umd', name: 'vue-pouch-adapter' },
    ],
    plugins: [
        json(),
        resolve(),
        commonjs(),
        buble(),
    ],
    banner: `
    /**
     * vue-pouch-adapter v${pkg.version}
     * (c) ${new Date().getFullYear()} Simon Kunz
     * @license MIT
     */
  `.replace(/ {4}/gm, '').trim(),
};

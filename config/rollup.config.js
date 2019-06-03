const path = require('path');
const resolve = require('rollup-plugin-node-resolve');
const babel = require('rollup-plugin-babel');

const entry = path.join(__dirname, '..', 'src', 'index.js');
const bundleName = 'deltaJS';

module.exports = {
  input: entry,
  output: [
    {
      file: 'lib/deltaJS.js',
      format: 'cjs'
    },
    {
      file: 'umd/deltaJS.js',
      format: 'umd'
    },
    {
      file: 'es/deltaJS.js',
      format: 'esm'
    }
  ],
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**' // only transpile our source code
    })
  ]
};

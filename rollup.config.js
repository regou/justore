import pkg from './package.json'
import buble from 'rollup-plugin-buble'

const deps = [
  'rxjs',
  'rxjs/operators',
  ...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.devDependencies)
]

module.exports = [
  {
    input: 'src/index.js',
    output: [
      {
        sourcemap: true,
        exports: 'named',
        file: pkg.module,
        format: 'es'
      },
      {
        sourcemap: true,
        file: pkg.main,
        format: 'cjs'
      }
    ],
    plugins: [buble()],
    external: deps
  }
]

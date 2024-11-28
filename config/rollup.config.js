// rollup.config.js
import alias from '@rollup/plugin-alias';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';
import json from "@rollup/plugin-json";
import path from 'path';

export default {
  input: {
    common: "src/common/index.js",
    error: "src/error/index.js",
    network: "src/network/index.js",
    async: "src/async/index.js",
    security: "src/security/index.js",
    storage: "src/storage/index.js",
    sync: "src/sync/index.js",
  },
  output: [
    {
      dir: "dist",
      format: "es",
      sourcemap: true,
      entryFileNames: "[name]/index.js", // output like dist/security/index.js
      chunkFileNames: "shared/[name]-[hash].js",
      exports: "named",
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    {
      dir: "dist",
      format: "cjs",
      sourcemap: true,
      entryFileNames: "[name]/index.cjs",
      chunkFileNames: "shared/[name]-[hash].cjs",
      exports: "named",
      preserveModules: true,
      preserveModulesRoot: "src",
    }
  ],
  plugins: [
    alias({
      entries: [
        { find: '@', replacement: path.resolve(import.meta.dirname, '..') } // resolves @/src/...
      ]
    }),
    resolve(), // So Rollup can find node_modules
    commonjs(), // Converts CJS modules to ESM (e.g., for libsodium)
    terser(), // optional minification
    json(),
  ],
  external: ["libsodium-wrappers-sumo"], // add external deps here, e.g., ['libsodium-wrappers-sumo']
};

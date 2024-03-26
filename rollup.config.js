import typescript from "@rollup/plugin-typescript"
// import pkg from './package.json'

export default {
    input: "./src/index.ts",
    output: [
        // 库打包几种类型
        // 1. cjs -> commonjs
        // 2. esm
        {
            format: "cjs",
            file: "lib/guide-mini-vue.cjs.js"
            // file: pkg.main
        },
        {
            format: "es",
            file: "lib/guide-mini-vue.esm.js"
            // file: pkg.module
        },
    ],
    // 当前的代码是用ts写的，rollup是不理解的，需要编译一下
    plugins: [
        typescript(),
    ],
}
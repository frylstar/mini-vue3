
## rollup
`rollup`天然就支持esm，可以直接去写esm语法。
Rollup 是一个用于 JavaScript 的模块打包工具，它将小的代码片段编译成更大、更复杂的代码，例如库或应用程序。它使用 JavaScript 的 ES6 版本中包含的新标准化代码模块格式，而不是以前的 CommonJS 和 AMD 等特殊解决方案。ES 模块允许你自由无缝地组合你最喜欢的库中最有用的个别函数。这在未来将在所有场景原生支持，但 Rollup 让你今天就可以开始这样做。

1. 安装`rollup`
`yarn add rollup --dev`
2. 创建`rollup.config.js`文件
3. 在src目录创建`index.ts`,作为整个`mini-vue`的input入口
4. 当前的代码是用ts写的，rollup是不理解的，需要编译一下，用到插件`@rollup/plugin-typescript`
5. `package.json`文件的`scripts`中去配置`rollup`的打包命令
```
"scripts": {
    "build": "rollup -c rollup.config.js"
}
```
6. 将tsconfig.json中的 `"module": "commonjs"`修改为 `"module": "esnext"`
7. `yarn add tslib --dev`

```
package.json中
// cjs -> main
// esm -> module
"main": "lib/guide-mini-vue.cjs.js",
"module": "lib/guide-mini-vue.esm.js"
```

### 遇到的问题
Q：yarn build报错如下：
```
$ rollup -c rollup.config.js
(node:45665) Warning: To load an ES module, set "type": "module" in the package.json or use the .mjs extension.
(Use `node --trace-warnings ...` to show where the warning was created)
[!] RollupError: Node tried to load your configuration file as CommonJS even though it is likely an ES module. To resolve this, change the extension of your configuration to ".mjs", set "type": "module" in your package.json file or pass the "--bundleConfigAsCjs" flag.

Original error: Cannot use import statement outside a module
https://rollupjs.org/command-line-interface/#bundleconfigascjs
/Users/cyan/mini-vue3/rollup.config.js:1
import typescript from "@rollup/plugin-typescript"
^^^^^^

SyntaxError: Cannot use import statement outside a module
```
A：这个错误是因为 Rollup 默认按照 CommonJS 的方式加载配置文件，而你的配置文件是使用 ES 模块语法的。为了解决这个问题，你可以按照以下几种方式之一进行操作：

将配置文件的后缀名改为 .mjs，比如将 rollup.config.js 改为 rollup.config.mjs。

在 package.json 文件中添加 "type": "module"，告诉 Node.js 使用 ES 模块的方式加载文件。示例：
```
json
{
  "type": "module"
}
```
在运行 Rollup 命令时添加 --bundleConfigAsCjs 标志，强制将配置文件作为 CommonJS 加载。示例：

rollup -c rollup.config.js --bundleConfigAsCjs

Q：
```
$ rollup -c rollup.config.js

./src/index.ts → lib/guide-mini-vue.cjs.js, lib/guide-mini-vue.esm.js...
[!] (plugin typescript) RollupError: [plugin typescript] @rollup/plugin-typescript: Could not find module 'tslib', which is required by this plugin. Is it installed?
```

A：`yarn add tslib --dev`
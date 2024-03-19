/**
 * yarn add jest @types/jest --dev
 * @types/jest 就是导出了一堆.d.ts文件，在哪里声明的
 * 如何vscode还是有报错，需要在tsconfig.json文件的types:['jest']
 * "scripts": { "test": "jest" },
 * tsconfig文件中的 noImplicitAny可以配置是否允许写any类型
 * jest运行环境是nodeJs，默认模块规范是CommonJS规范，所以我们需要转换一下，用到babel
 * https://jestjs.io/zh-Hans/docs/getting-started#%E4%BD%BF%E7%94%A8-babel
 * 还需要babel使用TypeScript
 */
import { add } from '../index'

it('init', () => {
    // expect(true).toBe(true)
    expect(add(1, 1)).toBe(2)
})
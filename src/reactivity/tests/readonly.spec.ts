import { readonly, isReadonly, isProxy } from "../reactive"

describe('readonly', () => {
    it('happy path', () => {
        // not set 不能去set，不会触发依赖，所以也不需要依赖收集
        const original = { foo: 1, bar: { baz: 2} }
        const wrapped = readonly(original)
        expect(wrapped).not.toBe(original)
        expect(isReadonly(wrapped)).toBe(true)
        expect(isReadonly(original)).toBe(false)
        // 嵌套转换测试
        expect(isReadonly(wrapped.bar)).toBe(true)
        expect(isReadonly(original.bar)).toBe(false)
        expect(isProxy(wrapped)).toBe(true)

        expect(wrapped.foo).toBe(1)
    })

    it('warn then call set', () => {
        // mock
        console.warn = jest.fn()

        const user = readonly({ age: 10 })
        user.age = 11

        expect(console.warn).toHaveBeenCalled()
    })
})
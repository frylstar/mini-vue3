import { reactive, isReactive, isProxy } from "../reactive"

describe('reactive', () => {
    it('happy path', () => {
        const original = { foo: 1 }
        const observed = reactive(original)
        expect(observed).not.toBe(original)
        expect(observed.foo).toBe(1)
        // 判断对象是不是一个reactive类型
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(original)).toBe(false)
        expect(isProxy(observed)).toBe(true)
    })
    // reactive嵌套转换
    test("nested reactive", () => {
        const original = {
            nested: {
                foo: 1,
            },
            array: [{ bar: 2 }]
        }
        const observed = reactive(original)
        expect(isReactive(observed.nested)).toBe(true)
        expect(isReactive(observed.array)).toBe(true)
        expect(isReactive(observed.array[0])).toBe(true)
    })
})
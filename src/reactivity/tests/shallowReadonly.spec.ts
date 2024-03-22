import { isReadonly, shallowReadonly } from "../reactive"

// 只有浅层是响应式对象，一般用于程序优化（不需要把所有嵌套对象都转换为响应式
describe('shallowReadonly', () => {
    test('should not make non-reactive properties reactive ', () => {
        const props = shallowReadonly({ n: { foo: 1 } })
        expect(isReadonly(props)).toBe(true)
        expect(isReadonly(props.n)).toBe(false)
    })

    it('warn then call set', () => {
        // mock
        console.warn = jest.fn()

        const user = shallowReadonly({ age: 10 })
        user.age = 11

        expect(console.warn).toHaveBeenCalled()
    })
}) 
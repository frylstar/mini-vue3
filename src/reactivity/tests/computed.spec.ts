import { reactive } from "../reactive"
import { computed } from '../computed'

/**
 * 接受一个 getter 函数，返回一个只读的响应式 ref 对象。该 ref 通过 .value 暴露 getter 函数的返回值。
 * 它也可以接受一个带有 get 和 set 函数的对象来创建一个可写的 ref 对象。
 */
describe('computed', () => {
    it('happy path', () => {
        const user = reactive({
            age: 1,
        })

        const age = computed(() => {
            return user.age
        })

        expect(age.value).toBe(1)
    })

    it('should compute lazily', () => {
        const value = reactive({
            foo: 1
        })

        const getter = jest.fn(() => {
            return value.foo
        })
        const cValue = computed(getter)
        // lazy 不去获取计算属性的话，不会触发getter
        expect(getter).not.toHaveBeenCalled()

        expect(cValue.value).toBe(1)
        expect(getter).toHaveBeenCalledTimes(1)

        // should not compute again
        cValue.value;
        expect(getter).toHaveBeenCalledTimes(1) // 再次获取，依赖值没变的话不会再次触发getter

        // now it should compute
        value.foo = 2
        expect(cValue.value).toBe(2)
        expect(getter).toHaveBeenCalledTimes(2)

        // should not compute again
        cValue.value;
        expect(getter).toHaveBeenCalledTimes(2)
    })
})
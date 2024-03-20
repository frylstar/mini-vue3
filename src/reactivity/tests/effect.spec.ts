import { reactive } from "../reactive";
import { effect } from "../effect";

describe('effect', () => {
    it('happy path', () => {
        const user = reactive({
            age: 10,
        })

        let nextAge;
        effect(() => {
            nextAge = user.age + 1
        })

        expect(nextAge).toBe(11)

        // update
        user.age++
        expect(nextAge).toBe(12)
    })

    // 为啥这里需要返回runner函数呢？
    it('should return runner when call effect', () => {
        // 1. effect(fn) -> function(runner) -> fn -> return fn的返回值
        let foo = 10
        const runner = effect(() => {
            foo++
            return "foo"
        })

        expect(foo).toBe(11)
        const r = runner()
        expect(foo).toBe(12)
        expect(r).toBe('foo')
    })
})
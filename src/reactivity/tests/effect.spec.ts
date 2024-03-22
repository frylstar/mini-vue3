import { reactive } from "../reactive";
import { effect, stop } from "../effect";

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


    it("scheduler", () => {
        /**
         * 1. 通过 effect 的第二个参数给定的一个 scheduler 的fn
         * 2. effect 第一次执行的时候 还会执行 fn
         * 3. 当响应式对象 set 的时候 也就是更新update的时候，不会执行fn，而是执行 scheduler
         * 4. 如果说当执行 runner 的时候，会再次的执行fn
         */
        let dummy
        let run: any
        // scheduler 是一个使用 Jest 提供的 jest.fn() 方法创建的模拟函数
        const scheduler = jest.fn(() => {
            run = runner
        })
        const obj = reactive({ foo: 1 })
        const runner = effect(
            () => {
                dummy = obj.foo
            },
            { scheduler }
        )
        expect(scheduler).not.toHaveBeenCalled()
        expect(dummy).toBe(1)
        // should be called on first trigger
        obj.foo++
        expect(scheduler).toHaveBeenCalledTimes(1)
        // should not run yet
        expect(dummy).toBe(1)
        // manually run
        run()
        // should have run
        expect(dummy).toBe(2)
    })

    // 实现effect的stop功能
    it('stop', () => {
        let dummy
        const obj = reactive({ prop: 1 })
        const runner = effect(() => {
            dummy = obj.prop
        })
        obj.prop = 2
        expect(dummy).toBe(2)
        stop(runner)
        // obj.prop = 3 // 这样的时候stop可以生效
        obj.prop++ // obj.prop = obj.prop + 1 这时候会再次触发 getter 重新收集依赖，stop失效了
        // shouldTrack修改代码，增加一个开关，只有在fn中触发getter才会打开开关并收集依赖，收集完成后关闭开关
        expect(dummy).toBe(2)
        // stopped effect should still be manually callable
        runner()
        expect(dummy).toBe(3)
    })

    it('onStop', () => {
        const obj = reactive({ foo: 1 })
        const onStop = jest.fn()
        let dummy
        const runner = effect(
            () => {
                dummy = obj.foo
            },
            { onStop }
        )

        stop(runner)
        expect(onStop).toHaveBeenCalledTimes(1)
    })
})
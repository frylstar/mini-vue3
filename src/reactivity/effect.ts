class ReactiveEffect {
    private _fn: any;

    constructor(fn, public scheduler?) {
        this._fn = fn
    }

    run() {
        activeEffect = this
        return this._fn()
    }
}

const targetMap = new Map()
export function track(target, key) {
    // target -> key -> dep
    let depsMap = targetMap.get(target)
    // 初始化的时候，如果depsMap没有的话，创建一个
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }

    let dep = depsMap.get(key)
    if (!dep) {
        // dep是Set ?
        dep = new Set()
        depsMap.set(key, dep)
    }

    // 这里需要拿到fn，那么我们应该如何拿到fn呢？
    // 可以利用一个全局变量去获取
    dep.add(activeEffect)
}

export function trigger(target, key) {
    // 把之前key对应的dep依赖取出来
    let depsMap = targetMap.get(target)

    let dep = depsMap.get(key)

    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}


let activeEffect;

export function effect(fn, options: any = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler)

    _effect.run()

    const runner = _effect.run.bind(_effect)

    return runner
}
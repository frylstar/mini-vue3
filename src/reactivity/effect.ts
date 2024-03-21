import { extend } from "../shared";
class ReactiveEffect {
    private _fn: any;
    deps = [];
    active = true;
    onStop?: Function | null;
    public scheduler: Function | undefined;

    constructor(fn, scheduler?: Function) {
        this._fn = fn
        this.scheduler = scheduler
    }

    run() {
        activeEffect = this
        return this._fn()
    }

    stop() {
        if (this.active) {
            cleanupEffect(this)
            if (this.onStop) {
                this.onStop()
            }
            this.active = false
        }
    }
}

function cleanupEffect(effect) {
    effect.deps.forEach((dep: any) => {
        dep.delete(effect)
    })
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

    if (!activeEffect) return
    // 这里需要拿到fn，那么我们应该如何拿到fn呢？
    // 可以利用一个全局变量去获取
    dep.add(activeEffect)
    // 在实例中存储dep，(当没有调用effect的时候，activeEffect为undefined，需要加个判断
    activeEffect.deps.push(dep)
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
    // options
    // _effect.onStop = options.onStop
    // Object.assign(_effect, options)
    extend(_effect, options)

    _effect.run()

    const runner: any = _effect.run.bind(_effect)
    // 方便stop
    runner.effect = _effect

    return runner
}


export function stop(runner) {
    runner.effect.stop()
}
import { track, trigger } from './effect'
import { ReactiveFlags, reactive, readonly } from './reactive'
import { isObject } from '../shared'

// 优化点：只会在初始化的时候执行一次
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

// 高阶函数封装reactive和readonly中的get函数
function createGetter(isReadonly = false) {
    return function get(target, key) {
        const res = Reflect.get(target, key)

        // 判断是否是reactive或者readonly，返回Boolean
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        }

        // 看看res是不是object，嵌套转换reactive
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res)
        }
    
        if (!isReadonly) {
            // TODO: 依赖收集
            track(target, key)
        }
    
        return res
    }
}

function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value)

        // TODO: 触发依赖
        trigger(target, key)
        return res
    }
}

export const mutableHandlers = {
    get,
    set
}

export const readonlyHandlers = {
    // 不可以set，不会触发依赖，所以也不需要依赖收集
    get: readonlyGet,
    // setter不需要抽离了，没意义
    set(target, key, value) {
        // 抛出警告⚠️告诉用户不可以set
        console.warn(`key: ${key} set 失败 因为 target 是readonly`, target)
        return true
    }
}
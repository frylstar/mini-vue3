import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from './baseHandlers'

// 枚举
export const enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__V_isReadonly"
}

export function reactive(raw) {
    // return new Proxy(raw, mutableHandlers)
    return createReactiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
    // return new Proxy(raw, readonlyHandlers)
    return createReactiveObject(raw, readonlyHandlers)
}

export function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers)
}

export function isReactive(value) {
    // value[ReactiveFlags.IS_REACTIVE]的值可能是undefined，因为不一定会走proxy(非reactive的话)
    return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value) {
    return !!value[ReactiveFlags.IS_READONLY]
}

function createReactiveObject(raw, baseHandlers) {
    return new Proxy(raw, baseHandlers)
}
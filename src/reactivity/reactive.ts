import { mutableHandlers, readonlyHandlers } from './baseHandlers'

export function reactive(raw) {
    // return new Proxy(raw, mutableHandlers)
    return createActiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
    // return new Proxy(raw, readonlyHandlers)
    return createActiveObject(raw, readonlyHandlers)
}

function createActiveObject(raw, baseHandlers) {
    return new Proxy(raw, baseHandlers)
}
import { createRenderer } from "../runtime-core"

export function createElement(type) {
    return document.createElement(type)
}

export function patchProp(el, key, value) {
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, value)
    } else {
        el.setAttribute(key, value)
    }
}

export function insert(el, parent) {
    parent.append(el)
}

const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

export * from "../runtime-core"
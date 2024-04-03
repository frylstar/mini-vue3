import { createRenderer } from "../runtime-core"

export function createElement(type) {
    return document.createElement(type)
}

export function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, nextVal)
    } else {
        // 去除key
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key)
        } else {
            el.setAttribute(key, nextVal)
        }
    }
}

export function insert(el, parent) {
    parent.append(el)
}

export function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child)
    }
}

export function setElementText(el, text) {
    el.textContent = text
}

const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

export * from "../runtime-core"
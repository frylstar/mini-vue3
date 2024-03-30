import { createVNode } from "../vnode";

/**
 * 将 slots 转化为 VNode
 * @param slots 
 * @param name 具名
 * @param props 作用域
 * @returns VNode
 */
export function renderSlots(slots, name, props) {
    const slot = slots[name]
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode('div', {}, slot(props))
        }
    }
}
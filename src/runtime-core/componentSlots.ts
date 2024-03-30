import { ShapeFlags } from "../shared/ShapeFlags"

export function initSlots(instance, children) {
    const { vnode } = instance
    if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
        normalizeObjectSlots(children, instance.slots)
    }
}
// 具名插槽
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key]
        slots[key] = (props) => normalizeSlotValue(value(props))
    }
}
// 数组包裹
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value]
} 
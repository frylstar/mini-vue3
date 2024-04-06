import { ShapeFlags } from "../shared/ShapeFlags"

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export function createVNode(type, props?, children?) {
    console.log(type, '??????', children)
    const vnode = {
        type,
        key: props?.key,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };

    if (typeof children === 'string') {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }

    // 组件 + children object
    if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
        }
    }

    return vnode;
}

export function createTextVNode(text: string) {
    return createVNode(Text, {}, text)
}

/**
 * 例如'div' 或 object
 * @param type 
 */
function getShapeFlag(type) {
    return typeof type === 'string'
        ? ShapeFlags.ELEMENT
        : ShapeFlags.COMPONENT;
}
import { ShapeFlags } from "../shared/ShapeFlags";
import { isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
    // patch
    patch(vnode, container);
}

/**
 * check type of vnode (processComponent or processElement)
 * @param vnode 
 * @param container 
 */
function patch(vnode, container) {

    // 思考题：如何去区分element还是component类型
    console.log('patch -> vnode.type: ', vnode.type)
    if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
         // 处理element类型，例如vnode.type = 'div'
         processElement(vnode, container);
    } else if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
        // 处理component类型，判断vnode.type是否是object
        processComponent(vnode, container);
    }
}

function processElement(vnode, container) {
    mountElement(vnode, container)
}

function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type))
    
    console.log('mountElement-vnode: ', vnode)
    // children
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el)
    }
    // props
    const { props } = vnode
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    for (const key in props) {
        const val = props[key]
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase()
            el.addEventListener(event, val)
        } else {
            el.setAttribute(key, val)
        }
    }

    container.append(el)
}

function mountChildren(vnode, container) {
    vnode.children.forEach(v => {
        patch(v, container)
    })
}

function processComponent(vnode: any, container: any) {
    mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container) {
    const instance = createComponentInstance(initialVNode)

    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance, initialVNode, container) {
    // subTree就是vnode
    const { proxy } = instance
    // 调用h函数->createVNode生成的vnode
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container)

    console.log('subTreee: ', subTree)
    initialVNode.el = subTree.el
}


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
    if (typeof vnode.type === 'string') {
         // 处理element类型，例如vnode.type = 'div'
         processElement(vnode, container);
    } else if (isObject(vnode.type)) {
        // 处理component类型
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
    const { children } = vnode
    if (typeof children === 'string') {
        el.textContent = children
    } else if (Array.isArray(children)) {
        mountChildren(vnode, el)
    }
    // props
    const { props } = vnode
    for (const key in props) {
        const val = props[key]
        el.setAttribute(key, val)
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


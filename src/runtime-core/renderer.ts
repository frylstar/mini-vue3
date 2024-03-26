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

    // 去处理组件
    // 判断是不是 element
    // 思考题：如何去区分element还是component类型
    // 处理component类型
    processComponent(vnode, container);
    // TODO: 处理element类型
    // processElement();
}

function processComponent(vnode: any, container: any) {
    mountComponent(vnode, container);
}

function mountComponent(vnode: any, container) {
    const instance = createComponentInstance(vnode)

    setupComponent(instance)
    setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
    // subTree就是vnode
    const subTree = instance.render();
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container)
}


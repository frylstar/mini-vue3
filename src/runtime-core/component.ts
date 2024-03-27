import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";


export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        proxy: null,
        props: {},
    }

    return component;
}

export function setupComponent(instance) {
    console.log('setupComponent: ', instance)
    // 初始化props
    initProps(instance, instance.vnode.props)
    // initSlots
    // 有状态的组件
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
    const Component = instance.type;

    // ctx, 代理setup返回的对象，便于在render函数中绑定this
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)

    const { setup } = Component;

    if (setup) {
        // setup返回 function 是组件的render函数
        // setup返回 object 注入当前组件上下文中
        // setup中注入props，但是props浅层不可修改，用shallowReadonly
        console.log(instance, '111123')
        const setupResult = setup(shallowReadonly(instance.props));

        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult) {

    if (typeof setupResult === 'object') {
        // render函数中的ctx上下文
        instance.setupState = setupResult;
    }

    finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
    const Component = instance.type

    if (Component.render) {
        instance.render = Component.render;
    }
}
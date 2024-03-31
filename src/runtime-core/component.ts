import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { emit } from './componentEmit'
import { initSlots } from './componentSlots'

export function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        proxy: null,
        props: {},
        slots: {},
        provides: parent ? parent.provides : {}, // 全是引用，最后都是同一个
        parent,
        emit: () => {},
    }
    // emit.bind(null, component) 会将 null 绑定为函数内部的 this 上下文，同时将 component 绑定为第一个参数，然后返回一个新的函数。当调用这个新的函数时，传入的参数会在 component 参数之后补充。
    component.emit = emit.bind(null, component) as any

    return component;
}

export function setupComponent(instance) {
    console.log('setupComponent: ', instance)
    // 初始化props
    initProps(instance, instance.vnode.props)
    initSlots(instance, instance.vnode.children)
    // 有状态的组件
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
    const Component = instance.type;

    // ctx, 代理setup返回的对象，便于在render函数中绑定this
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)

    const { setup } = Component;

    if (setup) {
        setCurrentInstance(instance);
        // setup返回 function 是组件的render函数
        // setup返回 object 注入当前组件上下文中
        // setup中注入props，但是props浅层不可修改，用shallowReadonly
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        setCurrentInstance(null)

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

let currentInstance = null;
export function getCurrentInstance() {
    return currentInstance;
}

function setCurrentInstance(instance) {
    currentInstance = instance
}


export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
    }

    return component;
}

export function setupComponent(instance) {
    // TODO:
    // initProps()
    // initSlots
    // 有状态的组件
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {

    const Component = instance.type;

    const { setup } = Component;

    if (setup) {
        // 返回 function 是组件的render函数
        // 返回 object 注入当前组件上下文中
        const setupResult = setup();

        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult) {

    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }

    finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
    const Component = instance.type

    if (!Component.render) {
        instance.render = Component.render;
    }
}
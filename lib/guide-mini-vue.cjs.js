'use strict';

function createVNode(type, props, children) {
    console.log(type, '??????', children);
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 组件 + children object
    if (vnode.shapeFlag & 2 /* ShapeFlags.COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
/**
 * 例如'div' 或 object
 * @param type
 */
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.COMPONENT */;
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
// 字符串替换：add-foo -> addFoo
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        // add-foo ->  _: -f   c: f
        return c ? c.toUpperCase() : "";
    });
};
// 首字母大写
const capitalize = (str) => {
    // slice(0, 1) charAt(0)
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

const targetMap = new Map();
function trigger(target, key) {
    // 把之前key对应的dep依赖取出来
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
/**
 * 触发依赖更新
 * @param dep
 */
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

// 优化点：只会在初始化的时候执行一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 高阶函数封装reactive和readonly中的get函数
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 判断是否是reactive或者readonly，返回Boolean
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__V_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        // 看看res是不是object，嵌套转换reactive
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // TODO: 触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    // 不可以set，不会触发依赖，所以也不需要依赖收集
    get: readonlyGet,
    // setter不需要抽离了，没意义
    set(target, key, value) {
        // 抛出警告⚠️告诉用户不可以set
        console.warn(`key: ${key} set 失败 因为 target 是readonly`, target);
        return true;
    }
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    // return new Proxy(raw, mutableHandlers)
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    // return new Proxy(raw, readonlyHandlers)
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
    // attrs
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState = {}, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // $el  $data $option...很多
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function emit(instance, event, ...args) {
    console.log(event, '触发emit事件');
    // 需要转换
    // add -> onAdd
    // add-foo -> onAddFoo
    // instance.props -> event
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
// 具名插槽
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
// 数组包裹
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        proxy: null,
        props: {},
        slots: {},
        emit: () => { },
    };
    // emit.bind(null, component) 会将 null 绑定为函数内部的 this 上下文，同时将 component 绑定为第一个参数，然后返回一个新的函数。当调用这个新的函数时，传入的参数会在 component 参数之后补充。
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    console.log('setupComponent: ', instance);
    // 初始化props
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    // 有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    // ctx, 代理setup返回的对象，便于在render函数中绑定this
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        // setup返回 function 是组件的render函数
        // setup返回 object 注入当前组件上下文中
        // setup中注入props，但是props浅层不可修改，用shallowReadonly
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        handleSetupResult(instance, setupResult);
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
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}

function render(vnode, container) {
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
    console.log('patch -> vnode.type: ', vnode.type);
    if (vnode.shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        // 处理element类型，例如vnode.type = 'div'
        processElement(vnode, container);
    }
    else if (vnode.shapeFlag & 2 /* ShapeFlags.COMPONENT */) {
        // 处理component类型，判断vnode.type是否是object
        processComponent(vnode, container);
    }
    else {
        console.log('patch中该vnode没有匹配到ShapeFlags: ', vnode);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type));
    console.log('mountElement -> vnode: ', vnode);
    // children
    const { children, shapeFlag } = vnode;
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    // props
    const { props } = vnode;
    const isOn = (key) => /^on[A-Z]/.test(key);
    for (const key in props) {
        const val = props[key];
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(v => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    const instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    // subTree就是vnode
    const { proxy } = instance;
    // 调用h函数->createVNode生成的vnode
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
    console.log('subTreee: ', subTree);
    initialVNode.el = subTree.el;
}

/**
 * createApp(App).mount('#app');
 * @param rootComponent
 */
function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // rootComponent 先转化为 vnode
            // 后续所有逻辑操作 都会基于 vnode 做处理
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

/**
 * 将 slots 转化为 VNode
 * @param slots
 * @param name 具名
 * @param props 作用域
 * @returns VNode
 */
function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode('div', {}, slot(props));
        }
    }
}

exports.createApp = createApp;
exports.h = h;
exports.renderSlots = renderSlots;

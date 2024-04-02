const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
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
function createTextVNode(text) {
    return createVNode(Text, {}, text);
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
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasChange = (val, newValue) => {
    return !Object.is(val, newValue);
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

let activeEffect;
let shouldTrack; // 是否应该收集依赖，stop
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        // shouldTrack开关打开，接下来get收集依赖，然后关闭开关
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn();
        // reset
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    // 清空
    effect.deps.length = 0;
}
const targetMap = new Map();
function track(target, key) {
    // if (!activeEffect) return
    // if (!shouldTrack) return
    if (!isTracking())
        return;
    // target -> key -> dep
    let depsMap = targetMap.get(target);
    // 初始化的时候，如果depsMap没有的话，创建一个
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        // dep是Set ?
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 这里需要拿到fn，那么我们应该如何拿到fn呢？
    // 可以利用一个全局变量去获取
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    // 在实例中存储dep，(当没有调用effect的时候，activeEffect为undefined，需要在isTracking中加个判断）
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
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
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // options
    // _effect.onStop = options.onStop
    // Object.assign(_effect, options)
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    // 方便stop
    runner.effect = _effect;
    return runner;
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
        if (!isReadonly) {
            // TODO: 依赖收集
            track(target, key);
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

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        // 1. 看value是否是对象，对象的话用reactive包裹
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 注意：一定是先去修改了value值，再去通知
        // 判断值是否变化; Object.is() 静态方法确定两个值是否为相同值。
        // 对比的时候为 对象，用_rawValue记录proxy之前的值，因为用了reactive的proxy代理
        if (hasChange(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
/**
 * 看value是否是对象，对象的话用reactive包裹
 * @param value
 */
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
/**
 * 收集依赖
 * @param ref
 */
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    const res = new RefImpl(value);
    return res;
}
/**
 * 检查某个值是否为 ref
 * @param ref
 */
function isRef(ref) {
    return !!ref.__v_isRef;
}
/**
 * 如果参数是 ref，则返回内部值，否则返回参数本身。这是 val = isRef(val) ? val.value : val 计算的一个语法糖
 * @param ref
 */
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
/**
 * ref在js里面需要通过.value去取值赋值。但是在模板中不需要。
 * proxyRefs主要是在setup中的return中对返回结果做了处理。所以我们在模板语法中可以不需要使用.value。
 * @param objectWithRefs
 */
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        // get -> 若要获取的属性值为ref，那么返回.value
        // not ref -> value
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // set -> ref   .value
            // 原先的属性值为ref，新值不是ref
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                // 其他情况就是正常替换就可以
                return Reflect.set(target, key, value);
            }
        }
    });
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        proxy: null,
        props: {},
        slots: {},
        provides: parent ? parent.provides : {}, // 全是引用，最后都是同一个
        parent,
        emit: () => { },
        isMounted: false,
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
        setCurrentInstance(instance);
        // setup返回 function 是组件的render函数
        // setup返回 object 注入当前组件上下文中
        // setup中注入props，但是props浅层不可修改，用shallowReadonly
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        // render函数中的ctx上下文，proxyRefs处理在模版中使用ref不需要.value
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

// 通过getCurrentInstance获取当前组件实例(只能在setup中调用)
function provide(key, value) {
    var _a;
    const currentInstance = getCurrentInstance();
    // 获取父组件上存的provides
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 这里要解决一个问题
        // 当父级 key 和 爷爷级别的 key 重复的时候，对于子组件来讲，需要取最近的父级别组件的值
        // 那这里的解决方案就是利用原型链来解决
        // provides 初始化的时候是在 createComponent 时处理的，当时是直接把 parent.provides 赋值给组件的 provides 的
        // 所以，如果说这里发现 provides 和 parentProvides 相等的话，那么就说明是第一次做 provide(对于当前组件来讲)
        // 我们就可以把 parent.provides 作为 currentInstance.provides 的原型重新赋值
        // 至于为什么不在 createComponent 的时候做这个处理，可能的好处是在这里初始化的话，是有个懒执行的效果（优化点，只有需要的时候在初始化）
        if (provides === parentProvides) {
            // Object.create() 静态方法以一个现有对象作为原型，创建一个新对象。
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 判断key是否存在于parentProvides中
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

/**
 * createApp(App).mount('#app');
 * @param render
 * @param rootComponent
 */
function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // rootComponent 先转化为 vnode
                // 后续所有逻辑操作 都会基于 vnode 做处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            }
        };
    };
}

// 自定义渲染器
function createRenderer(options) {
    // 将dom操作抽离出来
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, } = options;
    function render(vnode, container) {
        // patch
        patch(null, vnode, container, null);
    }
    /**
     * check type of vnode (processComponent or processElement)
     * @param n1 prevSubTree 老的
     * @param n2 subTree 新的
     * @param container
     */
    function patch(n1, n2, container, parentComponent) {
        const { type } = n2;
        switch (type) {
            case Fragment:
                // Fragment -> 只渲染children
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                // 渲染文本节点
                processText(n1, n2, container);
                break;
            default:
                // 思考题：如何去区分element还是component类型
                console.log("patch -> vnode.type: ", n2.type);
                if (n2.shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // 处理element类型，例如vnode.type = 'div'
                    processElement(n1, n2, container, parentComponent);
                }
                else if (n2.shapeFlag & 2 /* ShapeFlags.COMPONENT */) {
                    // 处理component类型，判断vnode.type是否是object
                    processComponent(n1, n2, container, parentComponent);
                }
                else {
                    console.log("patch中该vnode没有匹配到ShapeFlags: ", n2);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container) {
        console.log('patchElement');
        console.log('n1', n1);
        console.log('n2', n2);
        // TODO: 更新对比 props children
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 此时n2上是没有el的，需要添加上
        const el = n2.el = n1.el;
        patchProps(el, oldProps, newProps);
    }
    // props对比更新
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            // 值新增修改 或者 值变为undefined/null
            for (const key in newProps) {
                const prevVal = oldProps[key];
                const nextVal = newProps[key];
                if (prevVal !== nextVal) {
                    patchProp(el, key, prevVal, nextVal);
                }
            }
            // 优化点: 旧props是空对象的话，无需以下遍历对比了
            if (oldProps !== EMPTY_OBJ) {
                // 旧key去除：旧的props中的key不存在于新的props中，需要遍历旧props
                for (const key in oldProps) {
                    // 旧key不存在于新props中
                    if (!(key in newProps)) {
                        patchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        console.log("mountElement -> vnode: ", vnode);
        // children
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountComponent(initialVNode, container, parentComponent) {
        const instance = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (!instance.isMounted) {
                // 初始化
                console.log('init');
                // subTree就是vnode
                const { proxy } = instance;
                // 调用h函数->createVNode生成的vnode，记录subTree,用于下一次patch对比更新
                const subTree = instance.subTree = instance.render.call(proxy);
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 更新
                console.log('update');
                // subTree就是vnode
                const { proxy } = instance;
                // 调用h函数->createVNode生成的vnode
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                // 记录新的subTree
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    return {
        // 自定义渲染器需要返回createApp方法
        // customRenderer(options).createApp(App).mount(xxx)
        // 用高阶函数将render方法传入createApp
        createApp: createAppAPI(render),
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // 去除key
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createElement, createRenderer, createTextVNode, getCurrentInstance, h, inject, insert, patchProp, provide, proxyRefs, ref, renderSlots };

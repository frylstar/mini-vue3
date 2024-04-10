const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    console.log(type, '??????', children);
    const vnode = {
        type,
        key: props === null || props === void 0 ? void 0 : props.key,
        props,
        children,
        component: null,
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

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const isString = (value) => typeof value === "string";
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
    $props: (i) => i.props,
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
        next: null, // 下次要更新的vnode(updateComponent使用)
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
    // 给 instance 设置 render
    // 先取到用户设置的 component options
    const Component = instance.type;
    // 如果 compile 有值 并且当组件没有 render 函数，那么就需要把 template 编译成 render 函数
    if (compiler && !Component.render) {
        if (Component.template) {
            // 这里就是 runtime 模块和 compile 模块结合点
            Component.render = compiler(Component.template);
        }
    }
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = null;
// 这个接口暴露给用户，用户可以在 setup 中获取组件实例 instance
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

// 判断组件props是否更新
function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps) {
            return true;
        }
        return false;
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

// nextTick(() => {})
// await nextTick()
const queue = [];
// const activePreFlushCbs: any = [];
const p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
        // 执行所有的 job
        queueFlush();
    }
}
function queueFlush() {
    // 如果同时触发了两个组件的更新的话
    // 这里就会触发两次 then （微任务逻辑）
    // 但是这是没有必要的
    // 我们只需要触发一次即可处理完所有的 job 调用
    // 所以需要判断一下 如果已经触发过 nextTick 了
    // 那么后面就不需要再次触发一次 nextTick 逻辑了
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
// export function queuePreFlushCb(cb) {
//     queueCb(cb, activePreFlushCbs);
// }
// function queueCb(cb, activeQueue) {
//     // 直接添加到对应的列表内就ok
//     // todo 这里没有考虑 activeQueue 是否已经存在 cb 的情况
//     // 然后在执行 flushJobs 的时候就可以调用 activeQueue 了
//     activeQueue.push(cb);
//     // 然后执行队列里面所有的 job
//     queueFlush()
//   }
function flushJobs() {
    isFlushPending = false;
    // 先执行 pre 类型的 job
    // 所以这里执行的job 是在渲染前的
    // 也就意味着执行这里的 job 的时候 页面还没有渲染
    // flushPreFlushCbs();
    // 这里是执行 queueJob 的
    // 比如 render 渲染就是属于这个类型的 job
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}
// function flushPreFlushCbs() {
//     // 执行所有的 pre 类型的 job
//     for (let i = 0; i < activePreFlushCbs.length; i++) {
//       activePreFlushCbs[i]();
//     }
// }

// 自定义渲染器
function createRenderer(options) {
    // 将dom操作抽离出来
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        // patch
        patch(null, vnode, container, null, null);
    }
    /**
     * check type of vnode (processComponent or processElement)
     * @param n1 prevSubTree 老的
     * @param n2 subTree 新的
     * @param container
     * @param parentComponent 父组件实例componentInstance
     */
    function patch(n1, n2, container, parentComponent, anchor) {
        const { type } = n2;
        switch (type) {
            case Fragment:
                // Fragment -> 只渲染children
                processFragment(n1, n2, container, parentComponent, anchor);
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
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (n2.shapeFlag & 2 /* ShapeFlags.COMPONENT */) {
                    // 处理component类型，判断vnode.type是否是object
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                else {
                    console.log("patch中该vnode没有匹配到ShapeFlags: ", n2);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement');
        console.log('n1', n1);
        console.log('n2', n2);
        // TODO: 更新对比 props children
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 此时n2上是没有el的，需要添加上
        const el = n2.el = n1.el;
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    /**
     *
     * @param n1 旧vnode
     * @param n2 新vnode
     * @param container 父级el: HTMLElement
     * @param parentComponent 父组件实例componentInstance
     */
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const shapeFlag = n2.shapeFlag;
        const c2 = n2.children;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // Array -> Text
                // 将老的 children 清空
                unmountChildren(n1.children);
            }
            // Array -> Text 或者 Text -> Text 都需要设置Text
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // Text -> Array
                hostSetElementText(container, '');
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // Array -> Array 双端对比diff算法
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0;
        let l1 = c1.length;
        let l2 = c2.length;
        let e1 = l1 - 1;
        let e2 = l2 - 1;
        // 左侧对比
        // (a b) c
        // (a b) d e
        while (i <= e1 && i <= e2) {
            let n1 = c1[i];
            let n2 = c2[i];
            if (isSameNode(n1, n2)) {
                // 递归patch相同节点
                patch(n1, n2, container, parentComponent, parentAnchor);
                i++;
            }
            else {
                break;
            }
        }
        // 右侧对比
        // a (b c)
        // d e (b c)
        while (i <= e1 && i <= e2) {
            let n1 = c1[e1];
            let n2 = c2[e2];
            if (isSameNode(n1, n2)) {
                // 递归patch相同节点
                patch(n1, n2, container, parentComponent, parentAnchor);
                e1--;
                e2--;
            }
            else {
                break;
            }
        }
        console.log(`i: ${i}, e1: ${e1}, e2: ${e2}`);
        // 新的比老的长，创建新的(除去相同部分，只有新增的，新增在左侧或者右侧)
        // (a b)     //     (a b)
        // (a b) c   // c d (a b)
        // i: 2, e1: 1, e2: 2
        // i: 0, e1: -1, e2: 1
        if (e1 < i && i <= e2) {
            const nextPos = e2 + 1; // insertBefore参考指针位置
            // insertBefore参考el，存在则插入指定位置之前，否则默认放到最后，等同与parent.append
            const anchor = nextPos < l2 ? c2[nextPos].el : null;
            while (i <= e2) {
                patch(null, c2[i], container, parentComponent, anchor);
                i++;
            }
        }
        // 老的比新的长，删除老的(除去相同部分，只有删除的，删除在左侧或者右侧)
        // (a b) c   // a (b c)
        // (a b)     //   (b c)
        // i: 2, e1: 2, e2: 1
        // i: 0, e1: 0, e2: -1
        if (e2 < i && i <= e1) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        // 中间对比，获取中间区域指针范围
        if (i <= e1 && i <= e2) {
            let s1 = i;
            let s2 = i;
            // TODO: 乱序部分，更复杂的对比
            const toBePatched = e2 - s2 + 1; // next中间区域总数量
            let patched = 0;
            const keyToNewIndexMap = new Map();
            let moved = false; // 是否需要移动
            let maxNewIndexSoFar = 0; // 记录当前最大的index
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 新旧index的映射关系为0，则表示该节点为新创建节点
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                // 将新的对比区域key: index存入Map中，复杂度由O(n)变为O(1)
                keyToNewIndexMap.set(nextChild.key, i);
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                const prevKey = prevChild.key;
                // 中间部分，老的比新的多， 那么多出来的直接就可以被干掉(优化删除逻辑)
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                // 若没有设置key，则为null或undefined，需要for循环遍历查找
                let newIndex;
                if (prevKey != null) {
                    newIndex = keyToNewIndexMap.get(prevKey);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameNode(prevChild, c2[j])) {
                            newIndex = j;
                        }
                    }
                }
                // 找到相同节点（newIndex不为undefined），进行patch，否则删除当前旧节点
                if (newIndex === undefined) {
                    hostRemove(prevChild.el); // 1.删除在新的children中不存在的旧节点
                }
                else {
                    // 优化点，若是不需要移动，则后一个 一定大于 前一个
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; //为什么要加1，因为0是用来判断是否需要创建的
                    // patch新旧节点对比更新
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 2.移动节点位置
            // 3.创建新的节点
            // 最长递增子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            console.log(newIndexToOldIndexMap, '最长递增子序列sequence:', increasingNewIndexSequence);
            let j = increasingNewIndexSequence.length - 1;
            // 从后往前遍历判断，因为insertBefore移动位置需要已经处理的参考节点位置
            for (let i = toBePatched - 1; i >= 0; i--) {
                const newIndex = i + s2;
                const nextIndex = newIndex + 1;
                // 超出长度则默认添加到最后
                const nextChild = nextIndex < l2 ? c2[nextIndex].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 创建新节点（因为在旧节点中不存在该节点，0就是没有建立映射关系，需要新建）
                    patch(null, c2[newIndex], container, parentComponent, nextChild);
                }
                else if (moved) {
                    if (j < 0 || i !== newIndexToOldIndexMap[j]) {
                        // 移动位置
                        hostInsert(c2[newIndex].el, container, nextChild);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function isSameNode(l1, l2) {
        console.log(l1.key, 'l1.key', l2.key);
        return l1.type === l2.type && l1.props.key === l2.props.key;
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            // remove
            hostRemove(el);
        }
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
    function mountElement(vnode, container, parentComponent, anchor) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        console.log("mountElement -> vnode: ", vnode);
        // children
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        console.log("更新组件", n1, n2);
        // 更新组件实例引用
        const instance = n2.component = n1.component;
        // 先看看这个组件是否应该更新
        if (shouldUpdateComponent(n1, n2)) {
            console.log(`组件需要更新: ${instance}`);
            // 那么 next 就是新的 vnode 了（也就是 n2）
            instance.next = n2;
            // 这里的 update 是在 setupRenderEffect 里面初始化的，update 函数除了当内部的响应式对象发生改变的时候会调用
            // 还可以直接主动的调用(这是属于 effect 的特性)
            // 调用 update 再次更新调用 patch 逻辑
            // 在update 中调用的 next 就变成了 n2了
            // ps：可以详细的看看 update 中 next 的应用
            // TODO 需要在 update 中处理支持 next 的逻辑
            instance.update();
        }
        else {
            console.log(`组件不需要更新: ${instance}`);
            // 不需要更新的话，那么只需要覆盖下面的属性即可
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // 初始化
                console.log('init');
                // subTree就是vnode
                const { proxy } = instance;
                // 调用h函数->createVNode生成的vnode，记录subTree,用于下一次patch对比更新
                // 第二个proxy作为参数传入，用于template转render函数时的_ctx
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance, anchor);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 更新
                console.log('update');
                // 需要一个vnode
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                // subTree就是vnode
                const { proxy } = instance;
                // 调用h函数->createVNode生成的vnode
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                // 记录新的subTree
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler: () => {
                console.log('scheduler');
                queueJobs(instance.update);
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
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
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
function insert(el, parent, anchor) {
    // parent.append(el)
    console.log(anchor, 1111);
    parent.insertBefore(el, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElement: createElement,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    createTextVNode: createTextVNode,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    insert: insert,
    patchProp: patchProp,
    provide: provide,
    proxyRefs: proxyRefs,
    reactive: reactive,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    remove: remove,
    renderSlots: renderSlots,
    setElementText: setElementText,
    toDisplayString: toDisplayString
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode"
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPremble(ast, context); // 前导码
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    push(`function ${functionName}(${signature}){`);
    push("return ");
    genNode(ast.codegenNode, context);
    console.log('ast.codegenNode', ast.codegenNode);
    push("}");
    console.log(context.code, "final code");
    return {
        code: context.code,
    };
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genFunctionPremble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers
            .map(aliasHelper)
            .join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 1 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 2 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 0 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNoeList(genNullable([tag, props, children]), context);
    // genNode(children, context);
    push(")");
}
function genNoeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(",");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    console.log(node);
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(')');
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}

// 解析插值
function baseParse(content) {
    const context = createParseContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    // 2. 遇到结束标签的时候
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    // 1. source有值的时候，即不为“”，为“”则结束
    return !s;
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    // 1. 获取content
    const content = parseTextData(context, endIndex);
    console.log('parseText结果: ', content);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content,
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    // 2. 推进
    advanceBy(context, length);
    return content;
}
function parseElement(context, ancestors) {
    // Implement
    const element = parseTag(context, 0 /* TagType.Start */);
    ancestors.push(element);
    const children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签：${element.tag}`);
    }
    element.children = children;
    console.log("parseElement之后: ", context);
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return source.startsWith("</") && source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase();
}
function parseTag(context, type) {
    // 1. 解析tag(开始结束标签)
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    console.log('parseTag正则match结果:', match); // [ '<div', 'div', index: 0, input: '<div></div>', groups: undefined ]
    const tag = match[1];
    // 2. 删除处理完成的代码
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    // 结束标签直接return掉
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 0 /* NodeTypes.ELEMENT */,
        tag,
    };
}
// 解析插值
function parseInterpolation(context) {
    // {{ message }}
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    // indexOf第二个参数设置从哪个位置开始查起
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // message}} 去掉左侧两个{{
    // context.source = context.source.slice(openDelimiter.length)
    advanceBy(context, openDelimiter.length);
    // 获取插值的长度
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim(); // 去除空格
    console.log("parseInterpolation结果1:", content);
    // 清空已处理的，继续推进
    // context.source = context.source.slice(closeDelimiter.length)
    advanceBy(context, closeDelimiter.length);
    console.log("context.parseInterpolation结果2:", context.source);
    return {
        type: 1 /* NodeTypes.INTERPOLATION */, // 插值类型
        content: {
            type: 2 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */,
        helpers: [],
    };
}
function createParseContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    // 1. 创建 context
    const context = createTransformContext(root, options);
    // 1. 遍历node - 深度优先搜索
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root, context) {
    const { children } = root;
    // 只支持一个根节点
    // 并且还是一个single text node
    const child = children[0];
    // 如果是 element 类型的话 ， 那么我们需要把它的 codegenNode 赋值给 root
    // root 其实是个空的什么数据都没有的节点
    // 所以这里需要额外的处理 codegenNode
    // codegenNode 的目的是专门为了 codegen 准备的  为的就是和 ast 的 node 分离开
    if (child.type === 0 /* NodeTypes.ELEMENT */ && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}
function traverseNode(node, context) {
    console.log(node);
    // 由外部扩展，实现了插件体系，把程序的变动点和稳定点分离开，保证了程序的可测试性
    // 遍历调用所有的 nodeTransforms
    // 把 node 给到 transform
    // 用户可以对 node 做处理
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        // 调用插件之后会返回一个函数
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 1 /* NodeTypes.INTERPOLATION */:
            // 插值的点，在于后续生成 render 代码的时候是获取变量的值
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 0 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    // i-- 这个很巧妙
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(name) {
            // 这里会收集调用的次数
            // 收集次数是为了给删除做处理的， （当只有 count 为0 的时候才需要真的删除掉）
            // helpers 数据会在后续生成代码的时候用到
            const count = context.helpers.get(name) || 0;
            context.helpers.set(name, count + 1);
        },
    };
    return context;
}

function createVNodeCall(context, tag, props, children) {
    if (context) {
        context.helper(CREATE_ELEMENT_VNODE);
    }
    return {
        // TODO vue3 里面这里的 type 是 VNODE_CALL
        // 是为了 block 而 mini-vue 里面没有实现 block
        // 所以创建的是 Element 类型就够用了
        type: 0 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 0 /* NodeTypes.ELEMENT */) {
        return () => {
            // 没有实现 block  所以这里直接创建 element
            // TODO
            // 需要把之前的 props 和 children 等一系列的数据都处理
            const vnodeTag = `'${node.tag}'`;
            // TODO props 暂时不支持
            const vnodeProps = null;
            let vnodeChildren = null;
            if (node.children.length > 0) {
                if (node.children.length === 1) {
                    // 只有一个孩子节点 ，那么当生成 render 函数的时候就不用 [] 包裹
                    const child = node.children[0];
                    vnodeChildren = child;
                }
            }
            // 创建一个新的 node 用于 codegen 的时候使用
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 1 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 1 /* NodeTypes.INTERPOLATION */ || node.type === 3 /* NodeTypes.TEXT */;
}

function transformText(node) {
    if (node.type === 0 /* NodeTypes.ELEMENT */) {
        // 在 exit 的时期执行
        // 下面的逻辑会改变 ast 树
        // 有些逻辑是需要在改变之前做处理的
        return () => {
            // hi,{{msg}}
            // 上面的模块会生成2个节点，一个是 text 一个是 interpolation 的话
            // 生成的 render 函数应该为 "hi," + _toDisplayString(_ctx.msg)
            // 这里面就会涉及到添加一个 “+” 操作符
            // 那这里的逻辑就是处理它
            // 检测下一个节点是不是 text 类型，如果是的话， 那么会创建一个 COMPOUND 类型
            // COMPOUND 类型把 2个 text || interpolation 包裹（相当于是父级容器）
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    // 看看下一个节点是不是 text 类
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            // currentContainer 的目的是把相邻的节点都放到一个 容器内
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    loc: child.loc,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ", next);
                            // 把当前的节点放到容器内, 然后删除掉j
                            children.splice(j, 1);
                            // 因为把 j 删除了，所以这里就少了一个元素，那么 j 需要 --
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    // 1. 先把 template 也就是字符串 parse 成 ast
    const ast = baseParse(template);
    // 2. 给 ast 加点料（- -#）
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    // 3. 生成 render 函数代码
    return generate(ast);
}

// mini-vue的出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    // 调用 compile 得到的代码在给封装到函数内，
    // 这里会依赖 runtimeDom 的一些函数，所以在这里通过参数的形式注入进去
    const render = new Function("Vue", code)(runtimeDom);
    console.log('render funtions:', render.toString(), 'runtimeDom参数:', runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createElement, createVNode as createElementVNode, createRenderer, createTextVNode, getCurrentInstance, h, inject, insert, patchProp, provide, proxyRefs, reactive, ref, registerRuntimeCompiler, remove, renderSlots, setElementText, toDisplayString };

import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

// 自定义渲染器
export function createRenderer(options) {
    // 将dom操作抽离出来
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
    } = options;

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
                if (n2.shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理element类型，例如vnode.type = 'div'
                    processElement(n1, n2, container, parentComponent);
                } else if (n2.shapeFlag & ShapeFlags.COMPONENT) {
                    // 处理component类型，判断vnode.type是否是object
                    processComponent(n1, n2, container, parentComponent);
                } else {
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
        } else {
            patchElement(n1, n2, container)
        }
    }

    function patchElement(n1, n2, container) {
        console.log('patchElement')
        console.log('n1', n1)
        console.log('n2', n2)
        // TODO: 更新对比 props children
    }


    function mountElement(vnode, container, parentComponent) {
        const el = (vnode.el = hostCreateElement(vnode.type));

        console.log("mountElement -> vnode: ", vnode);
        // children
        const { children, shapeFlag } = vnode;
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode, el, parentComponent);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, val);
        }

        hostInsert(el, container);
    }

    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }

    function processComponent(n1, n2: any, container: any, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }

    function mountComponent(initialVNode: any, container, parentComponent) {
        const instance = createComponentInstance(initialVNode, parentComponent);

        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }

    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (!instance.isMounted) {
                // 初始化
                console.log('init')
                // subTree就是vnode
                const { proxy } = instance;
                // 调用h函数->createVNode生成的vnode，记录subTree,用于下一次patch对比更新
                const subTree = instance.subTree = instance.render.call(proxy);
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance);

                initialVNode.el = subTree.el;
                instance.isMounted = true;
            } else {
                // 更新
                console.log('update')
                // subTree就是vnode
                const { proxy } = instance;
                // 调用h函数->createVNode生成的vnode
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                // 记录新的subTree
                instance.subTree = subTree;

                patch(prevSubTree, subTree, container, instance);
            }
        })
    }

    return {
        // 自定义渲染器需要返回createApp方法
        // customRenderer(options).createApp(App).mount(xxx)
        // 用高阶函数将render方法传入createApp
        createApp: createAppAPI(render),
    };
}

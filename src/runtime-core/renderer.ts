import { effect } from "../reactivity/effect";
import { patchProp } from "../runtime-dom";
import { EMPTY_OBJ } from "../shared";
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
        remove: hostRemove,
        setElementText: hostSetElementText,
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
        mountChildren(n2.children, container, parentComponent);
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
            patchElement(n1, n2, container, parentComponent)
        }
    }

    function patchElement(n1, n2, container, parentComponent) {
        console.log('patchElement')
        console.log('n1', n1)
        console.log('n2', n2)
        // TODO: 更新对比 props children
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 此时n2上是没有el的，需要添加上
        const el = n2.el = n1.el;

        patchChildren(n1, n2, el, parentComponent)
        patchProps(el, oldProps, newProps)
    }

    /**
     * 
     * @param n1 旧vnode
     * @param n2 新vnode
     * @param container 父级 el
     * @param parentComponent 父组件实例componentInstance
     */
    function patchChildren(n1, n2, container: HTMLElement, parentComponent) {
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const shapeFlag = n2.shapeFlag;
        const c2 = n2.children;

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // Array -> Text
                // 将老的 children 清空
                unmountChildren(n1.children)
            }
            // Array -> Text 或者 Text -> Text 都需要设置Text
            if (c1 !== c2) {
                hostSetElementText(container, c2)
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // Text -> Array
                hostSetElementText(container, '')
                mountChildren(c2, container, parentComponent)
            } else {
                // Array -> Array 双端对比diff算法
            }
        }

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
                    patchProp(el, key, prevVal, nextVal)
                }
            }
            
            // 优化点: 旧props是空对象的话，无需以下遍历对比了
            if (oldProps !== EMPTY_OBJ) {
                // 旧key去除：旧的props中的key不存在于新的props中，需要遍历旧props
                for (const key in oldProps) {
                    // 旧key不存在于新props中
                    if (!(key in newProps)) {
                        patchProp(el, key, oldProps[key], null)
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
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }

        hostInsert(el, container);
    }

    function mountChildren(children, container, parentComponent) {
        children.forEach((v) => {
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

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
                if (n2.shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理element类型，例如vnode.type = 'div'
                    processElement(n1, n2, container, parentComponent, anchor);
                } else if (n2.shapeFlag & ShapeFlags.COMPONENT) {
                    // 处理component类型，判断vnode.type是否是object
                    processComponent(n1, n2, container, parentComponent, anchor);
                } else {
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
        } else {
            patchElement(n1, n2, container, parentComponent, anchor)
        }
    }

    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement')
        console.log('n1', n1)
        console.log('n2', n2)
        // TODO: 更新对比 props children
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 此时n2上是没有el的，需要添加上
        const el = n2.el = n1.el;

        patchChildren(n1, n2, el, parentComponent, anchor)
        patchProps(el, oldProps, newProps)
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
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                // Array -> Array 双端对比diff算法
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)
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
        while(i <= e1 && i <= e2) {
            let n1 = c1[i];
            let n2 = c2[i];

            if (isSameNode(n1, n2)) {
                // 递归patch相同节点
                patch(n1, n2, container, parentComponent, parentAnchor)
                i++;
            } else {
                break;
            }
        }

        // 右侧对比
        // a (b c)
        // d e (b c)
        while(i <= e1 && i <= e2) {
            let n1 = c1[e1];
            let n2 = c2[e2];

            if (isSameNode(n1, n2)) {
                // 递归patch相同节点
                patch(n1, n2, container, parentComponent, parentAnchor)
                e1--;
                e2--;
            } else {
                break;
            }
        }
        console.log(`i: ${i}, e1: ${e1}, e2: ${e2}`)
        // 新的比老的长，创建新的(除去相同部分，只有新增的，新增在左侧或者右侧)
        // (a b)     //     (a b)
        // (a b) c   // c d (a b)
        // i: 2, e1: 1, e2: 2
        // i: 0, e1: -1, e2: 1
        if (e1 < i && i <= e2) {
            const nextPos = e2 + 1; // insertBefore参考指针位置
            // insertBefore参考el，存在则插入指定位置之前，否则默认放到最后，等同与parent.append
            const anchor = nextPos < l2 ? c2[nextPos].el : null;
            while(i <= e2) {
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
            while(i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        // 中间对比，获取中间区域指针范围
        if (i <= e1 && i <= e2) {
            // TODO: 乱序部分，更复杂的对比
        }
    }

    function isSameNode(l1, l2) {
        console.log(l1.key, 'l1.key', l2.key)
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


    function mountElement(vnode, container, parentComponent, anchor) {
        const el = (vnode.el = hostCreateElement(vnode.type));

        console.log("mountElement -> vnode: ", vnode);
        // children
        const { children, shapeFlag } = vnode;
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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

    function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor);
    }

    function mountComponent(initialVNode: any, container, parentComponent, anchor) {
        const instance = createComponentInstance(initialVNode, parentComponent);

        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }

    function setupRenderEffect(instance, initialVNode, container, anchor) {
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
                patch(null, subTree, container, instance, anchor);

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

                patch(prevSubTree, subTree, container, instance, anchor);
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

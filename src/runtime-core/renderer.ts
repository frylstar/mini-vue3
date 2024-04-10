import { effect } from "../reactivity/effect";
import { patchProp } from "../runtime-dom";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { queueJobs } from "./scheduler";
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
            for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;

            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                // 将新的对比区域key: index存入Map中，复杂度由O(n)变为O(1)
                keyToNewIndexMap.set(nextChild.key, i)
            }

            for(let i = s1; i <= e1; i++) {
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
                } else {
                    for(let j = s2; j <= e2; j++) {
                        if (isSameNode(prevChild, c2[j])) {
                            newIndex = j;
                        }
                    }
                }

                // 找到相同节点（newIndex不为undefined），进行patch，否则删除当前旧节点
                if (newIndex === undefined) {
                    hostRemove(prevChild.el); // 1.删除在新的children中不存在的旧节点
                } else {
                    // 优化点，若是不需要移动，则后一个 一定大于 前一个
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    } else {
                        moved = true
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
                    patch(null, c2[newIndex], container, parentComponent, nextChild)
                } else if (moved) {
                    if (j < 0 || i !== newIndexToOldIndexMap[j]) {
                        // 移动位置
                        hostInsert(c2[newIndex].el, container, nextChild)
                    } else {
                        j--;
                    }
                }
            }
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
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        } else {
            updateComponent(n1, n2)
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
        } else {
            console.log(`组件不需要更新: ${instance}`);
            // 不需要更新的话，那么只需要覆盖下面的属性即可
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }

    }

    function mountComponent(initialVNode: any, container, parentComponent, anchor) {
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);

        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }

    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // 初始化
                console.log('init')
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
            } else {
                // 更新
                console.log('update')
                // 需要一个vnode
                const { next, vnode } = instance
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next)
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
                console.log('scheduler')
                queueJobs(instance.update)
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

function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;

    instance.props = nextVNode.props;
}

function getSequence(arr: number[]): number[] {
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
          } else {
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
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
        patch(vnode, container, null);
    }

    /**
     * check type of vnode (processComponent or processElement)
     * @param vnode
     * @param container
     */
    function patch(vnode, container, parentComponent) {
        const { type } = vnode;
        switch (type) {
            case Fragment:
                // Fragment -> 只渲染children
                processFragment(vnode, container, parentComponent);
                break;
            case Text:
                // 渲染文本节点
                processText(vnode, container);
                break;
            default:
                // 思考题：如何去区分element还是component类型
                console.log("patch -> vnode.type: ", vnode.type);
                if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理element类型，例如vnode.type = 'div'
                    processElement(vnode, container, parentComponent);
                } else if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
                    // 处理component类型，判断vnode.type是否是object
                    processComponent(vnode, container, parentComponent);
                } else {
                    console.log("patch中该vnode没有匹配到ShapeFlags: ", vnode);
                }
                break;
        }
    }

    function processFragment(vnode, container, parentComponent) {
        mountChildren(vnode, container, parentComponent);
    }

    function processText(vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));

        container.append(textNode);
    }

    function processElement(vnode, container, parentComponent) {
        mountElement(vnode, container, parentComponent);
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
            patch(v, container, parentComponent);
        });
    }

    function processComponent(vnode: any, container: any, parentComponent) {
        mountComponent(vnode, container, parentComponent);
    }

    function mountComponent(initialVNode: any, container, parentComponent) {
        const instance = createComponentInstance(initialVNode, parentComponent);

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
        patch(subTree, container, instance);

        console.log("subTreee: ", subTree);
        initialVNode.el = subTree.el;
    }

    return {
        // 自定义渲染器需要返回createApp方法
        // customRenderer(options).createApp(App).mount(xxx)
        // 用高阶函数将render方法传入createApp
        createApp: createAppAPI(render),
    };
}

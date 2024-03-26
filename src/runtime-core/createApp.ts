import { createVNode } from "./vnode";
import { render } from "./renderer";

/**
 * createApp(App).mount('#app');
 * @param rootComponent 
 */
export function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // rootComponent 先转化为 vnode
            // 后续所有逻辑操作 都会基于 vnode 做处理
            const vnode = createVNode(rootComponent);

            render(vnode, rootContainer);
        }
    }
}

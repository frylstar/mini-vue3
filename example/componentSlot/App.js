import { h } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

window.self = null;
export const App = {
    name: "App",
    setup() {
        return {
            msg: "mini-vue3",
        };
    },
    render() {
        const app = h("div", {}, "App");
        // 插槽
        // const foo = h(Foo, {}, h('p', {}, '我是插槽内容p'))
        // 传入一个数组
        // const foo = h(Foo, {}, [h('p', {}, '123'), h('p', {}, '456')])
        // 具名插槽
        // const foo = h(Foo, {}, { 
        //     header: h('p', {}, '123'),
        //     footer: h('p', {}, '456'),
        // })
        // 作用域插槽
        const foo = h(Foo, {}, {
            header: ({ msg }) => {
                return h('p', {}, '123' + msg)
            },
            footer: ({ test }) => {
                return h('p', {}, '456' + test)
            },
        })

        return h('div', {}, [app, foo])
    },
};

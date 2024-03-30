import { h, renderSlots } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
    name: "Foo",
    setup() {
        const msg = 'msg';
        const test = 'test';
        return {
            msg,
            test,
        };
    },
    render() {
        console.log(this.$slots, "this.slots", this);

        const foo = h("p", {}, "foo");
        // return h('div', {}, foo) // todo：这么写也不行，得用数组
        // return h('div', {}, [foo, renderSlots(this.$slots)])
        return h("div", {}, [
            renderSlots(this.$slots, 'header', { msg: this.msg }),
            foo,
            renderSlots(this.$slots, 'footer', { test: this.test }),
        ]);
    },
};

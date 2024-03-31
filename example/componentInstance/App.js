import { h, getCurrentInstance, provide, inject } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
    name: "App",
    setup() {
        const instance = getCurrentInstance()
        provide('one', 11111)
        provide('two', 22222)
        provide('fun', 666)
    },
    render() {
        return h('div', {}, [h(Center)])
    },
};

const Center = {
    name: 'Center',
    setup() {
        provide('three', '我离得更近')
    },
    render() {
        return h('div', {}, [h(Consumer)])
    }
}

const Consumer = {
    name: 'Consumer',
    setup() {
        const one = inject('one', 'default')
        const two = inject('two')
        const three = inject('three', () => 777)
        return {
            one,
            two,
            three,
        }
    },
    render() {
        return h('div', {}, [
            h('p', {}, '子组件显示1: ' + this.one),
            h('p', {}, '子组件显示2: ' + this.two),
            h('p', {}, 'three: ' + this.three),
        ])
    },
}

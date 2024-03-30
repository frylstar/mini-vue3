import { h } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'

window.self = null;
export const App = {
    name: 'App',
    // <template></template>
    // render
    render() {
        window.self = this
        return h(
            'div', 
            {
                id: 'root',
                // class: ['red', 'hard'],
                class: 'red hard',
                onClick() {
                    console.log('click')
                },
                onMousedown() {
                    console.log('mousedown')
                },
                onMouseup() {
                    console.log('onMouseup')
                },
            }, 
            // 'hi ' + this.msg
            // [
            //     h('p', { class: 'red' }, 'hello '+this.msg),
            //     h('p', { class: 'hard' }, 'mini-vue3')
            // ]
            [
                h('div', {}, 'hi, ' + this.msg),
                h(Foo, {
                    count: 1,
                    // on + event
                    onAdd() {
                        console.log('触发父组件onAdd')
                    },
                    onAddFoo(a, b) {
                        console.log('触发父组件onAddFoo', a, b)
                    }
                })
            ]
        )
    },

    setup() {
        return {
            msg: 'mini-vue3'
        }
    },
}

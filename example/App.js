import { h } from '../lib/guide-mini-vue.esm.js'

window.self = null;
export const App = {
    // <template></template>
    // render
    render() {
        window.self = this
        return h(
            'div', 
            {
                id: 'root',
                // class: ['red', 'hard']
                class: 'red hard'
            }, 
            // 'hi ' + this.msg
            [
                h('p', { class: 'red' }, 'hello '+this.msg),
                h('p', { class: 'hard' }, 'mini-vue3')
            ]
        )
    },

    setup() {
        return {
            msg: 'mini-vue3'
        }
    },
}

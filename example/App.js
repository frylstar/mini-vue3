import { h } from '../lib/guide-mini-vue.esm.js'

export const App = {
    // <template></template>
    // render
    render() {
        return h(
            'div', 
            {
                id: 'root',
                // class: ['red', 'hard']
                class: 'red hard'
            }, 
            // 'hi ' + this.msg
            [
                h('p', { class: 'red' }, 'hello'),
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

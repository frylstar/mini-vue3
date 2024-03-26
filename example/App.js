import { h } from '../lib/guide-mini-vue.esm.js'

export const App = {
    // <template></template>
    // render
    render() {
        return h('div', 'hi ' + this.msg)
    },

    setup() {
        return {
            msg: 'mini-vue3'
        }
    },
}

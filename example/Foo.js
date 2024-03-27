import { h } from '../lib/guide-mini-vue.esm.js'

export const Foo = {
    name: 'Foo',
    setup(props) {
        // props.count
        console.log(props)
        // props不可以被修改，readonly
        props.count++
        // console.log(props)
    },
    render() {
        return h('div', {}, 'foo: ' + this.count)
    }
}
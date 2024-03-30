import { h } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
    name: 'Foo',
    setup(props, { emit }) {
        // props.count
        console.log(props)
        // props不可以被修改，readonly
        props.count++
        // console.log(props)

        const emitAdd = () => {
            emit('add')
            emit('add-foo', 1, 3)
            return
        }
        return {
            emitAdd
        }
    },
    render() {
        const btn = h('button', {
            onClick: this.emitAdd
        }, '添加emit事件')

        return h('div', {}, [
            // 'foo: ' + this.count, // TODO: 还没支持纯文字,需要用h函数
            h('div', {}, 'foo: ' + this.count),
            btn,
        ])
    }
}
import { ref, h } from '../../lib/guide-mini-vue.esm.js'

export const App = {
    setup() {
        const count = ref(0)

        const onCount = () => {
            count.value++
        }

        const props = ref({
            foo: 'foo',
            bar: 'bar',
        })

        const onChangeProps1 = () => {
            props.value.foo = 'new-foo'
        }
        const onChangeProps2 = () => {
            props.value.foo = undefined
        }
        const onChangeProps3 = () => {
            props.value = { foo: 'foo' }
        }

        return {
            count,
            onCount,
            onChangeProps1,
            onChangeProps2,
            onChangeProps3,
            props,
        }
    },
    render() {
        return h("div", {
            id: 'test',
            ...this.props,
        },
        [
            h('div', {}, 'count: ' + this.count), // 依赖收集
            h('button', {
                onClick: this.onCount,
            }, '点击累加'),
            h('button', {
                onClick: this.onChangeProps1,
            }, 'changeProps - 值改变了 - 修改'),
            h('button', {
                onClick: this.onChangeProps2,
            }, 'changeProps - 值变成 undefine|null - 删除'),
            h('button', {
                onClick: this.onChangeProps3,
            }, 'changeProps - key在新的里面没有了 - 修改')
        ]);
    },
};

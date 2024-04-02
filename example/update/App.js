import { ref, h } from '../../lib/guide-mini-vue.esm.js'

export const App = {
    setup() {
        const count = ref(0)

        const onCount = () => {
            count.value++
        }

        return {
            count,
            onCount,
        }
    },
    render() {
        return h("div", {
            id: 'test',
        },
        [
            h('div', {}, 'count: ' + this.count), // 依赖收集
            h('button', {
                onClick: this.onCount,
            }, '点击累加')
        ]);
    },
};

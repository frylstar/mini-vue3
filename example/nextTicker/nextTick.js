// 测试 nextTick 逻辑
import { h, ref } from "../../lib/guide-mini-vue.esm.js";

// 如果 for 循环改变 count 的值 100 次的话
// 会同时触发 100 次的 update 页面逻辑
// 这里可以把 update 页面的逻辑放到微任务中执行
// 避免更改了响应式对象就会执行 update 的逻辑
// 因为只有最后一次调用 update 才是有价值的
window.count = ref(1);



export default {
  name: "NextTicker",
  setup() {
    const count = ref(1)

    function onClick() {
        for (let i = 0; i < 100; i++) {
            count.value = i;
        }
    }

    return {
        count,
        onClick,
    }
  },
  render() {
    const button = h('button', { onClick: this.onClick }, 'update')
    const p = h('p', {}, "count: " + this.count)

    return h(
      "div",
      {},
      [button, p]
    );
  },
};

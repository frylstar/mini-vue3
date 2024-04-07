import { h, ref, reactive } from "../../lib/guide-mini-vue.esm.js";
import NextTicker from "./NextTicker.js";
import nextTick from "./nextTick.js";

export default {
  name: "App",
  setup() {},

  render() {
    // return h("div", { tId: 1 }, [h("p", {}, "主页"), h(nextTick)]);
    return h("div", { tId: 1 }, [h("p", {}, "主页"), h(NextTicker)]);
  },
};

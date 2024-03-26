// 这里需要写全文件后缀名，因为不会自动补齐
import { createApp } from '../lib/guide-mini-vue.esm.js'
import { App } from './App.js';

const rootContainer = document.querySelector('#app')
createApp(App).mount(rootContainer);
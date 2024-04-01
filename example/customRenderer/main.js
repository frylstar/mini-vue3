import { createRenderer } from '../../lib/guide-mini-vue.esm.js'
import { App } from './App.js'
console.log(PIXI)

// Create a PixiJS application.
const game = new PIXI.Application({
    width: 500,
    height: 500,
});

// Then adding the application's canvas to the DOM body.
document.body.appendChild(game.view);

// 自定义渲染器
const renderer = createRenderer({
    createElement(type) {
        if (type === 'rect') {
            const rect = new PIXI.Graphics()
            rect.beginFill(0xff0000)
            rect.drawRect(0, 0, 100, 100)
            rect.endFill()
            return rect
        }
    },
    patchProp(el, key, value) {
        el[key] = value
    },
    insert(el, parent) {
        parent.addChild(el)
    }
})

// const root = document.querySelector('#root');
// createApp(App).mount(root)
renderer.createApp(App).mount(game.stage)

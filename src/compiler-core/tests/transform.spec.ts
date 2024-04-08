import { NodeTypes } from "../src/ast"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"

describe('transform', () => {
    it('happy path', () => {
        const ast = baseParse("<div>hi, {{message}}</div>")

        // 由外部扩展，实现了插件体系，把程序的变动点和稳定点分离开，保证了程序的可测试性
        const plugin = (node) => {
            if (node.type === NodeTypes.TEXT) {
                node.content = node.content + "mini-vue";
            }
        }

        transform(ast, {
            nodeTransforms: [plugin]
        })

        const nodeText = ast.children[0].children[0]
        expect(nodeText.content).toBe('hi, mini-vue')
    })
})
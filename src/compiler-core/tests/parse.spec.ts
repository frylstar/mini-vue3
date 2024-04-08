import { NodeTypes } from "../src/ast"
import { baseParse } from "../src/parse"

describe('Parse', () => {
    describe('interpolation', () => {
        test('simple interpolation', () => {
            const ast = baseParse("{{ message }}")

            // root
            expect(ast.children[0]).toStrictEqual({
                type:  NodeTypes.INTERPOLATION, // 插值类型
                content: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'message',
                }
            })
        })
    })
})
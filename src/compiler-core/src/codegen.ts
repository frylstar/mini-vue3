import { isString } from "../../shared";
import { NodeTypes } from "./ast";
import { CREATE_ELEMENT_VNODE, TO_DISPLAY_STRING, helperMapName } from "./runtimeHelpers";

export function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;

    genFunctionPremble(ast, context); // 前导码

    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");

    push(`function ${functionName}(${signature}){`);
    push("return ");

    genNode(ast.codegenNode, context);
    console.log('ast.codegenNode', ast.codegenNode)
    push("}");

    console.log(context.code, "final code");
    return {
        code: context.code,
    };
}

function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };

    return context;
}

function genFunctionPremble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(
            `const { ${ast.helpers
                .map(aliasHelper)
                .join(", ")} } = ${VueBinging}`
        );
    }
    push("\n");
    push("return ");
}

function genNode(node: any, context) {
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context);
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break;
        case NodeTypes.ELEMENT:
            genElement(node, context)
            break;
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context);
            break;
        default:
            break;
    }
}

function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        } else {
            genNode(child, context);
        }
    }
}

function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    
    push(`${helper(CREATE_ELEMENT_VNODE)}(`)
    genNoeList(genNullable([tag, props, children]), context)
    // genNode(children, context);
    push(")")
}

function genNoeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node)
        } else {
            genNode(node, context)
        }

        if (i < nodes.length - 1) {
            push(",")
        }
    }
}

function genNullable(args: any) {
    return args.map((arg) => arg || "null")
}

function genExpression(node: any, context: any) {
    const { push } = context;

    push(`${node.content}`)
}

function genInterpolation(node: any, context: any) {
    const { push, helper } = context;
    console.log(node)
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context)
    push(')')
}

function genText(node: any, context: any) {
    const { push } = context;

    push(`'${node.content}'`);
}
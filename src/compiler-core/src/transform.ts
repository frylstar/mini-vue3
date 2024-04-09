import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
     // 1. 创建 context
    const context = createTransformContext(root, options);

    // 1. 遍历node - 深度优先搜索
    traverseNode(root, context);

    createRootCodegen(root, context);

    root.helpers = [...context.helpers.keys()];
}

function createRootCodegen(root, context) {
    const { children } = root;
    // 只支持一个根节点
    // 并且还是一个single text node
    const child = children[0];

    // 如果是 element 类型的话 ， 那么我们需要把它的 codegenNode 赋值给 root
    // root 其实是个空的什么数据都没有的节点
    // 所以这里需要额外的处理 codegenNode
    // codegenNode 的目的是专门为了 codegen 准备的  为的就是和 ast 的 node 分离开
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    } else {
        root.codegenNode = child;
    }
}

function traverseNode(node: any, context) {
    console.log(node);
    // 由外部扩展，实现了插件体系，把程序的变动点和稳定点分离开，保证了程序的可测试性
    // 遍历调用所有的 nodeTransforms
    // 把 node 给到 transform
    // 用户可以对 node 做处理
    const nodeTransforms = context.nodeTransforms;
    const exitFns: any = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        // 调用插件之后会返回一个函数
        const onExit = transform(node, context);
        if (onExit) exitFns.push(onExit);
    }
    
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            // 插值的点，在于后续生成 render 代码的时候是获取变量的值
            context.helper(TO_DISPLAY_STRING);
            break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            traverseChildren(node, context);
            break;
        default:
            break;
    }

    let i = exitFns.length;
    // i-- 这个很巧妙
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while(i--) {
        exitFns[i]();
    }
}

function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}

function createTransformContext(root: any, options: any) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(name) {
            // 这里会收集调用的次数
            // 收集次数是为了给删除做处理的， （当只有 count 为0 的时候才需要真的删除掉）
            // helpers 数据会在后续生成代码的时候用到
            const count = context.helpers.get(name) || 0;
            context.helpers.set(name, count + 1);
        },
    };

    return context;
}

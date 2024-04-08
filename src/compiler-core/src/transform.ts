export function transform(root, options = {}) {
    const context = createTransformContext(root, options);

    // 1. 遍历 - 深度优先搜索
    // 2. 修改 text content
    traverseNode(root, context);

    createRootCodegen(root);
}

function createRootCodegen(root) {
    root.codegenNode = root.children[0];
}

function traverseNode(node: any, context) {
    console.log(node);
    // 由外部扩展，实现了插件体系，把程序的变动点和稳定点分离开，保证了程序的可测试性
    const nodeTransforms = context.nodeTransforms;
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        transform(node);
    }

    traverseChildren(node, context);
}

function traverseChildren(node, context) {
    const children = node.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context);
        }
    }
}

function createTransformContext(root: any, options: any) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
    };

    return context;
}

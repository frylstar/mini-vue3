import { NodeTypes } from "./ast";

// 解析插值
export function baseParse(content: string) {
    const context = createParseContext(content);

    return createRoot(parseChildren(context));
}

function parseChildren(context) {
    const nodes: any = [];

    let node;
    if (context.source.startsWith("{{")) {
        node = parseInterpolation(context);
    }

    nodes.push(node);

    return nodes;
}

function parseInterpolation(context) {
    // {{ message }}
    const openDelimiter = "{{";
    const closeDelimiter = "}}";

    // indexOf第二个参数设置从哪个位置开始查起
    const closeIndex = context.source.indexOf(
        closeDelimiter,
        openDelimiter.length
    );

    // message}} 去掉左侧两个{{
    // context.source = context.source.slice(openDelimiter.length)
    advanceBy(context, openDelimiter.length);
    // 获取插值的长度
    const rawContentLength = closeIndex - openDelimiter.length;

    const rawContent = context.source.slice(0, rawContentLength);
    const content = rawContent.trim(); // 去除空格

    console.log("content:", content);

    // 清空已处理的，继续推进
    // context.source = context.source.slice(rawContentLength + closeDelimiter.length)
    advanceBy(context, rawContentLength + closeDelimiter.length);

    console.log("context.source:", context.source);

    return {
        type: NodeTypes.INTERPOLATION, // 插值类型
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        },
    };
}

function advanceBy(context: any, length: number) {
    context.source = context.source.slice(length);
}

function createRoot(children) {
    return {
        children,
    };
}

function createParseContext(content: string) {
    return {
        source: content,
    };
}

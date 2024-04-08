import { NodeTypes } from "./ast";

const enum TagType {
    Start,
    End,
}

// 解析插值
export function baseParse(content: string) {
    const context = createParseContext(content);

    return createRoot(parseChildren(context));
}

function parseChildren(context) {
    const nodes: any = [];

    let node;
    const s = context.source;
    if (s.startsWith("{{")) {
        node = parseInterpolation(context);
    } else if (s[0] === "<") {
        if (/[a-z]/i.test(s[1])) {
            node = parseElement(context);
        }
    }

    if (!node) {
        node = parseText(context);
    }

    nodes.push(node);

    return nodes;
}

function parseText(context) {
    // 1. 获取content
    const content = parseTextData(context, context.source.length);

    return {
        type: NodeTypes.TEXT,
        content,
    };
}

function parseTextData(context: any, length) {
    const content = context.source.slice(0, length);

    // 2. 推进
    advanceBy(context, length);
    return content;
}

function parseElement(context) {
    // Implement
    const element = parseTag(context, TagType.Start);

    parseTag(context, TagType.End);

    console.log("------------", context);

    return element;
}

function parseTag(context, type) {
    // 1. 解析tag(开始结束标签)
    const match: any = /^<\/?([a-z]*)/i.exec(context.source);
    console.log(match); // [ '<div', 'div', index: 0, input: '<div></div>', groups: undefined ]
    const tag = match[1];
    // 2. 删除处理完成的代码
    advanceBy(context, match[0].length);
    advanceBy(context, 1);

    // 结束标签直接return掉
    if (type === TagType.End) return;

    return {
        type: NodeTypes.ELEMENT,
        tag,
    };
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

    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim(); // 去除空格

    console.log("content:", content);

    // 清空已处理的，继续推进
    // context.source = context.source.slice(closeDelimiter.length)
    advanceBy(context, closeDelimiter.length);

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

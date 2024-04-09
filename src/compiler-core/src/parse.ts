import { NodeTypes } from "./ast";

const enum TagType {
    Start,
    End,
}

// 解析插值
export function baseParse(content: string) {
    const context = createParseContext(content);

    return createRoot(parseChildren(context, []));
}

function parseChildren(context, ancestors) {
    const nodes: any = [];

    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        } else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
    
        if (!node) {
            node = parseText(context);
        }
    
        nodes.push(node);
    }

    return nodes;
}

function isEnd(context, ancestors) {
    // 2. 遇到结束标签的时候
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    
    // 1. source有值的时候，即不为“”，为“”则结束
    return !s;
}

function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];

    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }

    // 1. 获取content
    const content = parseTextData(context, endIndex);
    console.log('parseText结果: ', content)

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

function parseElement(context, ancestors) {
    // Implement
    const element: any = parseTag(context, TagType.Start);

    ancestors.push(element);

    const children = parseChildren(context, ancestors);

    ancestors.pop();

    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagType.End);
    } else {
        throw new Error(`缺少结束标签：${element.tag}`)
    }

    element.children = children;
    console.log("parseElement之后: ", context);

    return element;
}

function startsWithEndTagOpen(source, tag) {
    return source.startsWith("</") && source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
}

function parseTag(context, type) {
    // 1. 解析tag(开始结束标签)
    const match: any = /^<\/?([a-z]*)/i.exec(context.source);
    console.log('parseTag正则match结果:', match); // [ '<div', 'div', index: 0, input: '<div></div>', groups: undefined ]
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

// 解析插值
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

    console.log("parseInterpolation结果1:", content);

    // 清空已处理的，继续推进
    // context.source = context.source.slice(closeDelimiter.length)
    advanceBy(context, closeDelimiter.length);

    console.log("context.parseInterpolation结果2:", context.source);

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
        type: NodeTypes.ROOT,
        helpers: [],
    };
}

function createParseContext(content: string) {
    return {
        source: content,
    };
}

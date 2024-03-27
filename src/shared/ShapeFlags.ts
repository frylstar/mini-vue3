// 位运算符，<< 左移，拥有更好的性能
export const enum ShapeFlags {
    ELEMENT = 1, // 0001
    COMPONENT = 1 << 1, // 0010
    TEXT_CHILDREN = 1 << 2, // 0100
    ARRAY_CHILDREN = 1 << 3, // 1000
}

// | 
// & 都为1 才为1
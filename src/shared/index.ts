export const extend = Object.assign;

export const isObject = (val) => {
    return val !== null && typeof val === "object";
};

export const hasChange = (val, newValue) => {
    return !Object.is(val, newValue);
};

export const hasOwn = (val, key) =>
    Object.prototype.hasOwnProperty.call(val, key);

// 字符串替换：add-foo -> addFoo
export const camelize = (str: string) => {
    return str.replace(/-(\w)/g, (_: string, c: string) => {
        // add-foo ->  _: -f   c: f
        return c ? c.toUpperCase() : "";
    });
};

// 首字母大写
export const capitalize = (str: string) => {
    // slice(0, 1) charAt(0)
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toHandlerKey = (str: string) => {
    return str ? "on" + capitalize(str) : "";
};

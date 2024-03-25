import { hasChange, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";


class RefImpl {
    private _value: any;
    private _rawValue: any;
    public dep; // ref过来的都是单个值， proxy只针对于对象，所以用{}包裹，使用get和set
    public __v_isRef = true

    constructor(value) {
        this._rawValue = value;
        // 1. 看value是否是对象，对象的话用reactive包裹
        this._value = convert(value)

        this.dep = new Set()
    }

    get value() {
        trackRefValue(this)
        return this._value;
    }

    set value(newValue) {
        // 注意：一定是先去修改了value值，再去通知
        // 判断值是否变化; Object.is() 静态方法确定两个值是否为相同值。
        // 对比的时候为 对象，用_rawValue记录proxy之前的值，因为用了reactive的proxy代理
        if (hasChange(newValue, this._rawValue)) {
            this._rawValue = newValue
            this._value = convert(newValue)
            triggerEffects(this.dep);
        }
    }
}
/**
 * 看value是否是对象，对象的话用reactive包裹
 * @param value 
 */
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
/**
 * 收集依赖
 * @param ref 
 */
function trackRefValue(ref: RefImpl): void {
    if (isTracking()) {
        trackEffects(ref.dep)
    }
}

export function ref(value) {
    const res = new RefImpl(value);
    return res;
}
/**
 * 检查某个值是否为 ref
 * @param ref 
 */
export function isRef(ref) {
    return !!ref.__v_isRef;
}
/**
 * 如果参数是 ref，则返回内部值，否则返回参数本身。这是 val = isRef(val) ? val.value : val 计算的一个语法糖
 * @param ref 
 */
export function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
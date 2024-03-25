import { ReactiveEffect } from './effect'

class ComputedRefImpl {
    public _getter: any;
    private _dirty: Boolean = true;
    private _value: any;
    private _effect: any;

    constructor(getter) {
        this._getter = getter;
        this._effect = new ReactiveEffect(getter, () => {
            // scheduler 当getter依赖的响应式对象更新时，打开dirty
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }

    get value() {
        // 锁，仅在getter中依赖的响应式对象的值改变的时候打开
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        
        return this._value;
    }
}

/**
 * 接受一个 getter 函数，返回一个只读的响应式 ref 对象。该 ref 通过 .value 暴露 getter 函数的返回值。
 * 它也可以接受一个带有 get 和 set 函数的对象来创建一个可写的 ref 对象。
 * @param getter 
 */
export function computed(getter) {
    return new ComputedRefImpl(getter)
}
import { camelize, toHandlerKey } from "../shared/index"

export function emit(instance, event: string, ...args) {
    console.log(event, '触发emit事件')
    // 需要转换
    // add -> onAdd
    // add-foo -> onAddFoo
    // instance.props -> event
    const { props } = instance
    const handlerName = toHandlerKey(camelize(event))
    const handler = props[handlerName]
    handler && handler(...args)
}
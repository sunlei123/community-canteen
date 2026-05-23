
// 通用事件绑定辅助函数，用于全局或在模块中引用
export function on(id, event, callback) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, callback);
    } else {
        // console.warn('Element not found for event binding:', id);
    }
}

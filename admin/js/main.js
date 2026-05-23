import { AdminApp } from './core/AdminApp.js';
import { on } from './utils.js';

// 将全局辅助函数挂载到 window（如果有需要全局使用的辅助方法可以在这里挂载）
window.on = on;

import { authMixin } from './modules/auth.js';
import { dashboardMixin } from './modules/dashboard.js';
import { ordersMixin } from './modules/orders.js';
import { menuMixin } from './modules/menu.js';
import { dailyMenuMixin } from './modules/dailyMenu.js';
import { usersMixin } from './modules/users.js';
import { logsMixin } from './modules/logs.js';
import { reportsMixin } from './modules/reports.js';
import { studentsMixin } from './modules/students.js';
import { settingsMixin } from './modules/settings.js';
import { adminsMixin } from './modules/admins.js';

// 合并所有 mixin 到 AdminApp 的原型上
Object.assign(AdminApp.prototype, authMixin, dashboardMixin, ordersMixin, menuMixin, dailyMenuMixin, usersMixin, logsMixin, reportsMixin, studentsMixin, settingsMixin, adminsMixin);

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});
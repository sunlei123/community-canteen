export const authMixin = {
    async login() {
        // 由于登录功能已彻底转移至物理独立的 login.html 运行，此方法在 index.html 流程中已废弃
        console.warn('login() method is deprecated on index.html. Auth is now handled by login.html');
        window.location.href = 'login.html';
    }
,

    async verifyToken() {
        if (!this.token) {
            this.logout();
            return;
        }

        try {
            // 向后端的验证接口发起一次真实的心跳探测请求
            const response = await fetch(`${this.baseURL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showMainApp();
                    this.loadDashboard();
                    return;
                }
            }

            console.warn('保存的 Token 验证无效或已过期，自动登出重定向至登录页。');
            this.logout();
        } catch (error) {
            console.error('Token 验证心跳探测失败（可能网络连接已断开）:', error);
            // 如果是网络报错我们默认放行或者安全登出，这里建议选择登出以保证系统的最高安全性
            this.logout();
        }
    }
,

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        this.token = null;
        this.showLoginPage();
    }
,

    showLoginPage() {
        window.location.href = '/admin/login.html';
    }
,

    showMainApp() {
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.classList.remove('hidden');
        }
        
        // 显示管理员信息
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = adminInfo.name || '管理员';
        }
    }
,

    switchPage(page) {
        // 更新侧边栏状态
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) activeItem.classList.add('active');

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
        });

        // 显示目标页面
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) targetPage.classList.remove('hidden');
        this.currentPage = page;

        // 加载页面数据
        switch (page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'dailyMenu':
                this.loadDailyMenuPage();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'menu':
                this.loadMenu();
                break;
            case 'logs':
                this.loadLogs();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'students':
                this.loadStudents();
                break;
            case 'settings':
                this.initSettings();
                break;
            case 'admins':
                this.loadAdmins();
                break;
        }

        // 手机端切换页面后自动关闭侧边栏
        const sidebar = document.getElementById('adminSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    }

};
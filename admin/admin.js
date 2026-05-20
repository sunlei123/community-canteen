// 管理后台JavaScript代码
class AdminApp {
    constructor() {
        // 自动检测环境并设置正确的API地址
        this.baseURL = this.getApiBaseUrl();
        this.token = localStorage.getItem('adminToken');
        this.currentPage = 'dashboard';
        this.isLoading = false;
        this.init();
    }

    getApiBaseUrl() {
        // 检测当前环境
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // 本地开发环境
            return 'http://localhost:3001/api';
        } else if (hostname.includes('vercel.app')) {
            // Vercel部署环境
            return `${window.location.protocol}//${window.location.host}/api`;
        } else {
            // 其他环境，使用相对路径
            return '/api';
        }
    }

    init() {
        console.log('初始化管理后台应用...');
        console.log('baseURL:', this.baseURL);
        console.log('当前token:', this.token ? '存在' : '不存在');
        
        // 初始化Lucide图标（安全检查）
        try {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
                console.log('Lucide图标初始化成功');
            } else {
                console.warn('Lucide库未加载，跳过图标初始化');
            }
        } catch (error) {
            console.warn('Lucide图标初始化失败:', error);
        }
        
        // 检查登录状态
        if (this.token) {
            console.log('发现已保存的token，验证中...');
            this.verifyToken();
        } else {
            console.log('没有token，显示登录页面');
            this.showLoginPage();
        }

        // 绑定事件
        this.bindEvents();
        console.log('管理后台应用初始化完成');
    }

    bindEvents() {
        // 辅助函数：安全绑定事件，如果元素不存在则跳过
        const on = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };

        // 登录表单
        on('loginForm', 'submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // 退出登录
        on('logoutBtn', 'click', () => {
            this.logout();
        });

        // 侧边栏导航
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });

        // 订单管理
        on('orderStatusFilter', 'change', () => this.loadOrders());
        on('refreshOrders', 'click', () => this.loadOrders());

        // 菜品管理
        on('addMenuItemBtn', 'click', () => this.showAddMenuModal());
        on('cancelAddMenu', 'click', () => this.hideAddMenuModal());
        on('addMenuForm', 'submit', (e) => {
            e.preventDefault();
            this.saveMenuItem();
        });

        // 菜品图片上传
        on('menuImageFile', 'change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadMenuImage(e.target.files[0]);
            }
        });

        // 每日菜单
        on('dailyMenuDateSelector', 'change', (e) => this.loadDailyMenuForDate(e.target.value));
        on('saveDailyMenuBtn', 'click', () => this.saveDailyMenu());

        // 家长用户
        on('addUserBtn', 'click', () => this.showAddUserModal());
        on('cancelUserBtn', 'click', () => {
            const m = document.getElementById('userModal');
            if (m) m.classList.add('hidden');
        });
        on('userForm', 'submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // 打印小票
        on('closePrintSlip', 'click', () => {
            const m = document.getElementById('printSlipModal');
            if (m) m.classList.add('hidden');
        });
        on('printSlipBtn', 'click', () => {
            const content = document.getElementById('printSlipContent');
            if (!content) return;
            const printContent = content.textContent;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 20px;">${printContent}</pre>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        });

        // 报告生成
        on('generateReport', 'click', () => this.generateReport());

        // 学生管理
        on('addStudentBtn', 'click', () => {
            const title = document.getElementById('studentModalTitle');
            const form = document.getElementById('addStudentForm');
            const sid = document.getElementById('studentId');
            const modal = document.getElementById('addStudentModal');
            if (title) title.textContent = '添加学生';
            if (form) form.reset();
            if (sid) sid.value = '';
            if (modal) modal.classList.remove('hidden');
        });
        on('cancelAddStudent', 'click', () => {
            const m = document.getElementById('addStudentModal');
            if (m) m.classList.add('hidden');
        });
        on('addStudentForm', 'submit', (e) => {
            e.preventDefault();
            this.saveStudent();
        });
        on('searchStudentBtn', 'click', () => this.loadStudents());
        on('importExcelBtn', 'click', () => {
            const inp = document.getElementById('importExcelInput');
            if (inp) inp.click();
        });
        on('importExcelInput', 'change', (e) => {
            if (e.target.files.length > 0) {
                this.importExcel(e.target.files[0]);
                e.target.value = '';
            }
        });
        on('downloadTemplateBtn', 'click', () => this.downloadTemplate());
    }

    async login() {
        // 防止重复提交
        if (this.isLoading) {
            console.log('登录正在进行中，忽略重复请求');
            return;
        }

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('开始登录:', { username, baseURL: this.baseURL });
        
        if (!username || !password) {
            this.showError('loginError', '请输入用户名和密码');
            return;
        }
        
        this.isLoading = true;
        this.setLoading('login', true);
        
        try {
            console.log('发送登录请求...');
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('收到响应:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('响应数据:', data);

            if (data.success) {
                console.log('登录成功');
                this.token = data.data.token;
                localStorage.setItem('adminToken', this.token);
                localStorage.setItem('adminInfo', JSON.stringify(data.data.admin || data.data.user));
                this.showMainApp();
                this.loadDashboard();
            } else {
                console.log('登录失败:', data.message);
                this.showError('loginError', data.message || '登录失败');
            }
        } catch (error) {
            console.error('登录错误:', error);
            this.showError('loginError', '登录失败: ' + error.message);
        } finally {
            console.log('重置登录按钮状态');
            this.isLoading = false;
            this.setLoading('login', false);
        }
    }

    async verifyToken() {
        // 简化验证逻辑，如果有token就直接显示主应用
        // 在实际项目中应该向服务器验证token的有效性
        if (this.token) {
            this.showMainApp();
            this.loadDashboard();
        } else {
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        this.token = null;
        this.showLoginPage();
    }

    showLoginPage() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // 显示管理员信息
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        document.getElementById('adminName').textContent = adminInfo.name || '管理员';
    }

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
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch(`${this.baseURL}/admin/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.updateDashboardStats(data.data);
                this.renderOrdersChart(data.data.dailyOrders);
                this.renderRecentOrders(data.data.recentOrders);
            }
        } catch (error) {
            console.error('加载仪表板数据失败:', error);
        }
    }

    updateDashboardStats(data) {
        document.getElementById('todayOrders').textContent = data.statistics.todayOrdersStats?.count || 0;
        document.getElementById('todayRevenue').textContent = `¥${(data.statistics.todayOrdersStats?.revenue || 0).toFixed(2)}`;
        
        // 计算待处理订单数
        const pendingCount = data.statusDistribution.pending || 0;
        document.getElementById('pendingOrders').textContent = pendingCount;
        
        document.getElementById('totalStudentsCount').textContent = data.statistics.totalStudents || 0;
        document.getElementById('totalMenuItems').textContent = data.menuStats.total;

        // 渲染今日状态详细分布
        const stats = data.statistics.todayOrdersStats || { count: 0, revenue: 0, statusDistribution: {}, dishes: {} };
        const todayStatusContainer = document.getElementById('todayStatusStats');
        todayStatusContainer.innerHTML = Object.entries(stats.statusDistribution || {}).map(([status, count]) => `
            <div class="flex justify-between items-center py-1">
                <span>${this.getStatusText(status)}</span>
                <span class="font-semibold text-blue-600">${count} 单</span>
            </div>
        `).join('') || '<p class="text-gray-500">今日暂无订餐订单</p>';

        // 渲染今日已确认菜品后厨制作指示
        const todayDishContainer = document.getElementById('todayDishStats');
        todayDishContainer.innerHTML = Object.entries(stats.dishes || {}).map(([name, count]) => `
            <div class="flex justify-between items-center py-1.5 border-b border-green-100 last:border-0">
                <span class="font-medium text-gray-800">${name}</span>
                <span class="bg-green-600 text-white px-2.5 py-0.5 rounded text-xs font-semibold">${count} 份</span>
            </div>
        `).join('') || '<p class="text-gray-500">今日暂无已支付/确认的菜品需要制作</p>';
    }

    renderOrdersChart(dailyOrders) {
        const ctx = document.getElementById('ordersChart').getContext('2d');
        
        // 销毁现有图表
        if (this.ordersChart) {
            this.ordersChart.destroy();
        }

        this.ordersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyOrders.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: '订单数量',
                    data: dailyOrders.map(d => d.count),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderRecentOrders(orders) {
        const container = document.getElementById('recentOrders');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-gray-500">暂无订单</p>';
            return;
        }

        container.innerHTML = orders.slice(0, 5).map(order => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                    <p class="font-medium">${order.orderNumber}</p>
                    <p class="text-sm text-gray-600">¥${order.totalPrice.toFixed(2)}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</span>
            </div>
        `).join('');
    }

    async loadOrders() {
        try {
            const status = document.getElementById('orderStatusFilter').value;
            const params = new URLSearchParams();
            if (status) params.append('status', status);

            const response = await fetch(`${this.baseURL}/admin/orders?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderOrdersTable(data.data);
            }
        } catch (error) {
            console.error('加载订单失败:', error);
        }
    }

    renderOrdersTable(orders) {
        const container = document.getElementById('ordersTable');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">暂无订单</p>';
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单号</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">配送时间</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${orders.map(order => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ${order.orderNumber}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ¥${order.totalPrice.toFixed(2)}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(order.status)}">
                                        ${this.getStatusText(order.status)}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${order.deliveryDate} ${order.mealTime === 'lunch' ? '午餐' : '晚餐'}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${new Date(order.createdAt).toLocaleString()}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <select class="status-select text-sm border border-gray-300 rounded px-2 py-1" data-id="${order.id}">
                                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>待处理</option>
                                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>已确认</option>
                                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>制作中</option>
                                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>待配送</option>
                                        <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>配送中</option>
                                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>已完成</option>
                                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>已取消</option>
                                    </select>
                                    <button class="view-slip-btn text-blue-600 hover:text-blue-900" data-id="${order.id}">查看模板</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this._ordersCache = orders;
        this.bindOrderEvents();
    }

    bindOrderEvents() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const id = select.dataset.id;
                const status = e.target.value;
                this.updateOrderStatus(id, status);
            });
        });

        document.querySelectorAll('.view-slip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const order = this._ordersCache.find(o => o.id === id);
                if (order) {
                    this.showPrintSlip(order);
                }
            });
        });
    }

    showPrintSlip(order) {
        const modal = document.getElementById('printSlipModal');
        const content = document.getElementById('printSlipContent');
        
        const itemsText = order.items.map(item => 
            `${item.name || item.food?.name}  x${item.quantity}  ¥${(item.price || item.food?.price || 0).toFixed(2)}`
        ).join('\n');

        const studentName = order.studentName || order.address?.split(' ')[0] || '未知学生';
        const address = order.address || '';
        
        const slipText = `
================================
  董老师小厨房 - 配送及配餐联
================================
订单编号：${order.orderNumber}
下单时间：${new Date(order.createdAt).toLocaleString()}
送餐日期：${order.deliveryDate} ${order.mealTime === 'lunch' ? '午餐' : '晚餐'}
--------------------------------
学生姓名：${studentName}
配送信息：${address}
--------------------------------
商品明细：
${itemsText}
--------------------------------
订单金额：¥${order.totalPrice.toFixed(2)}
支付状态：已支付 / 确认
================================
      谢谢惠顾，祝您用餐愉快！
================================
        `.trim();

        content.textContent = slipText;
        modal.classList.remove('hidden');
    }

    async updateOrderStatus(orderId, status) {
        try {
            const response = await fetch(`${this.baseURL}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('订单状态更新成功', 'success');
                this.loadOrders(); 
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('更新失败', 'error');
        }
    }

    async loadMenu() {
        try {
            const response = await fetch(`${this.baseURL}/menu`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderMenuTable(data.data);
            }
        } catch (error) {
            console.error('加载菜品失败:', error);
        }
    }

    renderMenuTable(menuItems) {
        const container = document.getElementById('menuTable');
        
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">图片</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">价格</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${menuItems.map(item => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <img src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}" alt="${item.name}" class="h-12 w-12 rounded-lg object-cover">
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ${item.name}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${this.getCategoryText(item.category)}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ¥${item.price.toFixed(2)}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${item.available ? '可用' : '不可用'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button class="edit-menu-btn text-blue-600 hover:text-blue-900" data-id="${item.id}">
                                        编辑
                                    </button>
                                    <button class="toggle-menu-btn text-blue-600 hover:text-blue-900" data-id="${item.id}" data-available="${!item.available}">
                                        ${item.available ? '禁用' : '启用'}
                                    </button>
                                    <button class="delete-menu-btn text-red-600 hover:text-red-900" data-id="${item.id}">
                                        删除
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this._menuCache = menuItems;
        this.bindMenuEvents();
    }

    bindMenuEvents() {
        document.querySelectorAll('.edit-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const item = this._menuCache.find(m => m.id === id);
                if (item) this.showEditMenuModal(item);
            });
        });

        document.querySelectorAll('.toggle-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const available = btn.dataset.available === 'true';
                this.toggleMenuItemStatus(id, available);
            });
        });

        document.querySelectorAll('.delete-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.deleteMenuItem(id);
            });
        });
    }

    showAddMenuModal() {
        document.getElementById('menuModalTitle').textContent = '添加菜品';
        document.getElementById('menuItemId').value = '';
        document.getElementById('addMenuForm').reset();
        document.getElementById('addMenuModal').classList.remove('hidden');
    }

    showEditMenuModal(item) {
        document.getElementById('menuModalTitle').textContent = '编辑菜品';
        document.getElementById('menuItemId').value = item.id;
        document.getElementById('menuItemName').value = item.name;
        document.getElementById('menuItemCategory').value = item.category;
        document.getElementById('menuItemPrice').value = item.price;
        document.getElementById('menuItemDescription').value = item.description || '';
        document.getElementById('menuItemNutrition').value = item.nutrition || '';
        document.getElementById('menuItemImageUrl').value = item.image || '';
        document.getElementById('addMenuModal').classList.remove('hidden');
    }

    hideAddMenuModal() {
        document.getElementById('addMenuModal').classList.add('hidden');
        document.getElementById('addMenuForm').reset();
    }

    async saveMenuItem() {
        const form = document.getElementById('addMenuForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        data.price = parseFloat(data.price);
        const isEdit = !!data.id;
        const url = isEdit ? `${this.baseURL}/admin/menu/${data.id}` : `${this.baseURL}/admin/menu`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(isEdit ? '菜品更新成功' : '菜品添加成功', 'success');
                this.hideAddMenuModal();
                this.loadMenu();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('保存菜品错误:', error);
            this.showToast('保存失败', 'error');
        }
    }

    async uploadMenuImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            this.showToast('正在上传图片...', 'info');
            const response = await fetch(`${this.baseURL}/admin/menu/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('图片上传成功', 'success');
                document.getElementById('menuItemImageUrl').value = result.data.url;
            } else {
                this.showToast(result.message || '图片上传失败', 'error');
            }
        } catch (error) {
            console.error('图片上传错误:', error);
            this.showToast('图片上传出错', 'error');
        }
    }

    async toggleMenuItemStatus(itemId, available) {
        try {
            const response = await fetch(`${this.baseURL}/admin/menu/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ available })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('状态更新成功', 'success');
                this.loadMenu();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            this.showToast('更新失败', 'error');
        }
    }

    async deleteMenuItem(itemId) {
        if (!confirm('确定要删除这个菜品吗？')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/admin/menu/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('菜品删除成功', 'success');
                this.loadMenu();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }

    // ==================== 每日菜单发布管理 (Daily Menu) ====================
    async loadDailyMenuPage() {
        const selector = document.getElementById('dailyMenuDateSelector');
        if (!selector.value) {
            selector.value = new Date().toISOString().split('T')[0];
        }
        
        try {
            const menuResponse = await fetch(`${this.baseURL}/menu`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const menuData = await menuResponse.json();
            if (menuData.success) {
                this._availableDishesCache = menuData.data.filter(item => item.available);
                this.renderDailyMenuDishesSelector();
            }
        } catch (error) {
            console.error('加载可用菜品失败:', error);
        }
        
        await this.loadDailyMenuForDate(selector.value);
    }

    async loadDailyMenuForDate(date) {
        try {
            const response = await fetch(`${this.baseURL}/admin/daily-menus?date=${date}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            this._currentDailyMenu = null;
            if (data.success && data.data) {
                this._currentDailyMenu = data.data;
            }
            
            this.updateDailyMenuCheckboxes();
            this.renderDailyMenuPreview();
        } catch (error) {
            console.error('加载每日菜单记录失败:', error);
        }
    }

    renderDailyMenuDishesSelector() {
        const container = document.getElementById('dailyMenuDishesSelector');
        if (!this._availableDishesCache || this._availableDishesCache.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">暂无可用菜品，请先去菜品管理添加</p>';
            return;
        }

        const categories = {
            meat: '荤菜',
            veggie: '素菜',
            dessert_fruit: '甜点/水果',
            soup: '汤',
            staple: '主食'
        };

        const grouped = this._availableDishesCache.reduce((acc, dish) => {
            acc[dish.category] = acc[dish.category] || [];
            acc[dish.category].push(dish);
            return acc;
        }, {});

        let html = '';
        for (const [catKey, catName] of Object.entries(categories)) {
            const dishes = grouped[catKey] || [];
            if (dishes.length === 0) continue;

            html += `
                <div class="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <h4 class="font-bold text-gray-800 mb-2.5 pb-1 border-b border-gray-200 text-sm flex items-center">
                        <span class="w-1.5 h-3.5 bg-blue-500 rounded mr-2"></span>${catName}
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        ${dishes.map(dish => `
                            <label class="flex items-center space-x-3 p-2 bg-white border border-gray-200 rounded-md hover:bg-blue-50 cursor-pointer text-xs transition duration-150">
                                <input type="checkbox" class="daily-menu-dish-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-id="${dish.id}" value="${dish.id}">
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-gray-900 truncate">${dish.name}</p>
                                    <p class="text-gray-500">¥${dish.price.toFixed(2)}</p>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        document.querySelectorAll('.daily-menu-dish-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                this.renderDailyMenuPreview();
            });
        });
    }

    updateDailyMenuCheckboxes() {
        const checkboxes = document.querySelectorAll('.daily-menu-dish-checkbox');
        const selectedIds = this._currentDailyMenu ? this._currentDailyMenu.dishes : [];
        
        checkboxes.forEach(cb => {
            cb.checked = selectedIds.includes(cb.value);
        });
        
        const badge = document.getElementById('dailyMenuStatusBadge');
        if (this._currentDailyMenu && this._currentDailyMenu.published) {
            badge.textContent = '已发布';
            badge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
        } else {
            badge.textContent = '未发布';
            badge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
        }
    }

    renderDailyMenuPreview() {
        const container = document.getElementById('dailyMenuPreviewList');
        const checkboxes = document.querySelectorAll('.daily-menu-dish-checkbox:checked');
        
        if (checkboxes.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8 text-xs bg-gray-50 rounded-lg border border-dashed">未勾选任何菜品，将默认拉取系统全量菜品</p>';
            return;
        }

        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        const dishes = this._availableDishesCache.filter(dish => selectedIds.includes(dish.id));

        container.innerHTML = dishes.map(dish => `
            <div class="flex justify-between items-center p-2.5 bg-white border border-gray-100 rounded-lg shadow-sm text-xs">
                <span class="font-medium text-gray-800">${dish.name}</span>
                <div class="flex items-center space-x-2">
                    <span class="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">${this.getCategoryText(dish.category)}</span>
                    <span class="text-green-600 font-semibold">¥${dish.price.toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    }

    async saveDailyMenu() {
        const date = document.getElementById('dailyMenuDateSelector').value;
        const checkboxes = document.querySelectorAll('.daily-menu-dish-checkbox:checked');
        const dishes = Array.from(checkboxes).map(cb => cb.value);

        if (!date) {
            this.showToast('请选择发布日期', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/admin/daily-menus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    date,
                    dishes,
                    published: true
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('每日菜单发布保存成功！', 'success');
                this.loadDailyMenuForDate(date);
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('发布每日菜单错误:', error);
            this.showToast('发布失败', 'error');
        }
    }

    // ==================== 家长用户管理 (User Manager) ====================
    async loadUsers() {
        try {
            const response = await fetch(`${this.baseURL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderUsersTable(data.data);
            }
        } catch (error) {
            console.error('加载家长用户列表失败:', error);
            this.showToast('加载家长列表失败', 'error');
        }
    }

    renderUsersTable(users) {
        const container = document.getElementById('usersTable');
        
        if (users.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">暂无家长用户记录</p>';
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">家长姓名</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">加入时间</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${users.map(user => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.phone}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(user.createdAt).toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button class="edit-user-btn text-blue-600 hover:text-blue-900" data-id="${user.id}">编辑</button>
                                    <button class="delete-user-btn text-red-600 hover:text-red-900" data-id="${user.id}">删除</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        this._usersCache = users;
        this.bindUserEvents();
    }

    bindUserEvents() {
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const user = this._usersCache.find(u => u.id === id);
                if (user) this.showEditUserModal(user);
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.deleteUser(id);
            });
        });
    }

    showAddUserModal() {
        document.getElementById('userModalTitle').textContent = '添加家长用户';
        document.getElementById('userId').value = '';
        document.getElementById('userForm').reset();
        document.getElementById('userModal').classList.remove('hidden');
    }

    showEditUserModal(user) {
        document.getElementById('userModalTitle').textContent = '编辑家长用户';
        document.getElementById('userId').value = user.id;
        document.getElementById('userPhone').value = user.phone;
        document.getElementById('userNameInput').value = user.name;
        document.getElementById('userModal').classList.remove('hidden');
    }

    async saveUser() {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        const isEdit = !!data.id;
        const url = isEdit ? `${this.baseURL}/admin/users/${data.id}` : `${this.baseURL}/admin/users`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(isEdit ? '用户信息更新成功' : '用户添加成功', 'success');
                document.getElementById('userModal').classList.add('hidden');
                this.loadUsers();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('保存用户失败:', error);
            this.showToast('保存用户失败', 'error');
        }
    }

    async deleteUser(id) {
        if (!confirm('确定要删除这个家长用户吗？删除后该家长将无法继续登录并下属学生关联受影响！')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('删除用户成功', 'success');
                this.loadUsers();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            this.showToast('删除失败', 'error');
        }
    }

    // ==================== 系统登录日志 (Login Logs) ====================
    async loadLogs() {
        try {
            const response = await fetch(`${this.baseURL}/admin/logs`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderLogsTable(data.data);
            }
        } catch (error) {
            console.error('加载系统登录日志失败:', error);
            this.showToast('加载登录日志失败', 'error');
        }
    }

    renderLogsTable(logs) {
        const container = document.getElementById('logsTable');
        
        if (logs.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">暂无系统登录日志记录</p>';
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-xs">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">登录时间</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">手机号/账号</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">系统角色</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                            <th class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">操作浏览器环境</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${logs.map(log => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-900">${new Date(log.loginTime).toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${log.phone}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-0.5 rounded text-[10px] ${log.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                                        ${log.role === 'admin' ? '管理员' : '家长'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-0.5 rounded text-[10px] ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${log.status === 'success' ? '成功' : '失败'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-900">${log.ip || '-'}</td>
                                <td class="px-6 py-4 text-gray-500 max-w-xs truncate" title="${log.userAgent}">
                                    ${log.userAgent || '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async deleteMenuItem(itemId) {
        if (!confirm('确定要删除这个菜品吗？')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/admin/menu/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('菜品删除成功', 'success');
                this.loadMenu();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }

    loadReports() {
        // 设置默认日期范围（最近7天）
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

        this.generateReport();
    }

    async generateReport() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`${this.baseURL}/admin/reports/business?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderReport(data.data);
            }
        } catch (error) {
            console.error('生成报告失败:', error);
        }
    }

    renderReport(report) {
        const container = document.getElementById('reportContent');
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card">
                    <h3 class="text-lg font-medium text-gray-900 mb-2">总订单数</h3>
                    <p class="text-3xl font-bold text-blue-600">${report.summary.totalOrders}</p>
                </div>
                <div class="card">
                    <h3 class="text-lg font-medium text-gray-900 mb-2">总营收</h3>
                    <p class="text-3xl font-bold text-green-600">¥${report.summary.totalRevenue.toFixed(2)}</p>
                </div>
                <div class="card">
                    <h3 class="text-lg font-medium text-gray-900 mb-2">平均订单价值</h3>
                    <p class="text-3xl font-bold text-purple-600">¥${report.summary.averageOrderValue.toFixed(2)}</p>
                </div>
                <div class="card">
                    <h3 class="text-lg font-medium text-gray-900 mb-2">完成订单数</h3>
                    <p class="text-3xl font-bold text-orange-600">${report.summary.completedOrders}</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="card">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">热门菜品</h3>
                    <div class="space-y-3">
                        ${report.popularItems.slice(0, 10).map((item, index) => `
                            <div class="flex justify-between items-center">
                                <span class="text-sm font-medium">${index + 1}. ${item.name}</span>
                                <span class="text-sm text-gray-600">${item.count}份 / ¥${item.revenue.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">订单状态分布</h3>
                    <div class="space-y-3">
                        ${Object.entries(report.statusBreakdown).map(([status, count]) => `
                            <div class="flex justify-between items-center">
                                <span class="text-sm font-medium">${this.getStatusText(status)}</span>
                                <span class="text-sm text-gray-600">${count}单</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 工具函数
    getStatusColor(status) {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            preparing: 'bg-orange-100 text-orange-800',
            ready: 'bg-purple-100 text-purple-800',
            delivering: 'bg-indigo-100 text-indigo-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusText(status) {
        const texts = {
            pending: '待处理',
            confirmed: '已确认',
            preparing: '制作中',
            ready: '待配送',
            delivering: '配送中',
            completed: '已完成',
            cancelled: '已取消'
        };
        return texts[status] || status;
    }

    getCategoryText(category) {
        const texts = {
            meat: '荤菜',
            veggie: '素菜',
            dessert_fruit: '甜点/水果',
            soup: '汤',
            staple: '主食'
        };
        return texts[category] || category;
    }

    setLoading(type, loading) {
        console.log(`setLoading: ${type} = ${loading}`);
        
        const text = document.getElementById(`${type}Text`);
        const spinner = document.getElementById(`${type}Loading`);
        
        if (!text) {
            console.error(`找不到元素: ${type}Text`);
            return;
        }
        
        if (!spinner) {
            console.error(`找不到元素: ${type}Loading`);
            return;
        }
        
        if (loading) {
            text.classList.add('hidden');
            spinner.classList.remove('hidden');
            console.log(`显示加载状态: ${type}`);
        } else {
            text.classList.remove('hidden');
            spinner.classList.add('hidden');
            console.log(`隐藏加载状态: ${type}`);
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.classList.remove('hidden');
        
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }

    showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 3秒后移除
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    // 学生管理相关方法
    async loadStudents() {
        try {
            const search = document.getElementById('studentSearchInput').value;
            const classFilter = document.getElementById('studentClassFilter').value;
            const guardianFilter = document.getElementById('studentGuardianFilter').value;
            
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (classFilter) params.append('class', classFilter);
            if (guardianFilter) params.append('guardian', guardianFilter);

            const response = await fetch(`${this.baseURL}/admin/students?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderStudentsTable(data.data);
            }
        } catch (error) {
            console.error('加载学生列表失败:', error);
            this.showToast('加载学生列表失败', 'error');
        }
    }

    renderStudentsTable(students) {
        const container = document.getElementById('studentsTable');
        
        if (students.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">暂无学生记录</p>';
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">序号</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">负责人</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">首次订餐日</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${students.map((student, idx) => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${idx + 1}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${student.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.class}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.guardian || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.phone || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.firstOrderDate || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button class="edit-btn text-blue-600 hover:text-blue-900" data-id="${student.id}">编辑</button>
                                    <button class="delete-btn text-red-600 hover:text-red-900" data-id="${student.id}">删除</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        // 缓存学生列表并绑定事件
        this._studentsCache = students;
        this.bindStudentEvents();
    }

    bindStudentEvents() {
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const student = this._studentsCache.find(s => s.id === id);
                if (student) this.editStudent(student);
            });
        });
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.deleteStudent(id);
            });
        });
    }

    editStudent(student) {
        document.getElementById('studentModalTitle').textContent = '编辑学生';
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentClass').value = student.class;
        document.getElementById('studentGuardian').value = student.guardian || '';
        document.getElementById('studentPhone').value = student.phone || '';
        document.getElementById('studentFirstOrderDate').value = student.firstOrderDate || '';
        document.getElementById('addStudentModal').classList.remove('hidden');
    }

    async saveStudent() {
        const form = document.getElementById('addStudentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        const isEdit = !!data.id;
        const url = isEdit ? `${this.baseURL}/admin/students/${data.id}` : `${this.baseURL}/admin/students`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(isEdit ? '学生信息更新成功' : '学生添加成功', 'success');
                document.getElementById('addStudentModal').classList.add('hidden');
                this.loadStudents();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            this.showToast('保存失败', 'error');
        }
    }

    async deleteStudent(id) {
        if (!confirm('确定要删除这条学生记录吗？该操作不可恢复！')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/admin/students/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('删除成功', 'success');
                this.loadStudents();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }

    async downloadTemplate() {
        try {
            this.showToast('正在下载模板...', 'info');
            const response = await fetch(`${this.baseURL}/admin/students/template`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'student_import_template.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const result = await response.json();
                this.showToast(result.message || '模板下载失败', 'error');
            }
        } catch (error) {
            console.error('下载模板失败:', error);
            this.showToast('下载模板失败', 'error');
        }
    }

    async importExcel(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showToast('正在导入数据...', 'info');
            const response = await fetch(`${this.baseURL}/admin/students/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(result.message, 'success');
                if (result.errors && result.errors.length > 0) {
                    alert("部分数据导入失败，详情如下：\n" + result.errors.join("\n"));
                }
                this.loadStudents();
            } else {
                this.showToast(result.message, 'error');
                if (result.errors && result.errors.length > 0) {
                    alert("数据导入失败，详情如下：\n" + result.errors.join("\n"));
                }
            }
        } catch (error) {
            this.showToast('文件导入失败', 'error');
        }
    }
}

// 初始化应用，并挂载到 window 供内嵌登录脚本调用
window.adminApp = new AdminApp();
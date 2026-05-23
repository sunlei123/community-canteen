import { on } from '../utils.js';

export class AdminApp {
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


    async init() {
        if (this._hasInitialized) {
            console.log('后台应用已完成首次初始化，跳过模板加载与事件绑定，执行页面渲染切换。');
            if (this.token) {
                this.verifyToken();
            } else {
                this.showLoginPage();
            }
            return;
        }

        console.log('初始化管理后台应用...');
        console.log('baseURL:', this.baseURL);
        console.log('当前token:', this.token ? '存在' : '不存在');
        
        try {
            // 异步并发拉取所有分离出来的子页面与模态框 HTML 片段，并注入占位符 DOM 节点中
            await this.loadTemplates();
            console.log('所有 HTML 模板片段成功动态加载并注入 DOM！');
        } catch (error) {
            console.error('加载 HTML 模板组件失败：', error);
            this.showToast('加载系统组件失败，请刷新页面重试', 'error');
            return;
        }
        
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
        
        // 标记首次初始化已就绪，锁死防止重入
        this._hasInitialized = true;

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


    async loadTemplates() {
        const templates = {
            // Pages 页面模版占位符
            'dashboardPage': '/admin/templates/pages/dashboard.html',
            'ordersPage': '/admin/templates/pages/orders.html',
            'dailyMenuPage': '/admin/templates/pages/dailyMenu.html',
            'usersPage': '/admin/templates/pages/users.html',
            'logsPage': '/admin/templates/pages/logs.html',
            'studentsPage': '/admin/templates/pages/students.html',
            'menuPage': '/admin/templates/pages/menu.html',
            'reportsPage': '/admin/templates/pages/reports.html',
            'adminsPage': '/admin/templates/pages/admins.html',
            'settingsPage': '/admin/templates/pages/settings.html',
            // Modals 模态框模版占位符
            'addMenuModal': '/admin/templates/modals/addMenuModal.html',
            'addStudentModal': '/admin/templates/modals/addStudentModal.html',
            'userModal': '/admin/templates/modals/userModal.html',
            'resetPasswordModal': '/admin/templates/modals/resetPasswordModal.html',
            'printSlipModal': '/admin/templates/modals/printSlipModal.html',
            'viewOrderModal': '/admin/templates/modals/viewOrderModal.html',
            'addAdminModal': '/admin/templates/modals/addAdminModal.html'
        };

        // 并发 fetch 所有的 HTML 模板，注入对应的 DOM 节点
        await Promise.all(
            Object.entries(templates).map(async ([id, path]) => {
                const el = document.getElementById(id);
                if (el) {
                    const response = await fetch(path);
                    if (response.ok) {
                        el.innerHTML = await response.text();
                    } else {
                        throw new Error(`加载模板 [${path}] 失败，状态码: ${response.status}`);
                    }
                }
            })
        );
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

        // 系统用户管理
        on('addAdminBtn', 'click', () => this.showAddAdminModal());
        on('cancelAddAdmin', 'click', () => {
            const m = document.getElementById('addAdminModal');
            if (m) m.classList.add('hidden');
        });
        on('cancelAddAdminText', 'click', () => {
            const m = document.getElementById('addAdminModal');
            if (m) m.classList.add('hidden');
        });
        on('adminForm', 'submit', (e) => {
            e.preventDefault();
            this.saveAdmin();
        });
        on('adminSearchInput', 'input', () => this.renderAdmins());

        // 侧边栏导航
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
                
                // 移动端在导航后自动隐藏侧边栏和遮罩层
                if (window.innerWidth < 768) {
                    const sidebar = document.getElementById('adminSidebar');
                    const overlay = document.getElementById('sidebarOverlay');
                    if (sidebar) sidebar.classList.remove('mobile-open');
                    if (overlay) overlay.classList.remove('show');
                }
            });
        });

        // 订单管理
        on('orderStatusFilter', 'change', () => this.loadOrders());
        on('orderStartDateFilter', 'change', () => this.loadOrders());
        on('orderEndDateFilter', 'change', () => this.loadOrders());
        on('searchOrdersBtn', 'click', () => this.loadOrders());
        on('resetOrdersFilterBtn', 'click', () => {
            const nameInp = document.getElementById('orderStudentNameFilter');
            const phoneInp = document.getElementById('orderStudentPhoneFilter');
            const classInp = document.getElementById('orderStudentClassFilter');
            const statusSel = document.getElementById('orderStatusFilter');
            const startInp = document.getElementById('orderStartDateFilter');
            const endInp = document.getElementById('orderEndDateFilter');

            if (nameInp) nameInp.value = '';
            if (phoneInp) phoneInp.value = '';
            if (classInp) classInp.value = '';
            if (statusSel) statusSel.value = '';
            if (startInp) startInp.value = '';
            if (endInp) endInp.value = '';

            this.loadOrders();
        });

        // 菜品管理
        on('addMenuItemBtn', 'click', () => this.showAddMenuModal());
        on('cancelAddMenu', 'click', () => this.hideAddMenuModal());
        on('menuSearchInput', 'input', () => this.filterMenu());
        on('menuCategoryFilter', 'change', () => this.filterMenu());
        on('resetMenuFilterBtn', 'click', () => {
            const input = document.getElementById('menuSearchInput');
            const filter = document.getElementById('menuCategoryFilter');
            if (input) input.value = '';
            if (filter) filter.value = '';
            this.filterMenu();
        });
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
        on('cancelResetPasswordBtn', 'click', () => {
            const m = document.getElementById('resetPasswordModal');
            if (m) m.classList.add('hidden');
        });
        on('resetPasswordForm', 'submit', (e) => {
            e.preventDefault();
            this.resetUserPassword();
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

        // 订单高级详情查看
        on('closeViewOrderHeader', 'click', () => {
            const m = document.getElementById('viewOrderModal');
            if (m) m.classList.add('hidden');
        });
        on('closeViewOrder', 'click', () => {
            const m = document.getElementById('viewOrderModal');
            if (m) m.classList.add('hidden');
        });
        on('viewOrderPrintSlip', 'click', () => {
            const viewModal = document.getElementById('viewOrderModal');
            if (viewModal) viewModal.classList.add('hidden');
            if (this._currentViewingOrder) {
                this.showPrintSlip(this._currentViewingOrder);
            }
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
            this.populateParentSelector();
        });
        on('cancelAddStudent', 'click', () => {
            const m = document.getElementById('addStudentModal');
            if (m) m.classList.add('hidden');
        });
        on('studentParentSelector', 'change', (e) => {
            const selOpt = e.target.options[e.target.selectedIndex];
            const nameInput = document.getElementById('studentGuardian');
            const phoneInput = document.getElementById('studentPhone');
            if (e.target.value) {
                if (nameInput) nameInput.value = selOpt.getAttribute('data-name') || '';
                if (phoneInput) phoneInput.value = e.target.value;
            } else {
                if (nameInput) nameInput.value = '';
                if (phoneInput) phoneInput.value = '';
            }
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

        // 订单导出 CSV 绑定
        on('exportOrdersBtn', 'click', () => this.exportOrdersToCSV());

        // 手机端侧边栏切换（由 HTML 内联脚本统一处理，此处为空保留兼容）
        // mobileMenuBtn 和 sidebarOverlay 已在 index.html 内联脚本中绑定，无需重复绑定

        // 菜品管理图片实时预览与清除交互绑定
        on('menuItemImageUrl', 'input', (e) => this.updateEditImagePreview(e.target.value));
        on('menuItemImageUrl', 'change', (e) => this.updateEditImagePreview(e.target.value));
        on('clearEditMenuImage', 'click', () => {
            const urlInput = document.getElementById('menuItemImageUrl');
            const fileInput = document.getElementById('menuImageFile');
            if (urlInput) urlInput.value = '';
            if (fileInput) fileInput.value = '';
            this.updateEditImagePreview('');
        });
        on('editMenuImagePreviewWrapper', 'click', () => {
            const img = document.getElementById('editMenuImagePreview');
            if (img && img.src && !img.src.includes('placeholder')) {
                this.showGlobalImagePreview(img.src);
            }
        });

        // 列表页图片点击大图预览委托
        const menuTable = document.getElementById('menuTable');
        if (menuTable) {
            menuTable.addEventListener('click', (e) => {
                const img = e.target.closest('.previewable-image');
                if (img) {
                    this.showGlobalImagePreview(img.src);
                }
            });
        }
    }


    showGlobalImagePreview(src) {
        if (!src) return;
        
        // 移除可能残存的旧预览弹窗
        const oldModal = document.getElementById('globalImagePreviewModal');
        if (oldModal) oldModal.remove();

        // 构造极富 Premium 美感的弹窗 HTML
        const modal = document.createElement('div');
        modal.id = 'globalImagePreviewModal';
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md opacity-0 transition-opacity duration-300 ease-out cursor-zoom-out';
        modal.innerHTML = `
            <!-- 关闭按钮 -->
            <button class="absolute top-4 right-4 text-white/70 hover:text-white hover:scale-110 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 focus:outline-none" title="关闭 (Esc)">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <!-- 图片容器 -->
            <div class="relative max-w-[90%] max-h-[85%] transform scale-95 transition-transform duration-300 ease-out pointer-events-none">
                <img src="${src}" alt="大图预览" class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/15">
            </div>
        `;

        document.body.appendChild(modal);

        // 触发淡入与缩放动画
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100');
            const imgContainer = modal.querySelector('div');
            if (imgContainer) {
                imgContainer.classList.remove('scale-95');
                imgContainer.classList.add('scale-100');
            }
        });

        // 销毁/关闭函数
        const closeModal = () => {
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0');
            const imgContainer = modal.querySelector('div');
            if (imgContainer) {
                imgContainer.classList.remove('scale-100');
                imgContainer.classList.add('scale-95');
            }
            // 动画结束后物理销毁节点，防内存泄漏
            modal.addEventListener('transitionend', () => modal.remove(), { once: true });
            document.removeEventListener('keydown', handleEsc);
        };

        // 绑定键盘 Esc 键支持
        const handleEsc = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', handleEsc);

        // 点击弹窗任意非图片核心区域即可关闭
        modal.addEventListener('click', closeModal);
    }


    updateEditImagePreview(url) {
        const container = document.getElementById('editMenuImagePreviewContainer');
        const img = document.getElementById('editMenuImagePreview');
        const nameText = document.getElementById('editMenuImagePreviewName');
        const urlText = document.getElementById('editMenuImagePreviewUrlText');

        if (!container || !img) return;

        if (url && url.trim() !== '') {
            img.src = url;
            // 优雅文件名提取
            let fileName = '图片已就绪';
            try {
                if (url.startsWith('data:')) {
                    fileName = 'Base64 数据图片';
                } else {
                    const decodedUrl = decodeURIComponent(url);
                    fileName = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1) || '图片文件';
                }
            } catch (e) {
                fileName = '在线网络图片';
            }

            if (nameText) nameText.textContent = fileName;
            if (urlText) urlText.textContent = url;
            
            // 平滑展现
            container.classList.remove('hidden');
            
            // 健壮兜底：加载失败时展示优雅默认占位卡片而不断裂
            img.onerror = () => {
                img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop';
                if (nameText) nameText.textContent = '无法加载该图片（请检查格式/URL）';
            };
        } else {
            container.classList.add('hidden');
            img.src = '';
            if (urlText) urlText.textContent = '';
        }
    }


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
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }
}
export const ordersMixin = {
    async loadOrders() {
        try {
            const status = document.getElementById('orderStatusFilter')?.value || '';
            const startDate = document.getElementById('orderStartDateFilter')?.value || '';
            const endDate = document.getElementById('orderEndDateFilter')?.value || '';
            const studentName = document.getElementById('orderStudentNameFilter')?.value || '';
            const studentPhone = document.getElementById('orderStudentPhoneFilter')?.value || '';
            const studentClass = document.getElementById('orderStudentClassFilter')?.value || '';
            
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (studentName) params.append('studentName', studentName);
            if (studentPhone) params.append('studentPhone', studentPhone);
            if (studentClass) params.append('studentClass', studentClass);

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
,

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
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">下单时间</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生姓名</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学校班级</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订餐简要信息</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${orders.map(order => {
                            const studentName = order.studentName || (order.address && order.address.split(' ')[0]) || '未知';
                            const studentPhone = order.studentPhone || '无';
                            const studentClass = order.studentClass || '无';
                            const mealSummary = order.items && Array.isArray(order.items) 
                                ? order.items.map(item => `${item.name} x${item.quantity}`).join(' + ') 
                                : '无餐食';
                            return `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${new Date(order.createdAt).toLocaleString()}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                        ${studentName}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                        ${studentPhone}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${studentClass}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-900 max-w-md truncate" title="${mealSummary}">
                                        ${mealSummary}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ¥${order.totalPrice.toFixed(2)}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(order.status)}">
                                            ${this.getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-900 leading-normal max-w-xs truncate" title="${order.customerInfo?.note || '无'}">
                                        ${order.customerInfo?.note || '无'}
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
                                        <button class="view-detail-btn text-indigo-600 hover:text-indigo-900" data-id="${order.id}">查看详情</button>
                                        <button class="view-slip-btn text-blue-600 hover:text-blue-900" data-id="${order.id}">查看模板</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this._ordersCache = orders;
        this.bindOrderEvents();
    }
,

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

        document.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const order = this._ordersCache.find(o => o.id === id);
                if (order) {
                    this._currentViewingOrder = order;
                    this.showOrderDetail(order);
                }
            });
        });
    }
,

    showOrderDetail(order) {
        const modal = document.getElementById('viewOrderModal');
        const content = document.getElementById('viewOrderContent');
        if (!modal || !content) return;

        const studentName = order.studentName || (order.address && order.address.split(' ')[0]) || '未知宝贝';
        const studentClass = order.studentClass || '未录入班级';
        const studentGuardian = order.studentGuardian || '未录入监护人';
        const studentPhone = order.studentPhone || '未录入手机号';
        const note = order.customerInfo?.note || '';
        
        // 菜品明细列表 HTML
        const itemsHtml = order.items.map(item => {
            const name = item.name || item.food?.name || '未知菜品';
            const price = item.price || item.food?.price || 0;
            const quantity = item.quantity || 0;
            const subtotal = price * quantity;
            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 text-sm text-gray-700 font-medium">${name}</td>
                    <td class="px-4 py-3 text-sm text-gray-500 text-center">¥${price.toFixed(2)}</td>
                    <td class="px-4 py-3 text-sm text-gray-500 text-center">x${quantity}</td>
                    <td class="px-4 py-3 text-sm text-indigo-600 font-semibold text-right">¥${subtotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        content.innerHTML = `
            <!-- 网格化两栏式布局 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 左侧：订单与宝贝成长档案 -->
                <div class="space-y-6">
                    <!-- 订单基本概览卡片 -->
                    <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                        <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <i data-lucide="info" class="h-4 w-4 text-blue-600"></i>
                            <span>订单基本信息</span>
                        </h4>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-500">订单号：</span>
                                <span class="font-mono font-semibold text-gray-800 bg-gray-200 px-2 py-0.5 rounded text-xs">${order.orderNumber}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-500">下单时间：</span>
                                <span class="text-gray-700">${new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-500">就餐日期：</span>
                                <span class="text-gray-700 font-medium">${order.deliveryDate || '-'}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-500">就餐时段：</span>
                                <span class="px-2 py-0.5 rounded text-xs font-semibold ${order.mealTime === 'lunch' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}">
                                    ${order.mealTime === 'lunch' ? '☀️ 午餐' : '🌙 晚餐'}
                                </span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-500">当前状态：</span>
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${this.getStatusColor(order.status)}">
                                    ${this.getStatusText(order.status)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- 宝贝及监护人档案卡片 -->
                    <div class="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 shadow-sm space-y-4">
                        <h4 class="text-sm font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                            <i data-lucide="baby" class="h-4 w-4 text-indigo-600"></i>
                            <span>宝贝及监护人档案</span>
                        </h4>
                        <div class="space-y-3">
                            <div class="flex items-center gap-3">
                                <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <i data-lucide="user" class="h-5 w-5"></i>
                                </div>
                                <div>
                                    <div class="text-xs text-gray-400">宝贝姓名</div>
                                    <div class="text-base font-bold text-gray-800">${studentName}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <i data-lucide="graduation-cap" class="h-5 w-5"></i>
                                </div>
                                <div>
                                    <div class="text-xs text-gray-400">就餐学校/班级</div>
                                    <div class="text-sm font-semibold text-gray-700">${studentClass}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <i data-lucide="heart" class="h-5 w-5"></i>
                                </div>
                                <div>
                                    <div class="text-xs text-gray-400">联系监护人</div>
                                    <div class="text-sm font-semibold text-gray-700">${studentGuardian}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <i data-lucide="phone" class="h-5 w-5"></i>
                                </div>
                                <div>
                                    <div class="text-xs text-gray-400">家长手机号</div>
                                    <div class="text-sm font-mono font-semibold text-gray-700">${studentPhone}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 右侧：订餐明细与留言备注 -->
                <div class="space-y-6 flex flex-col justify-between">
                    <!-- 商品明细卡片 -->
                    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div class="bg-gray-50 px-5 py-3.5 border-b border-gray-100 flex items-center gap-1.5">
                            <i data-lucide="shopping-bag" class="h-4 w-4 text-emerald-600"></i>
                            <span class="text-sm font-semibold text-gray-700">订餐明细清单</span>
                        </div>
                        <div class="overflow-x-auto flex-1 min-h-[150px]">
                            <table class="min-w-full divide-y divide-gray-100 text-left">
                                <thead class="bg-gray-50/50">
                                    <tr>
                                        <th class="px-4 py-2 text-xs font-semibold text-gray-500">餐食名称</th>
                                        <th class="px-4 py-2 text-xs font-semibold text-gray-500 text-center">单价</th>
                                        <th class="px-4 py-2 text-xs font-semibold text-gray-500 text-center">数量</th>
                                        <th class="px-4 py-2 text-xs font-semibold text-gray-500 text-right">小计</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                        <!-- 实付金额大字展示 -->
                        <div class="bg-gray-50/50 px-5 py-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                            <span class="text-sm font-semibold text-gray-600">应付实付总额</span>
                            <span class="text-2xl font-black text-rose-600">¥${order.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    <!-- 留言备注高亮通知框 -->
                    ${note ? `
                    <div class="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
                        <div class="bg-amber-100 p-2 rounded-lg text-amber-600 mt-0.5">
                            <i data-lucide="message-square" class="h-5 w-5"></i>
                        </div>
                        <div class="space-y-1">
                            <div class="text-xs font-semibold text-amber-800">管理员特别留言备注：</div>
                            <p class="text-sm text-amber-900 leading-relaxed font-medium">${note}</p>
                        </div>
                    </div>
                    ` : `
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3 text-gray-400">
                        <i data-lucide="message-square" class="h-5 w-5 mt-0.5"></i>
                        <span class="text-sm">该订单无特别留言备注</span>
                    </div>
                    `}
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        
        // 重新初始化模态框中的图标
        try {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({
                    attrs: {
                        class: 'lucide'
                    },
                    nameAttr: 'data-lucide',
                    node: modal
                });
            }
        } catch (e) {
            console.error('Lucide图标初始化失败', e);
        }
    }
,

    showPrintSlip(order) {
        const modal = document.getElementById('printSlipModal');
        const content = document.getElementById('printSlipContent');
        
        const itemsText = order.items.map(item => 
            `${item.name || item.food?.name}  x${item.quantity}  ¥${(item.price || item.food?.price || 0).toFixed(2)}`
        ).join('\n');

        const studentName = order.studentName || order.address?.split(' ')[0] || '未知学生';
        const address = order.address || '';
        const note = order.customerInfo?.note || '无';
        
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
订单备注：${note}
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
,

    exportOrdersToCSV() {
        if (!this._ordersCache || this._ordersCache.length === 0) {
            this.showToast('当前没有可以导出的订单数据', 'error');
            return;
        }

        try {
            // CSV 表头
            const headers = ['订单号', '金额(元)', '订单状态', '送餐日期', '配送时段', '学生姓名', '配送信息', '下单时间', '留言备注'];
            
            const rows = this._ordersCache.map(order => {
                const orderNumber = `\t${order.orderNumber}`; // 加制表符防止长数字在Excel中变科学计数法
                const totalPrice = order.totalPrice.toFixed(2);
                const statusText = this.getStatusText(order.status);
                const deliveryDate = order.deliveryDate;
                const mealTime = order.mealTime === 'lunch' ? '午餐' : '晚餐';
                const studentName = order.studentName || order.address?.split(' ')[0] || '未知';
                // 替换掉双引号和逗号以防破坏 CSV 格式
                const address = (order.address || '').replace(/"/g, '""').replace(/,/g, ' ').replace(/\n/g, ' ');
                const createdAt = new Date(order.createdAt).toLocaleString().replace(/"/g, '""').replace(/,/g, ' ');
                const note = (order.customerInfo?.note || '无').replace(/"/g, '""').replace(/,/g, ' ').replace(/\n/g, ' ');
                
                return [
                    orderNumber,
                    totalPrice,
                    statusText,
                    deliveryDate,
                    mealTime,
                    studentName,
                    address,
                    createdAt,
                    note
                ].map(val => `"${val}"`).join(','); // 用双引号包裹避免包含特殊字符导致解析错误
            });
            
            // 加入 UTF-8 BOM，防止 Excel 打开乱码
            const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            const filterStatus = document.getElementById('orderStatusFilter').value || 'all';
            const filename = `董老师小厨房_订单导出_${filterStatus}_${new Date().toISOString().split('T')[0]}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('订单导出成功', 'success');
        } catch (error) {
            console.error('导出CSV失败:', error);
            this.showToast('导出订单失败', 'error');
        }
    }
,

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

};
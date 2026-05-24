export const dashboardMixin = {
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
,

    updateDashboardStats(data) {
        document.getElementById('todayOrders').textContent = data.statistics.todayOrdersStats?.count || 0;
        document.getElementById('todayRevenue').textContent = `¥${(data.statistics.todayOrdersStats?.revenue || 0).toFixed(2)}`;
        
        // 计算待处理订单数
        const pendingCount = data.statusDistribution.pending || 0;
        document.getElementById('pendingOrders').textContent = pendingCount;
        
        document.getElementById('totalStudentsCount').textContent = data.statistics.totalStudents || 0;
        document.getElementById('totalMenuItems').textContent = data.menuStats.total;

        // 渲染菜品分类统计
        const catStats = data.menuStats.categoryStats || { meat: 0, veggie: 0, dessert_fruit: 0, soup: 0, staple: 0 };
        const meatEl = document.getElementById('categoryCountMeat');
        const veggieEl = document.getElementById('categoryCountVeggie');
        const dessertEl = document.getElementById('categoryCountDessert');
        const soupEl = document.getElementById('categoryCountSoup');
        const stapleEl = document.getElementById('categoryCountStaple');

        if (meatEl) meatEl.textContent = catStats.meat || 0;
        if (veggieEl) veggieEl.textContent = catStats.veggie || 0;
        if (dessertEl) dessertEl.textContent = catStats.dessert_fruit || 0;
        if (soupEl) soupEl.textContent = catStats.soup || 0;
        if (stapleEl) stapleEl.textContent = catStats.staple || 0;

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

        // 渲染今日发布的供应菜品 (新增列表)
        const todayDishesContainer = document.getElementById('todayDishesList');
        if (todayDishesContainer) {
            const todayDishes = data.todayDishes || [];
            if (todayDishes.length === 0) {
                todayDishesContainer.innerHTML = `
                    <div class="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                        <span class="text-3xl mb-1 inline-block">👩‍🍳</span>
                        <p class="text-gray-400 text-xs font-light">今日暂无发布供应的菜品，可前往“每日菜单”配置并发布</p>
                    </div>
                `;
            } else {
                todayDishesContainer.innerHTML = todayDishes.map(dish => `
                    <div class="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex flex-col justify-between min-h-[90px]">
                        <div>
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-xs font-bold text-gray-800 truncate pr-1" title="${dish.name}">${dish.name}</span>
                                <span class="text-[9px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                                    dish.category === 'meat' ? 'bg-red-50 text-red-600' :
                                    dish.category === 'veggie' ? 'bg-green-50 text-green-600' :
                                    dish.category === 'staple' ? 'bg-purple-50 text-purple-600' :
                                    dish.category === 'soup' ? 'bg-blue-50 text-blue-600' :
                                    'bg-amber-50 text-amber-600'
                                }">
                                    ${this.getCategoryText(dish.category)}
                                </span>
                            </div>
                            <span class="text-[10px] text-gray-400 font-light line-clamp-1 block mb-2" title="${dish.description || '精心搭配，健康美味'}">
                                ${dish.description || '精心搭配，健康美味'}
                            </span>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                            <span class="text-orange-600 font-extrabold text-xs">${dish.category === 'dessert_fruit' ? `¥${dish.price.toFixed(2)}` : ''}</span>
                            <span class="text-[9px] font-bold text-gray-400 font-mono">ID: ${dish.id.substring(0, 4)}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    }
,

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
,

    renderRecentOrders(orders) {
        const container = document.getElementById('recentOrders');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-gray-500">暂无订单</p>';
            return;
        }

        container.innerHTML = orders.slice(0, 5).map(order => {
            const studentName = order.studentName || (order.address && order.address.split(' ')[0]) || '未知';
            const studentClass = order.studentClass || order.customerInfo?.schoolClass || (order.address && order.address.replace(' 送达教室', '')) || '未知班级';
            const mealSummary = order.items && Array.isArray(order.items) 
                ? order.items.map(item => `${item.name} x${item.quantity}`).join(' + ') 
                : '无餐食';
            const studentPhone = order.studentPhone || (order.address?.match(/1[3-9]\d{9}/)?.[0] || '无');
            const note = order.customerInfo?.note || '';
            return `
                <div class="p-3 bg-gray-50 rounded-lg hover:bg-slate-200/60 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md flex flex-col space-y-1.5 border border-gray-100 mb-2 last:mb-0">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-xs text-gray-400 font-mono">${order.orderNumber}</span>
                        <span class="px-2 py-0.5 text-[10px] rounded-full font-semibold ${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-gray-800">${studentName} <span class="text-gray-500 font-normal">(${studentClass})</span></span>
                        <span class="font-bold text-rose-600">¥${order.totalPrice.toFixed(2)}</span>
                    </div>
                    <div class="text-[11px] text-gray-600 truncate" title="${mealSummary}">
                        🍱 ${mealSummary}
                    </div>
                    <div class="text-[10px] text-gray-500 flex justify-between items-center font-light">
                        <span>📞 手机: <span class="font-mono font-medium">${studentPhone}</span></span>
                        ${note ? `<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold truncate max-w-[120px]" title="${note}">📝 ${note}</span>` : ''}
                    </div>
                    <div class="text-[10px] text-gray-400 font-light flex justify-between items-center pt-1 border-t border-gray-100/50">
                        <span>送餐日期: ${order.deliveryDate || '未指定'}</span>
                        <span>时段: ${order.mealTime === 'lunch' ? '☀️ 午餐' : '🌙 晚餐'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

};
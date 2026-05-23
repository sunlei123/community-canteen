export const reportsMixin = {
    loadReports() {
        // 设置默认日期范围（最近7天）
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

        this.generateReport();
    }
,

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
,

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
};
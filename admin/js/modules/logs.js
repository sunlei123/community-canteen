export const logsMixin = {
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
,

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

};
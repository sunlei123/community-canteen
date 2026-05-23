export const usersMixin = {
    async loadUsers() {
        try {
            // 同时加载用户列表和学生列表以确保关联信息正确渲染
            const [usersRes, studentsRes] = await Promise.all([
                fetch(`${this.baseURL}/admin/users`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.baseURL}/admin/students`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            const usersData = await usersRes.json();
            const studentsData = await studentsRes.json();

            if (usersData.success) {
                this._studentsCache = studentsData.success ? studentsData.data : [];
                this.renderUsersTable(usersData.data);
            }
        } catch (error) {
            console.error('加载家长用户及关联学生数据失败:', error);
            this.showToast('加载家长列表及关联数据失败', 'error');
        }
    }
,

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
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关联学生宝贝</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">加入时间</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${users.map(user => {
                            const userStudents = (this._studentsCache || []).filter(s => s.phone === user.phone);
                            const studentsHtml = userStudents.length > 0
                                ? userStudents.map(s => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm mr-1.5" title="${s.class}">${s.name} <span class="text-[9px] text-blue-400 ml-1 font-light">${s.class}</span></span>`).join('')
                                : `<span class="text-xs text-amber-500 font-medium flex items-center gap-1">⚠️ 暂无关联宝贝</span>`;
                            return `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.phone}</td>
                                    <td class="px-6 py-4 whitespace-normal text-sm text-gray-900 max-w-xs">${studentsHtml}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(user.createdAt).toLocaleString()}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button class="edit-user-btn text-blue-600 hover:text-blue-900" data-id="${user.id}">编辑</button>
                                        <button class="reset-user-password-btn text-yellow-600 hover:text-yellow-900" data-id="${user.id}">重置密码</button>
                                        <button class="delete-user-btn text-red-600 hover:text-red-900" data-id="${user.id}">删除</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        this._usersCache = users;
        this.bindUserEvents();
    }
,

    bindUserEvents() {
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const user = this._usersCache.find(u => u.id === id);
                if (user) this.showEditUserModal(user);
            });
        });

        document.querySelectorAll('.reset-user-password-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const user = this._usersCache.find(u => u.id === id);
                if (user) this.showResetPasswordModal(user);
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.deleteUser(id);
            });
        });
    }
,

    showAddUserModal() {
        document.getElementById('userModalTitle').textContent = '添加家长用户';
        document.getElementById('userId').value = '';
        document.getElementById('userForm').reset();
        document.getElementById('userModal').classList.remove('hidden');
    }
,

    showEditUserModal(user) {
        document.getElementById('userModalTitle').textContent = '编辑家长用户';
        document.getElementById('userId').value = user.id;
        document.getElementById('userPhone').value = user.phone;
        document.getElementById('userNameInput').value = user.name;
        document.getElementById('userModal').classList.remove('hidden');
    }
,

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
,

    showResetPasswordModal(user) {
        document.getElementById('resetPasswordUserId').value = user.id;
        document.getElementById('resetPasswordUserName').value = user.name;
        document.getElementById('resetNewPassword').value = '';
        document.getElementById('resetPasswordModal').classList.remove('hidden');
    }
,

    async resetUserPassword() {
        const id = document.getElementById('resetPasswordUserId').value;
        const password = document.getElementById('resetNewPassword').value;

        try {
            const response = await fetch(`${this.baseURL}/admin/users/${id}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (result.success) {
                const newPlainPassword = result.data.newPassword;
                this.showToast('密码重置成功！', 'success');
                document.getElementById('resetPasswordModal').classList.add('hidden');
                
                // 优雅弹窗反馈重置后的密码
                setTimeout(() => {
                    alert(`家长【${result.data.name}】的登录密码已成功重置为：\n\n${newPlainPassword}\n\n请复制并及时告知家长！`);
                }, 100);
                
                this.loadUsers();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('重置密码失败:', error);
            this.showToast('重置密码失败', 'error');
        }
    }
,

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
};
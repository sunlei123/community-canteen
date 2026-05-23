export const adminsMixin = {
    async loadAdmins() {
        try {
            const response = await fetch(`${this.baseURL}/admin/admins`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                this.logout();
                return;
            }

            const data = await response.json();
            if (data.success) {
                this._adminsCache = data.data || [];
                this.renderAdmins();
            } else {
                this.showToast(data.message || '加载系统用户列表失败', 'error');
            }
        } catch (error) {
            console.error('Error loading admins:', error);
            this.showToast('加载系统用户时发生网络错误', 'error');
        }
    },

    renderAdmins() {
        const body = document.getElementById('adminTableBody');
        const emptyState = document.getElementById('adminEmptyState');
        const searchInput = document.getElementById('adminSearchInput');
        const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

        if (!body) return;

        // 本地模糊过滤
        const filtered = this._adminsCache.filter(admin => {
            return (
                admin.username.toLowerCase().includes(keyword) ||
                admin.name.toLowerCase().includes(keyword) ||
                (admin.email && admin.email.toLowerCase().includes(keyword))
            );
        });

        if (filtered.length === 0) {
            body.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        const roleTexts = {
            admin: '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">系统管理员</span>',
            staff: '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">普通运营</span>',
            kitchen: '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">后厨人员</span>'
        };

        body.innerHTML = filtered.map(admin => `
            <tr class="hover:bg-slate-100 transition-colors" data-id="${admin.id}">
                <td class="px-6 py-4 font-bold text-slate-800">${admin.name}</td>
                <td class="px-6 py-4 font-mono text-slate-500">${admin.username}</td>
                <td class="px-6 py-4">${roleTexts[admin.role] || admin.role}</td>
                <td class="px-6 py-4 font-mono text-slate-500">${admin.email || '-'}</td>
                <td class="px-6 py-4 text-xs text-slate-400 font-mono">${admin.createdAt ? new Date(admin.createdAt).toLocaleString() : '-'}</td>
                <td class="px-6 py-4 text-center space-x-2">
                    <button class="edit-admin-btn inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded-lg transition-all" data-id="${admin.id}">
                        编辑
                    </button>
                    <button class="delete-admin-btn inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 bg-red-50 rounded-lg transition-all" data-id="${admin.id}">
                        删除
                    </button>
                </td>
            </tr>
        `).join('');

        // 绑定事件
        body.querySelectorAll('.edit-admin-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const admin = this._adminsCache.find(a => a.id === id);
                if (admin) this.showAddAdminModal(admin);
            };
        });

        body.querySelectorAll('.delete-admin-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                this.deleteAdmin(id);
            };
        });
    },

    showAddAdminModal(admin = null) {
        const modal = document.getElementById('addAdminModal');
        const form = document.getElementById('adminForm');
        const title = document.getElementById('adminModalTitle');
        const subtitle = document.getElementById('adminModalSubtitle');
        const idInput = document.getElementById('adminId');
        const usernameInput = document.getElementById('adminUsername');
        const passwordInput = document.getElementById('adminPassword');
        const passwordLabel = document.getElementById('adminPasswordLabel');
        const passwordHelp = document.getElementById('adminPasswordHelp');
        const nameInput = document.getElementById('adminNameInput');
        const roleSelect = document.getElementById('adminRole');
        const emailInput = document.getElementById('adminEmail');

        if (!modal || !form) return;

        form.reset();

        if (admin) {
            // 编辑模式
            title.textContent = '编辑系统用户';
            subtitle.textContent = `修改系统成员 [${admin.name}] 的账号权限与密保属性`;
            idInput.value = admin.id;
            usernameInput.value = admin.username;
            usernameInput.setAttribute('readonly', 'true');
            usernameInput.classList.add('bg-slate-100', 'cursor-not-allowed');

            passwordInput.removeAttribute('required');
            passwordLabel.textContent = '登录密码';
            if (passwordHelp) passwordHelp.classList.remove('hidden');

            nameInput.value = admin.name;
            roleSelect.value = admin.role;
            emailInput.value = admin.email || '';
        } else {
            // 添加模式
            title.textContent = '添加系统用户';
            subtitle.textContent = '请为新的系统运营人员创建登录账号和操作席位';
            idInput.value = '';
            usernameInput.removeAttribute('readonly');
            usernameInput.classList.remove('bg-slate-100', 'cursor-not-allowed');

            passwordInput.setAttribute('required', 'true');
            passwordLabel.textContent = '登录密码 *';
            if (passwordHelp) passwordHelp.classList.add('hidden');
        }

        modal.classList.remove('hidden');
    },

    async saveAdmin() {
        const id = document.getElementById('adminId').value;
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        const name = document.getElementById('adminNameInput').value.trim();
        const role = document.getElementById('adminRole').value;
        const email = document.getElementById('adminEmail').value.trim();

        if (!username || !name || !role) {
            this.showToast('必填字段不能为空！', 'error');
            return;
        }

        if (!id && !password) {
            this.showToast('新用户的登录密码不能为空！', 'error');
            return;
        }

        if (password && password.length < 6) {
            this.showToast('密码长度至少为 6 位！', 'error');
            return;
        }

        const payload = { username, name, role, email };
        if (password) payload.password = password;

        const isEdit = !!id;
        const url = isEdit ? `${this.baseURL}/admin/admins/${id}` : `${this.baseURL}/admin/admins`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(isEdit ? '系统用户更新成功！' : '系统用户添加成功！', 'success');
                const modal = document.getElementById('addAdminModal');
                if (modal) modal.classList.add('hidden');
                this.loadAdmins();
            } else {
                this.showToast(result.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('Error saving admin:', error);
            this.showToast('保存系统配置时发生网络错误', 'error');
        }
    },

    async deleteAdmin(id) {
        const admin = this._adminsCache.find(a => a.id === id);
        if (!admin) return;

        if (confirm(`⚠️ 警告：您确定要永久删除系统用户 [${admin.name} (账号: ${admin.username})] 吗？删除后此人将立刻丧失所有后台操作权限！`)) {
            try {
                const response = await fetch(`${this.baseURL}/admin/admins/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const result = await response.json();

                if (result.success) {
                    this.showToast('系统用户删除成功！', 'success');
                    this.loadAdmins();
                } else {
                    this.showToast(result.message || '删除失败', 'error');
                }
            } catch (error) {
                console.error('Error deleting admin:', error);
                this.showToast('删除用户时发生网络错误', 'error');
            }
        }
    }
};

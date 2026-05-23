export const studentsMixin = {
    async loadStudents() {
        try {
            const search = document.getElementById('studentSearchInput').value;
            const classFilter = document.getElementById('studentClassFilter').value;
            const guardianFilter = document.getElementById('studentGuardianFilter').value;
            
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (classFilter) params.append('class', classFilter);
            if (guardianFilter) params.append('guardian', guardianFilter);

            // 同时加载学生和家长以检查账号开通状态
            const [studentsRes, usersRes] = await Promise.all([
                fetch(`${this.baseURL}/admin/students?${params}`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.baseURL}/admin/users`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            const studentsData = await studentsRes.json();
            const usersData = await usersRes.json();

            if (studentsData.success) {
                this._usersCache = usersData.success ? usersData.data : [];
                this.renderStudentsTable(studentsData.data);
            }
        } catch (error) {
            console.error('加载学生列表及家长对比数据失败:', error);
            this.showToast('加载学生列表失败', 'error');
        }
    }
,

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
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">家长账号状态</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">首次订餐日</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${students.map((student, idx) => {
                            const hasParent = (this._usersCache || []).some(u => u.phone === student.phone);
                            const accountStatusHtml = hasParent
                                ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-150/50">🟢 已关联家长</span>`
                                : `<div class="flex items-center space-x-1.5">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-light bg-gray-150/60 text-gray-400">⚪ 未注册</span>
                                    <button class="quick-activate-parent-btn bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/50 text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-all active:scale-95" data-phone="${student.phone}" data-name="${student.guardian || student.name + '家长'}">一键激活</button>
                                   </div>`;
                            return `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${idx + 1}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${student.name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.class}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.guardian || '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.phone || '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${accountStatusHtml}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.firstOrderDate || '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button class="edit-btn text-blue-600 hover:text-blue-900" data-id="${student.id}">编辑</button>
                                        <button class="delete-btn text-red-600 hover:text-red-900" data-id="${student.id}">删除</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        // 缓存学生列表并绑定事件
        this._studentsCache = students;
        this.bindStudentEvents();
    }
,

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
        // 绑定一键激活家长账号动作
        document.querySelectorAll('.quick-activate-parent-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const phone = btn.dataset.phone;
                const name = btn.dataset.name;
                this.quickActivateParent(phone, name);
            });
        });
    }
,

    async quickActivateParent(phone, name) {
        if (!confirm(`是否确定自动开通负责人【${name}】(手机号: ${phone}) 的家长登录账号？\n\n开通后，默认登录密码为：123456`)) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ phone, name })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('家长账号激活开通成功！默认登录密码为 123456', 'success');
                this.loadStudents();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('一键开通账号失败:', error);
            this.showToast('一键开通账号失败', 'error');
        }
    }
,

    editStudent(student) {
        document.getElementById('studentModalTitle').textContent = '编辑学生';
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentClass').value = student.class;
        document.getElementById('studentGuardian').value = student.guardian || '';
        document.getElementById('studentPhone').value = student.phone || '';
        document.getElementById('studentFirstOrderDate').value = student.firstOrderDate || '';
        document.getElementById('addStudentModal').classList.remove('hidden');
        this.populateParentSelector(student.phone);
    }
,

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
,

    async populateParentSelector(selectedPhone = '') {
        const selector = document.getElementById('studentParentSelector');
        if (!selector) return;

        selector.innerHTML = '<option value="">-- 手动填写负责人与手机号 --</option>';

        try {
            const response = await fetch(`${this.baseURL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            if (data.success && data.data) {
                this._usersCache = data.data;
                data.data.forEach(parent => {
                    const opt = document.createElement('option');
                    opt.value = parent.phone;
                    opt.textContent = `${parent.name} (${parent.phone})`;
                    opt.setAttribute('data-name', parent.name);
                    if (parent.phone === selectedPhone) {
                        opt.selected = true;
                    }
                    selector.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('加载快速绑定家长下拉框失败:', error);
        }
    }
,

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
,

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
,

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
};
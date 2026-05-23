export const menuMixin = {
    async loadMenu() {
        try {
            const response = await fetch(`${this.baseURL}/menu`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this._menuCache = data.data;
                this.filterMenu();
            }
        } catch (error) {
            console.error('加载菜品失败:', error);
        }
    }
,

    filterMenu() {
        if (!this._menuCache) return;

        const keyword = (document.getElementById('menuSearchInput')?.value || '').trim().toLowerCase();
        const category = document.getElementById('menuCategoryFilter')?.value || '';

        const filtered = this._menuCache.filter(item => {
            const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword);
            const matchCategory = !category || item.category === category;
            return matchKeyword && matchCategory;
        });

        this.renderMenuTable(filtered);
    }
,

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
                                    <img src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}" alt="${item.name}" class="h-12 w-12 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm border border-gray-100 previewable-image">
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

        this.bindMenuEvents();
    }
,

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
,

    showAddMenuModal() {
        document.getElementById('menuModalTitle').textContent = '添加菜品';
        document.getElementById('menuItemId').value = '';
        document.getElementById('addMenuForm').reset();
        this.updateEditImagePreview('');
        document.getElementById('addMenuModal').classList.remove('hidden');
    }
,

    showEditMenuModal(item) {
        document.getElementById('menuModalTitle').textContent = '编辑菜品';
        document.getElementById('menuItemId').value = item.id;
        document.getElementById('menuItemName').value = item.name;
        document.getElementById('menuItemCategory').value = item.category;
        document.getElementById('menuItemPrice').value = item.price;
        document.getElementById('menuItemDescription').value = item.description || '';
        document.getElementById('menuItemNutrition').value = item.nutrition || '';
        document.getElementById('menuItemImageUrl').value = item.image || '';
        this.updateEditImagePreview(item.image || '');
        document.getElementById('addMenuModal').classList.remove('hidden');
    }
,

    hideAddMenuModal() {
        document.getElementById('addMenuModal').classList.add('hidden');
        document.getElementById('addMenuForm').reset();
        this.updateEditImagePreview('');
    }
,

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
,

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
                this.updateEditImagePreview(result.data.url);
            } else {
                this.showToast(result.message || '图片上传失败', 'error');
            }
        } catch (error) {
            console.error('图片上传错误:', error);
            this.showToast('图片上传出错', 'error');
        }
    }
,

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
,

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

    // ==================== 每日菜单发布管理 (Daily Menu) ====================,

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

};
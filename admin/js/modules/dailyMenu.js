export const dailyMenuMixin = {
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
,

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
,

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
,

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
,

    renderDailyMenuPreview() {
        const container = document.getElementById('dailyMenuPreviewList');
        const previewSection = document.getElementById('dailyMenuPreviewSection');
        
        // 逻辑：该天未发布菜单，就不要显示该天的预览界面
        const isPublished = this._currentDailyMenu && this._currentDailyMenu.published;
        if (!isPublished) {
            if (previewSection) {
                previewSection.classList.add('hidden');
            }
            return;
        }

        // 如果是已发布状态，显示预览界面
        if (previewSection) {
            previewSection.classList.remove('hidden');
        }

        const checkboxes = document.querySelectorAll('.daily-menu-dish-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        
        // 如果勾选为空，可以使用缓存中的已发布菜品，或者显示空状态
        let dishes = [];
        if (selectedIds.length > 0) {
            dishes = this._availableDishesCache.filter(dish => selectedIds.includes(dish.id));
        } else if (this._currentDailyMenu && this._currentDailyMenu.dishes) {
            dishes = this._availableDishesCache.filter(dish => this._currentDailyMenu.dishes.includes(dish.id));
        }

        if (dishes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500 bg-white rounded-xl border p-6">
                    <div class="text-4xl mb-2">🍽️</div>
                    <p class="text-xs">已发布菜单，但未包含任何有效菜品</p>
                </div>
            `;
            return;
        }

        // 解析日期：YYYY-MM-DD -> M.D
        const dateVal = document.getElementById('dailyMenuDateSelector').value;
        let dateStr = '';
        if (dateVal) {
            const parts = dateVal.split('-');
            if (parts.length === 3) {
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                dateStr = `${month}.${day}`;
            }
        } else {
            const today = new Date();
            dateStr = `${today.getMonth() + 1}.${today.getDate()}`;
        }

        // 按分类分组菜品
        const staples = dishes.filter(d => d.category === 'staple');
        const mains = dishes.filter(d => d.category === 'meat' || d.category === 'veggie');
        const soups = dishes.filter(d => d.category === 'soup');
        const desserts = dishes.filter(d => d.category === 'dessert_fruit');

        let qNum = 1;
        let html = `
            <div class="font-sans text-left space-y-4">
                <!-- 微信接龙头部与公告区域 -->
                <div class="text-center pb-2 border-b border-gray-100">
                    <h3 class="text-base font-bold text-gray-900 leading-tight">董老师小厨房${dateStr}日订餐接龙</h3>
                </div>
                
                <div class="text-[11px] text-gray-700 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm leading-relaxed whitespace-pre-wrap">一荤两素一饭一汤15/餐
两荤一素一饭一汤17/餐
三荤一饭一汤20/餐
水果2/份，拉丝酸奶3/四盎司杯
红糖冰粉5/杯
芝士火鸡面3/小碗
每周不满3餐，每餐餐标上+2元
如需取消订餐请在当天10:00之前订餐群里取消（切记不要私信❌）</div>

                <!-- 01 学校年级班级 -->
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div class="flex items-start text-xs font-semibold text-gray-950">
                        <span class="text-red-500 mr-1">*</span>
                        <span>0${qNum++} 学校、年级班级（校区一定要写）</span>
                    </div>
                    <div class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded w-max">必填</div>
                    <div class="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-400 text-left mt-1 select-none">
                        请输入
                    </div>
                </div>

                <!-- 02 姓名 -->
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div class="flex items-start text-xs font-semibold text-gray-950">
                        <span class="text-red-500 mr-1">*</span>
                        <span>0${qNum++} 姓名</span>
                    </div>
                    <div class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded w-max">必填</div>
                    <div class="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-400 text-left mt-1 select-none">
                        请输入
                    </div>
                </div>
        `;

        // 03 主食 (单选)
        if (staples.length > 0) {
            html += `
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div class="flex items-start text-xs font-semibold text-gray-950">
                        <span class="text-red-500 mr-1">*</span>
                        <span>0${qNum++} 主食</span>
                    </div>
                    <div class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded w-max">单选</div>
                    <div class="grid grid-cols-2 gap-2 mt-1.5">
                        ${staples.map(dish => `
                            <div class="flex items-center space-x-2 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 shadow-sm select-none">
                                <span class="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0"></span>
                                <span class="truncate font-medium">${dish.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 04 菜品 (多选，自动标号)
        if (mains.length > 0) {
            html += `
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div class="flex items-start text-xs font-semibold text-gray-950">
                        <span class="text-red-500 mr-1">*</span>
                        <span>0${qNum++} 菜品</span>
                    </div>
                    <div class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded w-max">多选</div>
                    <div class="grid grid-cols-2 gap-2 mt-1.5">
                        ${mains.map((dish, index) => `
                            <div class="flex items-center space-x-2 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 shadow-sm select-none">
                                <span class="w-4 h-4 rounded border border-gray-300 flex items-center justify-center flex-shrink-0"></span>
                                <span class="truncate font-medium">${index + 1}${dish.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 05 汤品 (各汤品单选需要/不需要)
        if (soups.length > 0) {
            soups.forEach(soup => {
                html += `
                    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                        <div class="flex items-start text-xs font-semibold text-gray-950">
                            <span class="text-red-500 mr-1">*</span>
                            <span>0${qNum++} ${soup.name}</span>
                        </div>
                        <div class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded w-max">单选</div>
                        <div class="grid grid-cols-2 gap-2 mt-1.5">
                            <div class="flex items-center space-x-2 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 shadow-sm select-none">
                                <span class="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0"></span>
                                <span class="font-medium">需要</span>
                            </div>
                            <div class="flex items-center space-x-2 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 shadow-sm select-none">
                                <span class="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0"></span>
                                <span class="font-medium">不需要</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // 06 水果饮品酸奶 (多选)
        if (desserts.length > 0) {
            html += `
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div class="flex items-start text-xs font-semibold text-gray-950">
                        <span class="text-red-500 mr-1">*</span>
                        <span>0${qNum++} 水果饮品酸奶</span>
                    </div>
                    <div class="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded w-max">多选</div>
                    <div class="grid grid-cols-2 gap-2 mt-1.5">
                        ${desserts.map(dish => `
                            <div class="flex items-center space-x-2 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 shadow-sm select-none">
                                <span class="w-4 h-4 rounded border border-gray-300 flex items-center justify-center flex-shrink-0"></span>
                                <span class="truncate font-medium">${dish.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;
    }
,

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
};
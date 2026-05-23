import { on } from '../utils.js';

export const settingsMixin = {
    initSettings() {
        this.loadSettingsData();
        this.bindSettingsEvents();
    },

    bindSettingsEvents() {
        // We only have one save button for the whole page
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveSettingsData();
        }
    },

    async loadSettingsData() {
        try {
            const response = await fetch('/api/admin/settings', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                this.handleAuthFailure();
                return;
            }

            const data = await response.json();
            if (data.success && data.data) {
                const settings = data.data;
                // 填充表单数据
                const wechatInput = document.getElementById('settingWechat');
                const phoneInput = document.getElementById('settingPhone');
                const quoteInput = document.getElementById('settingQuote');
                const deliveryInput = document.getElementById('settingNoticeDelivery');
                const discountInput = document.getElementById('settingNoticeDiscount');
                const cancelInput = document.getElementById('settingNoticeCancel');

                if (wechatInput) wechatInput.value = settings.wechat || '';
                if (phoneInput) phoneInput.value = settings.phone || '';
                if (quoteInput) quoteInput.value = settings.quote || '';
                if (deliveryInput) deliveryInput.value = settings.noticeDelivery || '';
                if (discountInput) discountInput.value = settings.noticeDiscount || '';
                if (cancelInput) cancelInput.value = settings.noticeCancel || '';
            } else {
                console.error('加载系统配置失败', data.message);
                this.showToast(data.message || '加载系统配置失败', 'error');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showToast('加载系统配置时发生错误', 'error');
        }
    },

    async saveSettingsData() {
        const wechatInput = document.getElementById('settingWechat');
        const phoneInput = document.getElementById('settingPhone');
        const quoteInput = document.getElementById('settingQuote');
        const deliveryInput = document.getElementById('settingNoticeDelivery');
        const discountInput = document.getElementById('settingNoticeDiscount');
        const cancelInput = document.getElementById('settingNoticeCancel');

        if (!wechatInput) return; // Not initialized yet

        const newSettings = {
            wechat: wechatInput.value.trim(),
            phone: phoneInput.value.trim(),
            quote: quoteInput.value.trim(),
            noticeDelivery: deliveryInput.value.trim(),
            noticeDiscount: discountInput.value.trim(),
            noticeCancel: cancelInput.value.trim()
        };

        const saveBtn = document.getElementById('saveSettingsBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="loading w-5 h-5 mr-2"></i>保存中...';
        saveBtn.disabled = true;

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(newSettings)
            });

            if (response.status === 401 || response.status === 403) {
                this.handleAuthFailure();
                return;
            }

            const data = await response.json();
            if (data.success) {
                this.showToast('系统配置保存成功！', 'success');
            } else {
                this.showToast(data.message || '保存失败', 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('保存时发生网络错误', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
};

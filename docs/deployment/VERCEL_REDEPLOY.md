# 🚀 Vercel重新部署指南

## 方法1：删除项目重新创建（推荐）

### 步骤1：删除现有项目
1. 登录 https://vercel.com/dashboard
2. 找到项目 `trae_lylv2ks1`
3. 点击项目进入详情页
4. 点击右上角 "Settings"
5. 滚动到最底部，找到 "Delete Project"
6. 输入项目名确认删除

### 步骤2：重新导入项目
1. 回到 Vercel 首页
2. 点击 "New Project"
3. 选择 "Import Git Repository"
4. 找到你的 GitHub 仓库并导入
5. **项目名称**：可以改为 `community-canteen` 或其他名称
6. **Framework Preset**：选择 "Vite"
7. **Root Directory**：保持默认 `./`
8. 点击 "Deploy"

### 步骤3：等待部署完成
- 通常需要2-5分钟
- 部署成功后会显示新的URL

## 方法2：使用GitHub重新触发

### 步骤1：推送代码更改
```bash
git add .
git commit -m "触发重新部署"
git push origin main
```

### 步骤2：在Vercel中重新连接
1. 进入项目设置
2. 找到 "Git" 设置
3. 重新连接 GitHub 仓库

## 🎯 部署成功后的测试

1. **获取新的URL**（类似：https://your-new-project.vercel.app）
2. **测试前端**：访问主页
3. **测试API**：访问 `/api/health`
4. **测试管理后台**：访问 `/admin/`

## 📝 更新本地测试页面

部署成功后，需要更新本地测试页面中的API地址：
- 打开 `simple-test.html`
- 将 `https://trae-lylv2ks1.vercel.app` 替换为新的URL
# 部署指南

## 前端+后端一体化部署到Vercel

### ⚠️ 问题修复说明

**原始问题**: API和管理后台页面无法访问，返回404错误
**根本原因**: ES模块在Vercel serverless环境中的兼容性问题
**解决方案**: 重写API为简单的serverless函数格式

### 配置说明

项目已配置为前端和后端一体化部署到Vercel。配置文件包括：

1. **vercel.json** - Vercel部署配置
   - 前端构建：使用 `@vercel/static-build`
   - 后端API：使用 `@vercel/node`，指向 `api/index.js`
   - 路由配置：API路由指向serverless函数，其他路由指向前端

2. **API配置** - `src/services/api.ts`
   - 开发环境：使用 `http://localhost:3001/api`
   - 生产环境：使用相对路径 `/api`

3. **Serverless API** - `api/index.js`
   - 使用简单的函数式API，避免ES模块兼容性问题
   - 内置菜品数据和基础功能
   - 支持CORS和所有必要的API端点

### 部署步骤

1. **提交代码到Git仓库**
   ```bash
   git add .
   git commit -m "配置前后端一体化部署"
   git push
   ```

2. **在Vercel中重新部署**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 找到您的项目
   - 点击 "Redeploy" 或推送代码会自动触发部署

### 部署后的URL结构

- **前端页面**: `https://traelylv2ks1-d7hh72o47-pcs-projects-e951c936.vercel.app/`
- **API接口**: `https://traelylv2ks1-d7hh72o47-pcs-projects-e951c936.vercel.app/api/`
- **管理后台**: `https://traelylv2ks1-d7hh72o47-pcs-projects-e951c936.vercel.app/admin/`

### 测试API连接

部署完成后，可以通过以下URL测试API：

1. **健康检查**: `/api/health`
2. **菜品列表**: `/api/menu`
3. **分类列表**: `/api/menu/categories/list`
4. **管理后台**: `/admin/no-js-menu.html`

### 🧪 本地测试工具

项目包含一个测试页面 `test-vercel-api.html`，可以：
1. 在本地开发服务器中打开：`http://localhost:5173/test-vercel-api.html`
2. 测试线上API的所有端点
3. 查看详细的测试结果和错误信息
4. 直接点击链接访问各个API端点

**使用方法**：
```bash
npm run dev
# 然后在浏览器中访问 http://localhost:5173/test-vercel-api.html
```

### 本地开发

本地开发时仍然需要分别启动前端和后端：

```bash
# 启动后端 (终端1)
cd server
npm start

# 启动前端 (终端2)
npm run dev
```

### 注意事项

1. **环境变量**: 如果需要环境变量，在Vercel项目设置中添加
2. **数据持久化**: 当前使用内存数据库，重启会丢失数据
3. **文件上传**: 如需文件上传功能，建议使用云存储服务
4. **数据库**: 生产环境建议使用外部数据库服务

### 故障排除

如果部署后API不工作：

1. 检查Vercel部署日志
2. 确认 `vercel.json` 配置正确
3. 检查API路由是否正确配置
4. 验证CORS设置包含正确的域名
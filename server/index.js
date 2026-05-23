import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 路由导入
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import publicOrderRoutes from './routes/public-order.js';
import { initializeDatabase } from './data/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Neon PG database tables & hydrate in-memory arrays before request handling
await initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件（关闭 CSP，允许内嵌脚本和 CDN 资源）
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS配置
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000', 
    'http://127.0.0.1:5173', 
    'http://127.0.0.1:5174',
    'https://traelylv2ks1-d7hh72o47-pcs-projects-e951c936.vercel.app'
  ],
  credentials: true
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'production' ? 1000 : 999999, // 生产环境合理放宽，非生产环境完全放开限制
  message: '请求过于频繁，请稍后再试',
  skip: (req) => {
    // 开发环境下免受频控阻断测试，保证 HMR 开发无忧
    if (process.env.NODE_ENV !== 'production') return true;
    
    // 本地环回地址也跳过限制
    const ip = req.ip || req.connection.remoteAddress || '';
    if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost')) {
      return true;
    }
    return false;
  }
});
app.use('/api', limiter);

// 日志中间件
app.use(morgan('combined'));

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// 管理后台静态文件服务
app.use('/admin', express.static(join(__dirname, '../admin')));

// 公共订餐页面静态文件服务
app.use(express.static(join(__dirname, '../public')));

// API路由
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/public', publicOrderRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '社区小饭桌API服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '接口不存在',
    path: req.originalUrl 
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: err.message || '请稍后重试'
  });
});

// 在Vercel环境中不需要监听端口
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 社区小饭桌后端服务启动成功！`);
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`📊 管理后台: http://localhost:${PORT}/api/admin/dashboard`);
  });
}

// Vercel serverless函数导出
export default app;

// 兼容CommonJS导出（Vercel需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}
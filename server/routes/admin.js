import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../data/database.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件！'), false);
    }
  }
});

const router = express.Router();

// 所有管理员路由都需要身份验证
router.use(authenticateToken);

// 获取仪表板数据
router.get('/dashboard', (req, res) => {
  try {
    const statistics = db.getStatistics();
    const orders = db.getOrders();
    const menuItems = db.getMenuItems();
    const students = db.getStudents();
    
    // 最近订单
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    
    // 订单状态分布
    const statusDistribution = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    
    // 每日订单趋势（最近7天）
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toDateString();
    }).reverse();
    
    const dailyOrders = last7Days.map(date => ({
      date,
      count: orders.filter(order => 
        new Date(order.createdAt).toDateString() === date
      ).length,
      revenue: orders
        .filter(order => new Date(order.createdAt).toDateString() === date)
        .reduce((sum, order) => sum + order.totalPrice, 0)
    }));

    // 当日订单详细统计
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter(order => new Date(order.createdAt).toDateString() === todayStr);
    const todayOrdersRevenue = todayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const todayStatusDistribution = todayOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, { pending: 0, confirmed: 0, delivered: 0, cancelled: 0 });

    const todayDishQuantities = {};
    todayOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => {
          todayDishQuantities[item.name] = (todayDishQuantities[item.name] || 0) + item.quantity;
        });
      }
    });

    const todayOrdersStats = {
      count: todayOrders.length,
      revenue: todayOrdersRevenue,
      statusDistribution: todayStatusDistribution,
      dishes: todayDishQuantities
    };
    
    const dashboardData = {
      statistics: {
        ...statistics,
        totalStudents: students.length,
        todayOrdersStats
      },
      recentOrders,
      statusDistribution,
      dailyOrders,
      menuStats: {
        total: menuItems.length,
        available: menuItems.filter(item => item.available).length,
        unavailable: menuItems.filter(item => !item.available).length
      }
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败',
      error: error.message
    });
  }
});

// 管理菜品 - 添加菜品
router.post('/menu', (req, res) => {
  try {
    const { name, category, price, description, nutrition, image } = req.body;
    
    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: '菜品名称、分类和价格不能为空'
      });
    }
    
    const newItem = db.addMenuItem({
      name,
      category,
      price: parseFloat(price),
      description: description || '',
      nutrition: nutrition || '',
      image: image || '',
      available: true,
      preparationTime: 10
    });
    
    res.status(201).json({
      success: true,
      message: '菜品添加成功',
      data: newItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加菜品失败',
      error: error.message
    });
  }
});

// 管理菜品 - 更新菜品
router.put('/menu/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.price) {
      updates.price = parseFloat(updates.price);
    }
    
    const updatedItem = db.updateMenuItem(id, updates);
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }
    
    res.json({
      success: true,
      message: '菜品更新成功',
      data: updatedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新菜品失败',
      error: error.message
    });
  }
});

// 管理菜品 - 删除菜品
router.delete('/menu/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = db.deleteMenuItem(id);
    
    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }
    
    res.json({
      success: true,
      message: '菜品删除成功',
      data: deletedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除菜品失败',
      error: error.message
    });
  }
});

// 获取所有订单（管理员视图）
router.get('/orders', (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    let orders = db.getOrders();
    
    // 筛选
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    if (date) {
      orders = orders.filter(order => 
        new Date(order.createdAt).toDateString() === new Date(date).toDateString()
      );
    }
    
    // 排序
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: orders.length,
        totalPages: Math.ceil(orders.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取订单列表失败',
      error: error.message
    });
  }
});

// 批量更新订单状态
router.patch('/orders/batch-status', (req, res) => {
  try {
    const { orderIds, status } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || !status) {
      return res.status(400).json({
        success: false,
        message: '订单ID列表和状态不能为空'
      });
    }
    
    const updatedOrders = [];
    const errors = [];
    
    orderIds.forEach(id => {
      try {
        const updatedOrder = db.updateOrderStatus(id, status);
        if (updatedOrder) {
          updatedOrders.push(updatedOrder);
        } else {
          errors.push(`订单 ${id} 不存在`);
        }
      } catch (error) {
        errors.push(`更新订单 ${id} 失败: ${error.message}`);
      }
    });
    
    res.json({
      success: true,
      message: `成功更新 ${updatedOrders.length} 个订单`,
      data: {
        updated: updatedOrders,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批量更新订单状态失败',
      error: error.message
    });
  }
});

// 获取营业报告
router.get('/reports/business', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const orders = db.getOrders();
    
    let filteredOrders = orders;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
    }
    
    const report = {
      period: {
        startDate: startDate || '全部',
        endDate: endDate || '全部'
      },
      summary: {
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0),
        averageOrderValue: filteredOrders.length > 0 
          ? filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0) / filteredOrders.length 
          : 0,
        completedOrders: filteredOrders.filter(order => order.status === 'completed').length
      },
      statusBreakdown: filteredOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
      popularItems: getPopularItems(filteredOrders),
      hourlyDistribution: getHourlyDistribution(filteredOrders)
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取营业报告失败',
      error: error.message
    });
  }
});

// 辅助函数：获取热门商品
function getPopularItems(orders) {
  const itemCounts = {};
  
  orders.forEach(order => {
    order.items.forEach(item => {
      if (itemCounts[item.id]) {
        itemCounts[item.id].count += item.quantity;
        itemCounts[item.id].revenue += item.subtotal;
      } else {
        itemCounts[item.id] = {
          id: item.id,
          name: item.name,
          count: item.quantity,
          revenue: item.subtotal
        };
      }
    });
  });
  
  return Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// 辅助函数：获取小时分布
function getHourlyDistribution(orders) {
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
    revenue: 0
  }));
  
  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour].count++;
    hourCounts[hour].revenue += order.totalPrice;
  });
  
  return hourCounts;
}

// ==================== 菜品图片上传 (Image Upload) ====================
router.post('/menu/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有选择上传的图片'
      });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        url: fileUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '图片上传失败',
      error: error.message
    });
  }
});

// ==================== 家长用户管理 (Users) ====================
// 获取所有家长用户
router.get('/users', (req, res) => {
  try {
    const users = db.getUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

// 添加家长用户
router.post('/users', (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: '手机号和家长姓名不能为空'
      });
    }
    const newUser = db.addUser({ phone, name });
    res.status(201).json({
      success: true,
      message: '用户添加成功',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加用户失败',
      error: error.message
    });
  }
});

// 更新家长用户
router.put('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { phone, name } = req.body;
    const updatedUser = db.updateUser(id, { phone, name });
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    res.json({
      success: true,
      message: '用户更新成功',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新用户失败',
      error: error.message
    });
  }
});

// 删除家长用户
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = db.deleteUser(id);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    res.json({
      success: true,
      message: '用户删除成功',
      data: deletedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    });
  }
});

// ==================== 登录日志管理 (Login Logs) ====================
// 获取登录日志
router.get('/logs', (req, res) => {
  try {
    const logs = db.getLoginLogs();
    const sortedLogs = [...logs].sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
    res.json({
      success: true,
      data: sortedLogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取登录日志失败',
      error: error.message
    });
  }
});

// ==================== 每日菜单管理 (Daily Menus) ====================
// 获取每日菜单列表
router.get('/daily-menus', (req, res) => {
  try {
    const { date } = req.query;
    if (date) {
      const menu = db.getDailyMenuByDate(date);
      return res.json({
        success: true,
        data: menu || null
      });
    }
    const menus = db.getDailyMenus();
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取每日菜单失败',
      error: error.message
    });
  }
});

// 保存/发布每日菜单
router.post('/daily-menus', (req, res) => {
  try {
    const { date, dishes, published } = req.body;
    if (!date || !dishes || !Array.isArray(dishes)) {
      return res.status(400).json({
        success: false,
        message: '日期和菜品列表不能为空'
      });
    }
    const savedMenu = db.saveDailyMenu(date, dishes, published !== false);
    res.json({
      success: true,
      message: '每日菜单保存成功',
      data: savedMenu
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存每日菜单失败',
      error: error.message
    });
  }
});

// 删除每日菜单
router.delete('/daily-menus/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedMenu = db.deleteDailyMenu(id);
    if (!deletedMenu) {
      return res.status(404).json({
        success: false,
        message: '每日菜单记录不存在'
      });
    }
    res.json({
      success: true,
      message: '每日菜单删除成功',
      data: deletedMenu
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除每日菜单失败',
      error: error.message
    });
  }
});

export default router;
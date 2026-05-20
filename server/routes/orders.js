import express from 'express';
import { db } from '../data/database.js';

const router = express.Router();

// 创建订单
router.post('/', (req, res) => {
  try {
    const { items, address, deliveryDate, mealTime, customerInfo, totalPrice, studentId } = req.body;
    
    // 验证必填字段
    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        message: '订单商品不能为空'
      });
    }
    
    if (!address || !deliveryDate || !mealTime) {
      return res.status(400).json({
        success: false,
        message: '配送信息不完整'
      });
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '请选择订餐学生'
      });
    }
    
    // 计算总价
    let calculatedTotalPrice = 0;
    const orderItems = items.map(item => {
      const menuItem = db.getMenuItemById(item.foodId || item.id);
      if (!menuItem) {
        throw new Error(`菜品 ${item.foodId || item.id} 不存在`);
      }
      if (!menuItem.available) {
        throw new Error(`菜品 ${menuItem.name} 暂时不可用`);
      }
      
      const itemTotal = (item.price || menuItem.price) * item.quantity;
      calculatedTotalPrice += itemTotal;
      
      return {
        id: menuItem.id,
        name: menuItem.name,
        price: item.price || menuItem.price,
        quantity: item.quantity,
        image: menuItem.image,
        subtotal: itemTotal
      };
    });
    
    // 使用前端传递的总价或计算的总价
    const finalTotalPrice = totalPrice || calculatedTotalPrice;
    
    // 创建订单
    const order = {
      items: orderItems,
      totalPrice: finalTotalPrice,
      address,
      deliveryDate,
      mealTime,
      customerInfo: customerInfo || {},
      studentId,
      orderNumber: generateOrderNumber()
    };
    
    const newOrder = db.addOrder(order);
    
    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: newOrder
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || '创建订单失败'
    });
  }
});

// 获取订单列表
router.get('/', (req, res) => {
  try {
    const { status, date, page = 1, limit = 10 } = req.query;
    let orders = db.getOrders();
    
    // 按状态筛选
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    // 按日期筛选
    if (date) {
      orders = orders.filter(order => 
        new Date(order.createdAt).toDateString() === new Date(date).toDateString()
      );
    }
    
    // 排序（最新的在前）
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

// 获取单个订单详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.getOrderById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取订单详情失败',
      error: error.message
    });
  }
});

// 更新订单状态
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的订单状态'
      });
    }
    
    const updatedOrder = db.updateOrderStatus(id, status);
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }
    
    res.json({
      success: true,
      message: '订单状态更新成功',
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新订单状态失败',
      error: error.message
    });
  }
});

// 获取订单统计
router.get('/statistics', (req, res) => {
  try {
    const orders = db.getOrders();
    const today = new Date().toDateString();
    
    const stats = {
      total: orders.length,
      today: orders.filter(order => 
        new Date(order.createdAt).toDateString() === today
      ).length,
      pending: orders.filter(order => order.status === 'pending').length,
      completed: orders.filter(order => order.status === 'completed').length,
      revenue: {
        total: orders.reduce((sum, order) => sum + order.totalPrice, 0),
        today: orders
          .filter(order => new Date(order.createdAt).toDateString() === today)
          .reduce((sum, order) => sum + order.totalPrice, 0)
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取订单统计失败',
      error: error.message
    });
  }
});

// 生成订单号
function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `CC${year}${month}${day}${random}`;
}

export default router;
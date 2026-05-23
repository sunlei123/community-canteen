import express from 'express';
import { db } from '../data/database.js';

// 最优折扣套餐计算
const calculateOptimalComboPrice = (
  meatPrices,
  veggiePrices,
  staplePrices,
  soupPrices
) => {
  const sortedMeats = [...meatPrices].sort((a, b) => b - a);
  const sortedVeggies = [...veggiePrices].sort((a, b) => b - a);
  const sortedStaples = [...staplePrices].sort((a, b) => b - a);
  const sortedSoups = [...soupPrices].sort((a, b) => b - a);

  const memo = {};

  const getMinPrice = (
    mCount,
    vCount,
    sCount,
    spCount
  ) => {
    const key = `${mCount},${vCount},${sCount},${spCount}`;
    if (key in memo) return memo[key];

    let minPrice = 0;
    for (let i = sortedMeats.length - mCount; i < sortedMeats.length; i++) minPrice += sortedMeats[i];
    for (let i = sortedVeggies.length - vCount; i < sortedVeggies.length; i++) minPrice += sortedVeggies[i];
    for (let i = sortedStaples.length - sCount; i < sortedStaples.length; i++) minPrice += sortedStaples[i];
    for (let i = sortedSoups.length - spCount; i < sortedSoups.length; i++) minPrice += sortedSoups[i];

    if (mCount >= 3 && sCount >= 1 && spCount >= 1) {
      const price = 20 + getMinPrice(mCount - 3, vCount, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    if (mCount >= 2 && vCount >= 1 && sCount >= 1 && spCount >= 1) {
      const price = 17 + getMinPrice(mCount - 2, vCount - 1, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    if (mCount >= 1 && vCount >= 2 && sCount >= 1 && spCount >= 1) {
      const price = 15 + getMinPrice(mCount - 1, vCount - 2, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    memo[key] = minPrice;
    return minPrice;
  };

  return getMinPrice(sortedMeats.length, sortedVeggies.length, sortedStaples.length, sortedSoups.length);
};

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

    // 每天每个学生仅允许下一单（按配送日期 deliveryDate 判断）
    const allOrders = db.getOrders();
    const existingOrder = allOrders.find(o =>
      o.studentId === studentId &&
      o.deliveryDate === deliveryDate &&
      o.status !== 'cancelled'
    );
    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: `该学生当天已经订餐（订单号：${existingOrder.orderNumber}），每天每人仅允许下一单哦 🍱`,
        code: 'DUPLICATE_ORDER'
      });
    }

    let calculatedTotalPrice = 0;
    const meatPrices = [];
    const veggiePrices = [];
    const staplePrices = [];
    const soupPrices = [];
    let dessertTotal = 0;

    const orderItems = items.map(item => {
      const menuItem = db.getMenuItemById(item.foodId || item.id);
      if (!menuItem) {
        throw new Error(`菜品 ${item.foodId || item.id} 不存在`);
      }
      if (!menuItem.available) {
        throw new Error(`菜品 ${menuItem.name} 暂时不可用`);
      }
      
      const itemPrice = item.price || menuItem.price;
      const quantity = item.quantity || 1;
      const itemTotal = itemPrice * quantity;

      // 按数量展开加入计算数组
      for (let i = 0; i < quantity; i++) {
        if (menuItem.category === 'meat') {
          meatPrices.push(itemPrice);
        } else if (menuItem.category === 'veggie') {
          veggiePrices.push(itemPrice);
        } else if (menuItem.category === 'staple') {
          staplePrices.push(itemPrice);
        } else if (menuItem.category === 'soup') {
          soupPrices.push(itemPrice);
        } else {
          dessertTotal += itemPrice;
        }
      }
      
      return {
        id: menuItem.id,
        name: menuItem.name,
        price: itemPrice,
        quantity: quantity,
        image: menuItem.image,
        subtotal: itemTotal
      };
    });
    
    // 计算最优折扣总价
    const comboPrice = calculateOptimalComboPrice(meatPrices, veggiePrices, staplePrices, soupPrices);
    calculatedTotalPrice = comboPrice + dessertTotal;

    // 安全强校验：以计算所得的真实最优套餐折抵价为准
    const finalTotalPrice = calculatedTotalPrice;
    
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
    const { status, date, studentId, studentIds, search, page = 1, limit = 10 } = req.query;
    let orders = db.getOrders();
    
    // 按学生筛选
    if (studentId) {
      orders = orders.filter(order => order.studentId === studentId);
    } else if (studentIds) {
      const ids = studentIds.split(',');
      orders = orders.filter(order => ids.includes(order.studentId));
    }

    // 模糊搜索：匹配订单号、学生姓名或所含菜品名
    if (search) {
      const query = search.toLowerCase();
      orders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        (order.studentName && order.studentName.toLowerCase().includes(query)) ||
        (order.address && order.address.toLowerCase().includes(query)) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

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

// 查询指定学生某天是否已订餐（必须放在 /:id 路由之前，防止被动态参数拦截）
router.get('/check-today', (req, res) => {
  try {
    const { studentId, date } = req.query;
    if (!studentId || !date) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    const allOrders = db.getOrders();
    const existing = allOrders.find(o =>
      o.studentId === studentId &&
      o.deliveryDate === date &&
      o.status !== 'cancelled'
    );
    res.json({
      success: true,
      data: {
        hasOrder: !!existing,
        order: existing || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: error.message });
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
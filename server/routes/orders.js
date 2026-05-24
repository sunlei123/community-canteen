import express from 'express';
import { db, pool } from '../data/database.js';

// 自然周判断函数
function getWeekRange(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0为周日，1-6为周一到周六
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const toDateString = (d) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };
  
  return {
    mondayStr: toDateString(monday),
    sundayStr: toDateString(sunday)
  };
}

// 荤菜、素菜最优折扣套餐计算
const calculateOptimalComboPrice = (meatPrices, veggiePrices) => {
  const sortedMeats = [...meatPrices].sort((a, b) => b - a);
  const sortedVeggies = [...veggiePrices].sort((a, b) => b - a);

  const memo = {};

  const getMinPrice = (mCount, vCount) => {
    const key = `${mCount},${vCount}`;
    if (key in memo) return memo[key];

    let minPrice = 0;
    for (let i = sortedMeats.length - mCount; i < sortedMeats.length; i++) minPrice += sortedMeats[i];
    for (let i = sortedVeggies.length - vCount; i < sortedVeggies.length; i++) minPrice += sortedVeggies[i];

    // 匹配：三荤 = 20元
    if (mCount >= 3) {
      const price = 20 + getMinPrice(mCount - 3, vCount);
      if (price < minPrice) minPrice = price;
    }

    // 匹配：两荤一素 = 17元
    if (mCount >= 2 && vCount >= 1) {
      const price = 17 + getMinPrice(mCount - 2, vCount - 1);
      if (price < minPrice) minPrice = price;
    }

    // 匹配：一荤两素 = 15元
    if (mCount >= 1 && vCount >= 2) {
      const price = 15 + getMinPrice(mCount - 1, vCount - 2);
      if (price < minPrice) minPrice = price;
    }

    memo[key] = minPrice;
    return minPrice;
  };

  return getMinPrice(sortedMeats.length, sortedVeggies.length);
};

// 计算单笔订单的基础餐费 (荤素折抵套餐 + 甜品水果累计)
function calculateOrderBasePrice(order) {
  const meatPrices = [];
  const veggiePrices = [];
  let dessertTotal = 0;

  order.items.forEach(item => {
    const menuItem = db.getMenuItemById(item.foodId || item.id);
    if (!menuItem) return;

    const itemPrice = menuItem.price;
    const quantity = item.quantity || 1;

    for (let i = 0; i < quantity; i++) {
      if (menuItem.category === 'meat') {
        meatPrices.push(itemPrice);
      } else if (menuItem.category === 'veggie') {
        veggiePrices.push(itemPrice);
      } else if (menuItem.category === 'dessert_fruit') {
        dessertTotal += itemPrice;
      }
      // staple (主食) 和 soup (汤) 强制不计入餐费
    }
  });

  const comboPrice = calculateOptimalComboPrice(meatPrices, veggiePrices);
  return comboPrice + dessertTotal;
}

// 自然周订餐价格同步与补偿引擎
function recalculateWeekOrders(studentId, deliveryDate) {
  if (!studentId) return;
  const { mondayStr, sundayStr } = getWeekRange(deliveryDate);
  const allOrders = db.getOrders();

  // 找出该学生该自然周内所有有效且非 cancelled 的订单
  const weekOrders = allOrders.filter(o =>
    o.studentId === studentId &&
    o.deliveryDate >= mondayStr &&
    o.deliveryDate <= sundayStr &&
    o.status !== 'cancelled'
  );

  const totalCount = weekOrders.length;
  // 每餐标准加价额（不满3餐加2元，满3餐及以上加0元）
  const extraFee = totalCount >= 3 ? 0 : 2;

  weekOrders.forEach(o => {
    const basePrice = calculateOrderBasePrice(o);
    const newTotalPrice = basePrice + extraFee;

    if (o.totalPrice !== newTotalPrice) {
      o.totalPrice = newTotalPrice;
      o.updatedAt = new Date().toISOString();

      // 同步写回 Neon PostgreSQL
      pool.query(
        'UPDATE orders SET total_price = $1, updated_at = $2 WHERE id = $3',
        [newTotalPrice, o.updatedAt, o.id]
      ).catch(err => console.error(`Error updating order ${o.id} price in PG:`, err));
    }
  });
}

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

      return {
        id: menuItem.id,
        name: menuItem.name,
        price: itemPrice,
        quantity: quantity,
        image: menuItem.image,
        subtotal: itemTotal
      };
    });

    // 强校验：荤菜和素菜的累计选择数量必须且只能为 3 份
    let totalMainsCount = 0;
    orderItems.forEach(item => {
      const menuItem = db.getMenuItemById(item.id);
      if (menuItem && (menuItem.category === 'meat' || menuItem.category === 'veggie')) {
        totalMainsCount += item.quantity || 1;
      }
    });

    if (totalMainsCount !== 3) {
      return res.status(400).json({
        success: false,
        message: `为了营养均衡及套餐结算，荤菜与素菜累计必须选择且只能选择3份哦 🍱（当前已选 ${totalMainsCount} 份）`
      });
    }
    
    // 算出加上此订单后，本周有效订餐数
    const { mondayStr, sundayStr } = getWeekRange(deliveryDate);
    const existingWeekOrdersCount = allOrders.filter(o => 
      o.studentId === studentId &&
      o.deliveryDate >= mondayStr &&
      o.deliveryDate <= sundayStr &&
      o.status !== 'cancelled'
    ).length;
    
    const newWeekOrdersCount = existingWeekOrdersCount + 1;
    const newExtraFee = newWeekOrdersCount >= 3 ? 0 : 2;
    
    // 计算新订单基础价格
    const newMeatPrices = [];
    const newVeggiePrices = [];
    let newDessertTotal = 0;
    
    orderItems.forEach(item => {
      const menuItem = db.getMenuItemById(item.id);
      if (!menuItem) return;
      const quantity = item.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        if (menuItem.category === 'meat') {
          newMeatPrices.push(menuItem.price);
        } else if (menuItem.category === 'veggie') {
          newVeggiePrices.push(menuItem.price);
        } else if (menuItem.category === 'dessert_fruit') {
          newDessertTotal += menuItem.price;
        }
      }
    });
    
    const baseComboPrice = calculateOptimalComboPrice(newMeatPrices, newVeggiePrices);
    const basePrice = baseComboPrice + newDessertTotal;
    const finalTotalPrice = basePrice + newExtraFee;
    
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
    
    // 触发周订单重算补偿，同步之前的订单价格（如有）
    recalculateWeekOrders(studentId, deliveryDate);
    
    // 获取最新重算后的订单返回给前端，确保响应数据百分之百绝对精准
    const finalNewOrder = db.getOrderById(newOrder.id) || newOrder;
    
    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: finalNewOrder
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
    
    // 如果订单状态变为已取消 (或从已取消重新恢复)，触发该学生该配送周的价格重新计算补偿
    recalculateWeekOrders(updatedOrder.studentId, updatedOrder.deliveryDate);
    
    // 获取重算价格后的最新订单数据返回给前端
    const finalUpdatedOrder = db.getOrderById(id) || updatedOrder;
    
    res.json({
      success: true,
      message: '订单状态更新成功',
      data: finalUpdatedOrder
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
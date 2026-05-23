import express from 'express';
import { db } from '../data/database.js';

const router = express.Router();

// 获取系统配置（公共接口，无需登录）
router.get('/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

// 获取今日已发布的菜单（公共接口，无需登录）
router.get('/today-menu', (req, res) => {
  try {
    // 支持查询指定日期，默认今天
    const queryDate = req.query.date || new Date().toISOString().split('T')[0];

    // 从每日菜单中查找已发布的菜单
    const dailyMenu = db.getDailyMenuByDate(queryDate);

    if (!dailyMenu || !dailyMenu.published) {
      return res.json({
        success: true,
        data: null,
        message: '今日菜单尚未发布'
      });
    }

    // 获取所有菜品详情
    const allMenuItems = db.getMenuItems();

    // 如果 dailyMenu.dishes 中有菜品ID列表，则只返回这些菜品
    let dishes;
    if (dailyMenu.dishes && dailyMenu.dishes.length > 0) {
      dishes = allMenuItems.filter(item =>
        dailyMenu.dishes.includes(item.id) && item.available
      );
    } else {
      // 如果没有指定菜品，返回所有可用菜品
      dishes = allMenuItems.filter(item => item.available);
    }

    // 按分类分组
    const grouped = {
      staple: [],      // 主食
      meat: [],        // 荤菜
      veggie: [],      // 素菜
      soup: [],        // 汤
      dessert_fruit: [] // 甜点/水果/饮品
    };

    dishes.forEach(dish => {
      if (grouped[dish.category]) {
        grouped[dish.category].push({
          id: dish.id,
          name: dish.name,
          category: dish.category,
          price: dish.price,
          description: dish.description || '',
          image: dish.image || ''
        });
      }
    });

    res.json({
      success: true,
      data: {
        date: queryDate,
        published: true,
        dishes: grouped,
        allDishes: dishes
      }
    });
  } catch (error) {
    console.error('获取今日菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取今日菜单失败',
      error: error.message
    });
  }
});

// 家长提交订餐（公共接口，无需登录）
router.post('/order', (req, res) => {
  try {
    const { schoolClass, studentName, phone, selectedItems, note } = req.body;

    // 验证必填字段
    if (!schoolClass || !studentName) {
      return res.status(400).json({
        success: false,
        message: '学校班级和姓名不能为空'
      });
    }

    if (!selectedItems || selectedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少选择一个菜品'
      });
    }

    // 查找或构建菜品详情
    const allMenuItems = db.getMenuItems();
    let totalPrice = 0;
    const orderItems = [];

    selectedItems.forEach(sel => {
      const menuItem = allMenuItems.find(m => m.id === sel.id);
      if (menuItem && menuItem.available) {
        const qty = sel.quantity || 1;
        const itemTotal = menuItem.price * qty;
        totalPrice += itemTotal;
        orderItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: qty,
          category: menuItem.category,
          image: menuItem.image || '',
          subtotal: itemTotal
        });
      }
    });

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: '所选菜品均不可用，请刷新页面重试'
      });
    }

    // 查找学生记录（按姓名匹配）
    const students = db.getStudents();
    let student = students.find(s =>
      s.name === studentName && s.class === schoolClass
    );

    // 如果学生不存在，自动创建
    if (!student) {
      student = db.addStudent({
        name: studentName,
        class: schoolClass,
        guardian: '',
        phone: phone || '',
        firstOrderDate: new Date().toISOString().split('T')[0]
      });
    }

    // 生成订单号
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `DC${year}${month}${day}${random}`;

    // 创建订单
    const today = new Date().toISOString().split('T')[0];
    const order = {
      items: orderItems,
      totalPrice: totalPrice,
      address: `${schoolClass} ${studentName}`,
      deliveryDate: today,
      mealTime: 'lunch',
      customerInfo: {
        schoolClass,
        studentName,
        phone: phone || ''
      },
      studentId: student.id,
      studentName: studentName,
      orderNumber: orderNumber,
      note: note || ''
    };

    const newOrder = db.addOrder(order);

    res.status(201).json({
      success: true,
      message: '订餐成功！',
      data: {
        orderNumber: newOrder.orderNumber || orderNumber,
        totalPrice: totalPrice,
        items: orderItems.map(i => `${i.name} x${i.quantity}`).join('、'),
        studentName,
        schoolClass
      }
    });
  } catch (error) {
    console.error('订餐提交失败:', error);
    res.status(500).json({
      success: false,
      message: '订餐提交失败: ' + error.message
    });
  }
});

export default router;

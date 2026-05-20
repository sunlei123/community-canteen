import express from 'express';
import { db } from '../data/database.js';

const router = express.Router();

// 获取所有菜品
router.get('/', (req, res) => {
  try {
    const { category, available, date } = req.query;
    let items = db.getMenuItems();
    
    // 按日期筛选（每日菜单）
    if (date) {
      const dailyMenu = db.getDailyMenuByDate(date);
      if (dailyMenu && dailyMenu.published) {
        items = items.filter(item => dailyMenu.dishes.includes(item.id));
      } else {
        // 如果该日期没有发布菜单，返回空
        items = [];
      }
    }
    
    // 按分类筛选
    if (category) {
      items = items.filter(item => item.category === category);
    }
    
    // 按可用性筛选
    if (available !== undefined) {
      items = items.filter(item => item.available === (available === 'true'));
    }
    
    res.json({
      success: true,
      data: items,
      total: items.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取菜品列表失败',
      error: error.message
    });
  }
});

// 获取单个菜品详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = db.getMenuItemById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取菜品详情失败',
      error: error.message
    });
  }
});

// 获取菜品分类
router.get('/categories/list', (req, res) => {
  try {
    const categories = [
      { key: 'meat', name: '荤菜', icon: '🍖' },
      { key: 'veggie', name: '素菜', icon: '🥦' },
      { key: 'dessert_fruit', name: '甜点/水果', icon: '🍰' },
      { key: 'soup', name: '汤', icon: '🥣' },
      { key: 'staple', name: '主食', icon: '🍚' }
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
      error: error.message
    });
  }
});

// 搜索菜品
router.get('/search/:keyword', (req, res) => {
  try {
    const { keyword } = req.params;
    const items = db.getMenuItems();
    
    const results = items.filter(item => 
      item.name.toLowerCase().includes(keyword.toLowerCase()) ||
      item.description.toLowerCase().includes(keyword.toLowerCase())
    );
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      keyword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '搜索菜品失败',
      error: error.message
    });
  }
});

// 添加新菜品
router.post('/add', (req, res) => {
  try {
    const { name, price, category, description, nutrition, preparationTime, image } = req.body;
    
    // 验证必填字段
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: '菜品名称、价格和分类为必填项'
      });
    }
    
    // 创建新菜品对象
    const newItem = {
      name: name.trim(),
      price: parseFloat(price),
      category,
      description: description || '',
      nutrition: nutrition || '',
      preparationTime: parseInt(preparationTime) || 10,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
      available: true
    };
    
    // 添加到数据库
    const addedItem = db.addMenuItem(newItem);
    
    res.json({
      success: true,
      message: '菜品添加成功',
      data: addedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加菜品失败',
      error: error.message
    });
  }
});

// 更新菜品
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // 检查菜品是否存在
    const existingItem = db.getMenuItemById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }
    
    // 更新菜品
    const updatedItem = db.updateMenuItem(id, updates);
    
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

// 删除菜品
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查菜品是否存在
    const existingItem = db.getMenuItemById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }
    
    // 删除菜品
    const deletedItem = db.deleteMenuItem(id);
    
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

// 切换菜品状态
router.patch('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查菜品是否存在
    const existingItem = db.getMenuItemById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }
    
    // 切换状态
    const updatedItem = db.updateMenuItem(id, { available: !existingItem.available });
    
    res.json({
      success: true,
      message: `菜品已${updatedItem.available ? '上架' : '下架'}`,
      data: updatedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '切换菜品状态失败',
      error: error.message
    });
  }
});

export default router;
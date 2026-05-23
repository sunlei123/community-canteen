import { v4 as uuidv4 } from 'uuid';
import { neon, neonConfig, Pool } from '@neondatabase/serverless';

// Neon PostgreSQL Connection - uses HTTP/WebSocket, works with Scale-to-Zero
const connectionString = 'postgresql://neondb_owner:npg_7qCdhp5eOLDo@ep-polished-mud-ap1ejnd0-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

export const pool = new Pool({ connectionString });

// Handle unexpected errors on idle pool clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle Neon client:', err.message);
});

// Helper for converting database row (snake_case) to JavaScript object (camelCase)
function rowToCamel(row) {
  if (!row) return row;
  const res = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (m, g) => g.toUpperCase());
    res[camelKey] = row[key];
  }
  return res;
}

// In-Memory Data Arrays (Hydrated from PG at boot)
export const menuItems = [];
export let orders = [];
export let students = [];
export let users = [];
export let loginLogs = [];
export let dailyMenus = [];
export const admins = [];
export let systemSettings = null;
export let statistics = {
  totalOrders: 0,
  totalRevenue: 0,
  todayOrders: 0,
  todayRevenue: 0,
  popularItems: [],
  lastUpdated: new Date().toISOString()
};

// Database Initialization & Hot Loading (Hydration)
export async function initializeDatabase() {
  console.log('🔄 Connecting to Neon PostgreSQL (serverless)...');
  try {
    // @neondatabase/serverless uses HTTP — no TCP handshake, works with Scale-to-Zero
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('💚 Successfully connected to Neon PostgreSQL.');
  } catch (err) {
    throw new Error(`Cannot connect to Neon PostgreSQL: ${err.message}`);
  }

  try {
    // 1. Create Admins Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 2. Create Menu Items Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price NUMERIC NOT NULL,
        image TEXT,
        description TEXT,
        nutrition TEXT,
        available BOOLEAN NOT NULL DEFAULT TRUE,
        preparation_time INTEGER NOT NULL DEFAULT 10,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // 3. Create Students Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        class TEXT NOT NULL,
        guardian TEXT,
        first_order_date TEXT,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `);

    // 4. Create Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `);

    // Ensure password column exists in Neon PG for existing databases
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
    `);

    // 5. Create Login Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        role TEXT NOT NULL,
        login_time TEXT NOT NULL,
        status TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT
      );
    `);

    // 6. Create Daily Menus Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_menus (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        dishes JSONB NOT NULL,
        published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `);

    // 7. Create Orders Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        items JSONB NOT NULL,
        total_price NUMERIC NOT NULL,
        delivery_date TEXT NOT NULL,
        meal_time TEXT NOT NULL,
        address TEXT NOT NULL,
        status TEXT NOT NULL,
        student_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        estimated_time TEXT,
        order_number TEXT
      );
    `);

    // Ensure customer_info column exists in Neon PG for existing databases
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_info JSONB;
    `);

    // Ensure order_number column exists in Neon PG for existing databases
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
    `);

    // 8. Create System Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);

    console.log('📑 Database schemas verified.');

    // Seed default administrator if empty
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('🌱 Seeding default administrator account...');
      await pool.query(
        `INSERT INTO admins (id, username, password, name, role, email, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'admin1',
          'admin',
          '$2a$10$I3JWSqVxmLrbzavNkTiBMeBDD4D/KONjx745e5X9UKbKX8vBwbTtK', // admin123
          '管理员',
          'admin',
          'admin@community-canteen.com',
          new Date().toISOString()
        ]
      );
    }

    // Seed default menu items if empty
    const menuCheck = await pool.query('SELECT COUNT(*) FROM menu_items');
    if (parseInt(menuCheck.rows[0].count) === 0) {
      console.log('🌱 Seeding default menu items...');
      const defaultMenuItems = [
        // 荤菜 (meat)
        {
          id: '1',
          name: '红烧肉',
          category: 'meat',
          price: 28,
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop',
          description: '肥瘦相间，软糯香甜',
          nutrition: '蛋白质丰富，铁质充足',
          available: true,
          preparation_time: 15,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: '宫保鸡丁',
          category: 'meat',
          price: 25,
          image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&h=200&fit=crop',
          description: '酸甜微辣，嫩滑爽口',
          nutrition: '高蛋白低脂',
          available: true,
          preparation_time: 12,
          created_at: new Date().toISOString()
        },
        {
          id: '4',
          name: '糖醋里脊',
          category: 'meat',
          price: 32,
          image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop',
          description: '酸甜可口，外酥内嫩',
          nutrition: '优质蛋白，健脾开胃',
          available: true,
          preparation_time: 18,
          created_at: new Date().toISOString()
        },
        {
          id: '16',
          name: '红烧排骨',
          category: 'meat',
          price: 35,
          image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
          description: '排骨酥烂，酱香浓郁',
          nutrition: '富含钙质与优质蛋白',
          available: true,
          preparation_time: 20,
          created_at: new Date().toISOString()
        },
        // 素菜 (veggie)
        {
          id: '3',
          name: '麻婆豆腐',
          category: 'veggie',
          price: 18,
          image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=200&fit=crop',
          description: '麻辣鲜香，嫩滑可口',
          nutrition: '丰富植物蛋白',
          available: true,
          preparation_time: 10,
          created_at: new Date().toISOString()
        },
        {
          id: '11',
          name: '手撕包菜',
          category: 'veggie',
          price: 15,
          image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&h=200&fit=crop',
          description: '爽脆清甜，香辣开胃',
          nutrition: '富含膳食纤维、维生素C',
          available: true,
          preparation_time: 8,
          created_at: new Date().toISOString()
        },
        {
          id: '17',
          name: '地三鲜',
          category: 'veggie',
          price: 18,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
          description: '土豆茄子青椒，咸鲜下饭',
          nutrition: '多种蔬菜，微量元素丰富',
          available: true,
          preparation_time: 12,
          created_at: new Date().toISOString()
        },
        // 甜点/水果 (dessert_fruit)
        {
          id: '5',
          name: '红豆汤圆',
          category: 'dessert_fruit',
          price: 12,
          image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop',
          description: '软糯香甜，暖心暖胃',
          nutrition: '清心温补，碳水化合物',
          available: true,
          preparation_time: 8,
          created_at: new Date().toISOString()
        },
        {
          id: '6',
          name: '绿豆糕',
          category: 'dessert_fruit',
          price: 15,
          image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=200&fit=crop',
          description: '清香甘甜，细腻消暑',
          nutrition: '维生素B丰富，清热解毒',
          available: true,
          preparation_time: 5,
          created_at: new Date().toISOString()
        },
        {
          id: '7',
          name: '时令水果拼盘',
          category: 'dessert_fruit',
          price: 20,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
          description: '新鲜时令水果大组合',
          nutrition: '维生素C极其丰富',
          available: true,
          preparation_time: 5,
          created_at: new Date().toISOString()
        },
        // 汤 (soup)
        {
          id: '12',
          name: '西红柿鸡蛋汤',
          category: 'soup',
          price: 12,
          image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=200&fit=crop',
          description: '酸甜开胃，色泽诱人',
          nutrition: '番茄红素与卵磷脂',
          available: true,
          preparation_time: 6,
          created_at: new Date().toISOString()
        },
        {
          id: '13',
          name: '排骨玉米汤',
          category: 'soup',
          price: 18,
          image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=300&h=200&fit=crop',
          description: '玉米清甜，排骨酥烂',
          nutrition: '滋补钙质，维生素丰富',
          available: true,
          preparation_time: 12,
          created_at: new Date().toISOString()
        },
        // 主食 (staple)
        {
          id: '14',
          name: '白米饭',
          category: 'staple',
          price: 2,
          image: 'https://images.unsplash.com/photo-1536304997881-a372c179924b?w=300&h=200&fit=crop',
          description: '精选优质大米，香甜软糯',
          nutrition: '提供必备碳水化合物能量',
          available: true,
          preparation_time: 2,
          created_at: new Date().toISOString()
        },
        {
          id: '15',
          name: '手工小馒头',
          category: 'staple',
          price: 3,
          image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop',
          description: '暄软可口，面香浓郁',
          nutrition: '易消化，补益脾胃',
          available: true,
          preparation_time: 2,
          created_at: new Date().toISOString()
        }
      ];

      for (const item of defaultMenuItems) {
        await pool.query(
          `INSERT INTO menu_items (id, name, category, price, image, description, nutrition, available, preparation_time, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [item.id, item.name, item.category, item.price, item.image, item.description, item.nutrition, item.available, item.preparation_time, item.created_at]
        );
      }
    }

    // Seed default students and users if empty
    const studentCheck = await pool.query('SELECT COUNT(*) FROM students');
    if (parseInt(studentCheck.rows[0].count) === 0) {
      console.log('🌱 Seeding default students & users...');
      const defaultStudents = [
        {
          id: 'student-1',
          name: '张杺萌',
          class: '榆林路校区4年2班',
          guardian: '杨妈妈',
          first_order_date: '2023-09-01',
          phone: '13900000001',
          created_at: new Date().toISOString()
        },
        {
          id: 'student-2',
          name: '魏叔叔',
          class: '爱湖里',
          guardian: '张爸爸',
          first_order_date: '-',
          phone: '13800000000',
          created_at: new Date().toISOString()
        }
      ];
      const defaultUsers = [
        {
          id: 'user-1',
          phone: '13900000001',
          password: '$2a$10$8K1p/a0DXx5a8YV5uGjSDeX8s53f18x3f721G481.5Y1Zz72X2mpy', // 123456
          name: '杨妈妈',
          created_at: new Date().toISOString()
        },
        {
          id: 'user-2',
          phone: '13800000000',
          password: '$2a$10$8K1p/a0DXx5a8YV5uGjSDeX8s53f18x3f721G481.5Y1Zz72X2mpy', // 123456
          name: '张爸爸',
          created_at: new Date().toISOString()
        }
      ];

      for (const s of defaultStudents) {
        await pool.query(
          'INSERT INTO students (id, name, class, guardian, first_order_date, phone, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [s.id, s.name, s.class, s.guardian, s.first_order_date, s.phone, s.created_at]
        );
      }
      for (const u of defaultUsers) {
        await pool.query(
          'INSERT INTO users (id, phone, password, name, created_at) VALUES ($1, $2, $3, $4, $5)',
          [u.id, u.phone, u.password, u.name, u.created_at]
        );
      }
    }

    // Seed default system settings if empty
    const settingsCheck = await pool.query('SELECT COUNT(*) FROM system_settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      console.log('🌱 Seeding default system settings...');
      const defaultSettings = {
        wechat: 'dong_teacher_kitchen',
        phone: '139-0000-0001',
        quote: '“每一道菜，都用做给自己孩子的心意去烹饪。” —— 董老师',
        noticeDelivery: '🔹 工作日午餐：11:30 - 12:15 之间配送到校门指定取餐点；\n🔹 工作日晚餐：17:30 - 18:15 之间配送到校门指定取餐点。',
        noticeDiscount: '只要您同时点了一份主食与一份汤品，即可享受套餐特惠：\n💰 一荤两素一饭一汤 = 15元\n💰 两荤一素一饭一汤 = 17元\n💰 三荤一饭一汤 = 20元\n※ 超出套餐以外的菜品或未配齐饭汤将按单价累计，水果甜品始终按单价核算。',
        noticeCancel: '由于食材需每日清晨新鲜采购，如需退订或修改配送信息，请提前一天晚上 20:00 前在“我的订单”中直接取消，系统将即时退回全款。逾期由于备料完成，恕不接受退订，敬请家长谅解。'
      };
      await pool.query(
        'INSERT INTO system_settings (id, data) VALUES ($1, $2)',
        ['1', JSON.stringify(defaultSettings)]
      );
    }

    // Hydrate memory arrays from Neon PG database
    console.log('💧 Hydrating memory arrays from Neon PostgreSQL...');

    // 1. Admins
    const adminsRes = await pool.query('SELECT * FROM admins');
    admins.length = 0;
    admins.push(...adminsRes.rows.map(rowToCamel));

    // 2. Menu Items
    const menuRes = await pool.query('SELECT * FROM menu_items');
    menuItems.length = 0;
    menuItems.push(...menuRes.rows.map(row => {
      const item = rowToCamel(row);
      item.price = parseFloat(item.price);
      return item;
    }));

    // 3. Students
    const studentRes = await pool.query('SELECT * FROM students');
    students.length = 0;
    students.push(...studentRes.rows.map(rowToCamel));

    // 4. Users
    const userRes = await pool.query('SELECT * FROM users');
    users.length = 0;
    users.push(...userRes.rows.map(rowToCamel));

    // 5. Login Logs
    const logRes = await pool.query('SELECT * FROM login_logs');
    loginLogs.length = 0;
    loginLogs.push(...logRes.rows.map(rowToCamel));

    // 6. Daily Menus
    const dailyRes = await pool.query('SELECT * FROM daily_menus');
    dailyMenus.length = 0;
    dailyMenus.push(...dailyRes.rows.map(rowToCamel));

    // 7. Orders
    const orderRes = await pool.query('SELECT * FROM orders');
    orders.length = 0;
    orders.push(...orderRes.rows.map(row => {
      const o = rowToCamel(row);
      o.totalPrice = parseFloat(o.totalPrice);
      if (!o.orderNumber) {
        // 如果旧订单没有订单号，生成一个确定性且合法的订单号以作兼容
        const date = o.createdAt ? new Date(o.createdAt) : new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        // 使用 id 里的数字字符切片作为稳定后缀，保持订单号在重启服务后是一致的
        const suffix = o.id ? o.id.replace(/[^0-9]/g, '').slice(0, 4).padEnd(4, '0') : Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        o.orderNumber = `CC${year}${month}${day}${suffix}`;
      }
      return o;
    }));

    // Rebuild memory statistics
    rebuildStatistics();

    // 8. System Settings
    const settingsRes = await pool.query('SELECT * FROM system_settings WHERE id = $1', ['1']);
    if (settingsRes.rows.length > 0) {
      systemSettings = settingsRes.rows[0].data;
    }

    console.log(`✅ Hydration completed: ${admins.length} admins, ${menuItems.length} menu items, ${students.length} students, ${users.length} users, ${loginLogs.length} logs, ${dailyMenus.length} daily menus, ${orders.length} orders, settings loaded.`);
  } catch (err) {
    console.error('❌ Failed to initialize and hydrate database:', err);
    throw err;
  }
}

// Helper to rebuild statistics in-place
function rebuildStatistics() {
  const popularMap = {};
  orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(item => {
        if (!popularMap[item.id]) {
          popularMap[item.id] = { id: item.id, name: item.name, count: 0 };
        }
        popularMap[item.id].count += item.quantity || 0;
      });
    }
  });

  const popularItems = Object.values(popularMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const today = new Date().toDateString();
  const todayOrders = orders.filter(order => 
    new Date(order.createdAt).toDateString() === today
  );

  statistics.totalOrders = orders.length;
  statistics.totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  statistics.todayOrders = todayOrders.length;
  statistics.todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  statistics.popularItems = popularItems;
  statistics.lastUpdated = new Date().toISOString();
}

// Helper to calculate estimated delivery time
function calculateEstimatedTime(deliveryDate, mealTime) {
  const date = new Date(deliveryDate);
  if (mealTime === 'lunch') {
    date.setHours(12, 0, 0, 0);
  } else {
    date.setHours(18, 30, 0, 0);
  }
  return date.toISOString();
}

// Write-Through Database Operations object
export const db = {
  // 系统设置
  getSettings: () => systemSettings,
  updateSettings: (newSettings) => {
    systemSettings = { ...systemSettings, ...newSettings };
    // Background write to PG
    pool.query(
      'UPDATE system_settings SET data = $1 WHERE id = $2',
      [JSON.stringify(systemSettings), '1']
    ).catch(err => console.error('Error updating system settings in PG:', err));
    return systemSettings;
  },

  // 菜品操作
  getMenuItems: () => menuItems,
  getMenuItemById: (id) => menuItems.find(item => item.id === id),
  addMenuItem: (item) => {
    const newItem = { ...item, id: uuidv4(), createdAt: new Date().toISOString() };
    menuItems.push(newItem);
    
    // Background write to PG
    pool.query(
      `INSERT INTO menu_items (id, name, category, price, image, description, nutrition, available, preparation_time, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [newItem.id, newItem.name, newItem.category, newItem.price, newItem.image, newItem.description, newItem.nutrition, newItem.available, newItem.preparationTime || 10, newItem.createdAt]
    ).catch(err => console.error('Error persisting menu item to PG:', err));

    return newItem;
  },
  updateMenuItem: (id, updates) => {
    const index = menuItems.findIndex(item => item.id === id);
    if (index !== -1) {
      menuItems[index] = { ...menuItems[index], ...updates, updatedAt: new Date().toISOString() };
      const updated = menuItems[index];

      // Background write to PG
      pool.query(
        `UPDATE menu_items 
         SET name = $1, category = $2, price = $3, image = $4, description = $5, nutrition = $6, available = $7, preparation_time = $8, updated_at = $9 
         WHERE id = $10`,
        [updated.name, updated.category, updated.price, updated.image, updated.description, updated.nutrition, updated.available, updated.preparationTime || 10, updated.updatedAt, id]
      ).catch(err => console.error('Error updating menu item in PG:', err));

      return updated;
    }
    return null;
  },
  deleteMenuItem: (id) => {
    const index = menuItems.findIndex(item => item.id === id);
    if (index !== -1) {
      const deleted = menuItems.splice(index, 1)[0];

      // Background write to PG
      pool.query('DELETE FROM menu_items WHERE id = $1', [id])
        .catch(err => console.error('Error deleting menu item from PG:', err));

      return deleted;
    }
    return null;
  },

  // 订单操作
  getOrders: () => orders,
  getOrderById: (id) => orders.find(order => order.id === id),
  addOrder: (order) => {
    const newOrder = {
      ...order,
      id: uuidv4(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedTime: calculateEstimatedTime(order.deliveryDate, order.mealTime)
    };
    orders.push(newOrder);
    
    // Background write to PG
    pool.query(
      `INSERT INTO orders (id, items, total_price, delivery_date, meal_time, address, status, student_id, created_at, updated_at, estimated_time, customer_info, order_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        newOrder.id, 
        JSON.stringify(newOrder.items), 
        newOrder.totalPrice, 
        newOrder.deliveryDate, 
        newOrder.mealTime, 
        newOrder.address, 
        newOrder.status, 
        newOrder.studentId || null, 
        newOrder.createdAt, 
        newOrder.updatedAt || null, 
        newOrder.estimatedTime,
        JSON.stringify(newOrder.customerInfo || {}),
        newOrder.orderNumber
      ]
    ).catch(err => console.error('Error persisting order to PG:', err));

    rebuildStatistics();
    return newOrder;
  },
  updateOrderStatus: (id, status) => {
    const index = orders.findIndex(order => order.id === id);
    if (index !== -1) {
      orders[index].status = status;
      orders[index].updatedAt = new Date().toISOString();
      const updated = orders[index];

      // Background write to PG
      pool.query('UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3', [status, updated.updatedAt, id])
        .catch(err => console.error('Error updating order status in PG:', err));

      return updated;
    }
    return null;
  },

  // 管理员操作
  getAdminByUsername: (username) => admins.find(admin => admin.username === username),
  
  // 学生操作
  getStudents: () => students,
  getStudentById: (id) => students.find(s => s.id === id),
  getStudentsByPhone: (phone) => students.filter(s => s.phone === phone),
  addStudent: (student) => {
    const newStudent = {
      ...student,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    students.push(newStudent);

    // Background write student to PG
    pool.query(
      `INSERT INTO students (id, name, class, guardian, first_order_date, phone, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newStudent.id, newStudent.name, newStudent.class, newStudent.guardian || null, newStudent.firstOrderDate || null, newStudent.phone, newStudent.createdAt]
    ).catch(err => console.error('Error persisting student to PG:', err));
    
    // 如果此手机号在用户列表中还不存在，则顺便自动创建一个关联的用户，方便管理
    const exists = users.some(u => u.phone === student.phone);
    if (!exists && student.phone) {
      const newUser = {
        id: uuidv4(),
        phone: student.phone,
        name: student.guardian || student.name + '的家长',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);

      // Background write user to PG
      pool.query(
        'INSERT INTO users (id, phone, name, created_at) VALUES ($1, $2, $3, $4)',
        [newUser.id, newUser.phone, newUser.name, newUser.createdAt]
      ).catch(err => console.error('Error persisting auto-created user to PG:', err));
    }
    
    return newStudent;
  },
  updateStudent: (id, updates) => {
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      const oldPhone = students[index].phone;
      students[index] = { ...students[index], ...updates, updatedAt: new Date().toISOString() };
      const updated = students[index];

      // Background write student update to PG
      pool.query(
        `UPDATE students 
         SET name = $1, class = $2, guardian = $3, first_order_date = $4, phone = $5, updated_at = $6 
         WHERE id = $7`,
        [updated.name, updated.class, updated.guardian || null, updated.firstOrderDate || null, updated.phone, updated.updatedAt, id]
      ).catch(err => console.error('Error updating student in PG:', err));
      
      // 同步更新关联用户的姓名/手机号
      if (updates.phone && updates.phone !== oldPhone) {
        const userIndex = users.findIndex(u => u.phone === oldPhone);
        if (userIndex !== -1) {
          users[userIndex].phone = updates.phone;
          if (updates.guardian) users[userIndex].name = updates.guardian;
          users[userIndex].updatedAt = new Date().toISOString();
          const updatedUser = users[userIndex];

          // Background write user update to PG
          pool.query(
            'UPDATE users SET phone = $1, name = $2, updated_at = $3 WHERE id = $4',
            [updatedUser.phone, updatedUser.name, updatedUser.updatedAt, updatedUser.id]
          ).catch(err => console.error('Error updating user phone in PG:', err));
        }
      }
      return updated;
    }
    return null;
  },
  deleteStudent: (id) => {
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      const deleted = students.splice(index, 1)[0];

      // Background write to PG
      pool.query('DELETE FROM students WHERE id = $1', [id])
        .catch(err => console.error('Error deleting student from PG:', err));

      return deleted;
    }
    return null;
  },
  importStudents: (studentsList) => {
    const newStudents = studentsList.map(student => ({
      ...student,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    }));
    students.push(...newStudents);
    
    // Background writes
    newStudents.forEach(s => {
      // 1. Write student to PG
      pool.query(
        'INSERT INTO students (id, name, class, guardian, first_order_date, phone, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [s.id, s.name, s.class, s.guardian || null, s.firstOrderDate || null, s.phone, s.createdAt]
      ).catch(err => console.error('Error persisting imported student to PG:', err));

      // 2. Auto-create user if not exists
      const exists = users.some(u => u.phone === s.phone);
      if (!exists && s.phone) {
        const newUser = {
          id: uuidv4(),
          phone: s.phone,
          name: s.guardian || s.name + '的家长',
          createdAt: new Date().toISOString()
        };
        users.push(newUser);

        pool.query(
          'INSERT INTO users (id, phone, name, created_at) VALUES ($1, $2, $3, $4)',
          [newUser.id, newUser.phone, newUser.name, newUser.createdAt]
        ).catch(err => console.error('Error persisting imported student user to PG:', err));
      }
    });
    
    return newStudents;
  },

  // 用户操作
  getUsers: () => users,
  getUserById: (id) => users.find(u => u.id === id),
  getUserByPhone: (phone) => users.find(u => u.phone === phone),
  addUser: (user) => {
    const exists = users.some(u => u.phone === user.phone);
    if (exists) throw new Error('该手机号已注册');
    const newUser = {
      ...user,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    users.push(newUser);

    // Background write to PG
    pool.query(
      'INSERT INTO users (id, phone, password, name, created_at) VALUES ($1, $2, $3, $4, $5)',
      [newUser.id, newUser.phone, newUser.password || null, newUser.name, newUser.createdAt]
    ).catch(err => console.error('Error persisting user to PG:', err));

    return newUser;
  },
  updateUser: (id, updates) => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      if (updates.phone && updates.phone !== users[index].phone) {
        const exists = users.some(u => u.phone === updates.phone);
        if (exists) throw new Error('该手机号已被使用');
      }
      users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
      const updated = users[index];

      // Background write to PG
      pool.query(
        'UPDATE users SET phone = $1, name = $2, updated_at = $3, password = $4 WHERE id = $5',
        [updated.phone, updated.name, updated.updatedAt, updated.password || null, id]
      ).catch(err => console.error('Error updating user in PG:', err));

      return updated;
    }
    return null;
  },
  deleteUser: (id) => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      const deleted = users.splice(index, 1)[0];

      // Background write to PG
      pool.query('DELETE FROM users WHERE id = $1', [id])
        .catch(err => console.error('Error deleting user from PG:', err));

      return deleted;
    }
    return null;
  },

  // 登录日志操作
  getLoginLogs: () => loginLogs,
  addLoginLog: (log) => {
    const newLog = {
      id: uuidv4(),
      ...log,
      loginTime: new Date().toISOString()
    };
    loginLogs.push(newLog);
    // 只保留最近的200条
    if (loginLogs.length > 200) {
      loginLogs.shift();
    }

    // Background write to PG
    pool.query(
      'INSERT INTO login_logs (id, phone, role, login_time, status, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newLog.id, newLog.phone, newLog.role, newLog.loginTime, newLog.status, newLog.ip || null, newLog.userAgent || null]
    ).catch(err => console.error('Error persisting login log to PG:', err));

    return newLog;
  },

  // 每日菜单操作
  getDailyMenus: () => dailyMenus,
  getDailyMenuByDate: (date) => dailyMenus.find(m => m.date === date),
  saveDailyMenu: async (date, dishes, published = true) => {
    const index = dailyMenus.findIndex(m => m.date === date);
    let result;
    if (index !== -1) {
      dailyMenus[index] = {
        ...dailyMenus[index],
        dishes,
        published,
        updatedAt: new Date().toISOString()
      };
      result = dailyMenus[index];
    } else {
      const newDaily = {
        id: uuidv4(),
        date,
        dishes,
        published,
        createdAt: new Date().toISOString()
      };
      dailyMenus.push(newDaily);
      result = newDaily;
    }

    try {
      await pool.query(
        `INSERT INTO daily_menus (id, date, dishes, published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (date) DO UPDATE
         SET dishes = EXCLUDED.dishes, published = EXCLUDED.published, updated_at = EXCLUDED.updated_at`,
        [result.id, result.date, JSON.stringify(result.dishes), result.published, result.createdAt || result.updatedAt, result.updatedAt || null]
      );
    } catch (err) {
      console.error('Error saving daily menu to PG:', err);
      throw err;
    }

    return result;
  },
  deleteDailyMenu: async (id) => {
    const index = dailyMenus.findIndex(m => m.id === id);
    if (index !== -1) {
      const deleted = dailyMenus.splice(index, 1)[0];

      try {
        await pool.query('DELETE FROM daily_menus WHERE id = $1', [id]);
      } catch (err) {
        console.error('Error deleting daily menu from PG:', err);
        throw err;
      }

      return deleted;
    }
    return null;
  },

  // 统计数据
  getStatistics: () => {
    rebuildStatistics();
    return statistics;
  },

  // 系统管理员用户操作 (System Admins Crud)
  getAdmins: () => admins,
  getAdminById: (id) => admins.find(a => a.id === id),
  addAdmin: (adminData) => {
    const exists = admins.some(a => a.username === adminData.username);
    if (exists) throw new Error('该账号名已存在');
    const newAdmin = {
      ...adminData,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    admins.push(newAdmin);

    // Background write to PG
    pool.query(
      'INSERT INTO admins (id, username, password, name, role, email, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newAdmin.id, newAdmin.username, newAdmin.password, newAdmin.name, newAdmin.role, newAdmin.email || null, newAdmin.createdAt]
    ).catch(err => console.error('Error persisting admin to PG:', err));

    return newAdmin;
  },
  updateAdmin: (id, updates) => {
    const index = admins.findIndex(a => a.id === id);
    if (index !== -1) {
      if (updates.username && updates.username !== admins[index].username) {
        const exists = admins.some(a => a.username === updates.username);
        if (exists) throw new Error('该账号名已存在');
      }
      admins[index] = { ...admins[index], ...updates };
      const updated = admins[index];

      // Background write to PG
      pool.query(
        'UPDATE admins SET username = $1, password = $2, name = $3, role = $4, email = $5 WHERE id = $6',
        [updated.username, updated.password, updated.name, updated.role, updated.email || null, id]
      ).catch(err => console.error('Error updating admin in PG:', err));

      return updated;
    }
    return null;
  },
  deleteAdmin: (id) => {
    const index = admins.findIndex(a => a.id === id);
    if (index !== -1) {
      const deleted = admins.splice(index, 1)[0];

      // Background write to PG
      pool.query('DELETE FROM admins WHERE id = $1', [id])
        .catch(err => console.error('Error deleting admin from PG:', err));

      return deleted;
    }
    return null;
  }
};
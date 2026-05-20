import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../data/database.js';
import { generateToken, verifyToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 管理员登录
router.post('/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      db.addLoginLog({ phone: username || 'empty', role: 'admin', status: 'failed', ip, userAgent });
      // 检查是否是HTML表单提交
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.status(400).send(`
          <html>
            <head><title>登录失败</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2>❌ 登录失败</h2>
              <p>用户名和密码不能为空</p>
              <a href="/admin/pure-html-login.html" style="color: #007bff;">返回登录页面</a>
            </body>
          </html>
        `);
      }
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }
    
    // 查找管理员
    const admin = db.getAdminByUsername(username);
    if (!admin) {
      db.addLoginLog({ phone: username, role: 'admin', status: 'failed', ip, userAgent });
      // 检查是否是HTML表单提交
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.status(401).send(`
          <html>
            <head><title>登录失败</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2>❌ 登录失败</h2>
              <p>用户名或密码错误</p>
              <a href="/admin/pure-html-login.html" style="color: #007bff;">返回登录页面</a>
            </body>
          </html>
        `);
      }
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      db.addLoginLog({ phone: username, role: 'admin', status: 'failed', ip, userAgent });
      // 检查是否是HTML表单提交
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.status(401).send(`
          <html>
            <head><title>登录失败</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2>❌ 登录失败</h2>
              <p>用户名或密码错误</p>
              <a href="/admin/pure-html-login.html" style="color: #007bff;">返回登录页面</a>
            </body>
          </html>
        `);
      }
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 生成JWT token
    const token = generateToken({ 
      id: admin.id, 
      username: admin.username, 
      role: admin.role 
    });
    
    // 返回用户信息（不包含密码）
    const { password: _, ...adminInfo } = admin;
    
    // 记录成功登录日志
    db.addLoginLog({ phone: username, role: 'admin', status: 'success', ip, userAgent });
    
    // 检查是否是HTML表单提交
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      // HTML表单提交，返回成功页面
      return res.send(`
        <html>
          <head>
            <title>登录成功</title>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f8f9fa;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
              <h2 style="color: #28a745;">✅ 登录成功！</h2>
              <p>登录成功！正在跳转到管理后台...</p>
              <p><a href="/admin/no-js-dashboard.html">如果没有自动跳转，请点击这里</a></p>
              <p><a href="/api/health">查看API数据</a></p>
              <script>
                  setTimeout(() => {
                      window.location.href = '/admin/no-js-dashboard.html';
                  }, 2000);
              </script>
              <script>
                // 保存token到localStorage（如果JavaScript可用）
                try {
                  localStorage.setItem('adminToken', '${token}');
                  console.log('Token已保存到localStorage');
                } catch(e) {
                  console.log('无法保存token:', e);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }
    
    // JSON API响应
    res.json({
      success: true,
      message: '登录成功',
      data: {
        admin: adminInfo,
        token
      }
    });
  } catch (error) {
    db.addLoginLog({ phone: req.body.username || 'unknown', role: 'admin', status: 'failed', ip, userAgent });
    // 检查是否是HTML表单提交
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      return res.status(500).send(`
        <html>
          <head><title>服务器错误</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>❌ 服务器错误</h2>
            <p>登录失败: ${error.message}</p>
            <a href="/admin/pure-html-login.html" style="color: #007bff;">返回登录页面</a>
          </body>
        </html>
      `);
    }
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});



// 模拟存储验证码的内存对象
const verificationCodes = {};

// 获取短信验证码
router.post('/send-code', (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的手机号'
      });
    }

    // 检查手机号是否在系统中存在
    const students = db.getStudentsByPhone(phone);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: '该手机号未绑定任何学生，请联系管理员'
      });
    }

    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[phone] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟有效期
    };

    // 模拟发送短信
    console.log(`\n============================`);
    console.log(`📩 【模拟短信发送】`);
    console.log(`发送至: ${phone}`);
    console.log(`验证码: ${code}`);
    console.log(`有效期: 5分钟`);
    console.log(`============================\n`);

    res.json({
      success: true,
      message: '验证码发送成功（模拟环境请看控制台打印）'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '发送验证码失败',
      error: error.message
    });
  }
});

// 家长手机号登录
router.post('/phone-login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  try {
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      db.addLoginLog({ phone: phone || 'empty', role: 'parent', status: 'failed', ip, userAgent });
      return res.status(400).json({
        success: false,
        message: '手机号和验证码不能为空'
      });
    }

    // 万能验证码（为了方便演示和测试）
    if (code !== '888888') {
      // 真实验证码校验
      const verification = verificationCodes[phone];
      if (!verification) {
        db.addLoginLog({ phone, role: 'parent', status: 'failed', ip, userAgent });
        return res.status(400).json({
          success: false,
          message: '请先获取验证码'
        });
      }

      if (Date.now() > verification.expiresAt) {
        db.addLoginLog({ phone, role: 'parent', status: 'failed', ip, userAgent });
        delete verificationCodes[phone];
        return res.status(400).json({
          success: false,
          message: '验证码已过期，请重新获取'
        });
      }

      if (verification.code !== code) {
        db.addLoginLog({ phone, role: 'parent', status: 'failed', ip, userAgent });
        return res.status(400).json({
          success: false,
          message: '验证码错误'
        });
      }
    }

    // 获取绑定的学生列表
    const students = db.getStudentsByPhone(phone);
    if (students.length === 0) {
      db.addLoginLog({ phone, role: 'parent', status: 'failed', ip, userAgent });
      return res.status(404).json({
        success: false,
        message: '未找到绑定的学生记录'
      });
    }

    // 验证成功，删除验证码
    delete verificationCodes[phone];

    // 生成家长端 JWT token
    const token = generateToken({ 
      phone,
      role: 'parent' 
    });

    // 记录成功登录日志
    db.addLoginLog({ phone, role: 'parent', status: 'success', ip, userAgent });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        students
      }
    });
  } catch (error) {
    db.addLoginLog({ phone: req.body.phone || 'unknown', role: 'parent', status: 'failed', ip, userAgent });
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});

// 家长密码登录
router.post('/parent-login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      db.addLoginLog({ phone: phone || 'empty', role: 'parent', status: 'failed', ip, userAgent });
      return res.status(400).json({
        success: false,
        message: '手机号和密码不能为空'
      });
    }

    // 查找用户
    const user = db.getUserByPhone(phone);
    if (!user) {
      db.addLoginLog({ phone, role: 'parent', status: 'failed', ip, userAgent });
      return res.status(401).json({
        success: false,
        message: '该手机号未注册，请先注册并关联学生'
      });
    }

    // 验证密码
    let isValidPassword = false;
    if (!user.password) {
      // 允许使用默认密码 123456 登录未设置密码的旧导入用户
      isValidPassword = (password === '123456');
    } else {
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      db.addLoginLog({ phone, role: 'parent', status: 'failed', ip, userAgent });
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    // 获取绑定的学生列表
    const students = db.getStudentsByPhone(phone);

    // 生成家长端 JWT token
    const token = generateToken({ 
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: 'parent' 
    });

    // 记录成功登录日志
    db.addLoginLog({ phone, role: 'parent', status: 'success', ip, userAgent });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, phone: user.phone, name: user.name },
        students
      }
    });
  } catch (error) {
    db.addLoginLog({ phone: req.body.phone || 'unknown', role: 'parent', status: 'failed', ip, userAgent });
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});

// 家长注册接口
router.post('/parent-register', async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    if (!phone || !name || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号、姓名和密码不能为空'
      });
    }

    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的11位手机号'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为6位'
      });
    }

    // 检查是否已存在此手机号的用户
    const existingUser = db.getUserByPhone(phone);
    if (existingUser) {
      // 如果已存在且已经有密码，则提示已存在
      if (existingUser.password) {
        return res.status(400).json({
          success: false,
          message: '该手机号已注册，可以直接登录'
        });
      }
      
      // 如果已存在但没有密码（例如后台导入的），则为该用户设置密码和姓名
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const updated = db.updateUser(existingUser.id, {
        name,
        password: hashedPassword
      });

      return res.json({
        success: true,
        message: '激活账户并设置密码成功，请返回登录',
        data: updated
      });
    }

    // 如果完全不存在此用户，则新建用户
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = db.addUser({
      phone,
      name,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: '注册成功，请进行登录',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '注册失败: ' + error.message
    });
  }
});

// 验证当前token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token有效',
    data: {
      user: req.user
    }
  });
});

// 退出登录
router.post('/logout', authenticateToken, (req, res) => {
  // 在实际应用中，可以将token加入黑名单
  res.json({
    success: true,
    message: '退出登录成功'
  });
});

export default router;
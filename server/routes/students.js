import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { db } from '../data/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 所有管理员路由都需要身份验证
router.use(authenticateToken);

// 获取所有学生列表
router.get('/', (req, res) => {
  try {
    const { class: studentClass, guardian, search, page = 1, limit = 20 } = req.query;
    let students = db.getStudents();
    
    // 筛选
    if (studentClass) {
      students = students.filter(s => s.class === studentClass);
    }
    if (guardian) {
      students = students.filter(s => s.guardian === guardian);
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      students = students.filter(s => 
        s.name.toLowerCase().includes(lowerSearch) || 
        (s.phone && s.phone.includes(lowerSearch))
      );
    }
    
    // 排序：按创建时间倒序
    students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedStudents = students.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedStudents,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: students.length,
        totalPages: Math.ceil(students.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取学生列表失败',
      error: error.message
    });
  }
});

// 添加学生
router.post('/', (req, res) => {
  try {
    const { name, class: studentClass, guardian, phone, firstOrderDate } = req.body;
    
    if (!name || !studentClass || !phone) {
      return res.status(400).json({
        success: false,
        message: '姓名、班级和手机号不能为空'
      });
    }
    
    // 手机号简单校验
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }
    
    const newStudent = db.addStudent({
      name,
      class: studentClass,
      guardian: guardian || '',
      phone,
      firstOrderDate: firstOrderDate || '-'
    });
    
    res.status(201).json({
      success: true,
      message: '学生添加成功',
      data: newStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加学生失败',
      error: error.message
    });
  }
});

// 更新学生信息
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.phone && !/^1\d{10}$/.test(updates.phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }
    
    const updatedStudent = db.updateStudent(id, updates);
    
    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }
    
    res.json({
      success: true,
      message: '学生信息更新成功',
      data: updatedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新学生信息失败',
      error: error.message
    });
  }
});

// 删除学生
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = db.deleteStudent(id);
    
    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }
    
    res.json({
      success: true,
      message: '学生删除成功',
      data: deletedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除学生失败',
      error: error.message
    });
  }
});

// Excel 导入学生
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const studentsToImport = [];
    const errors = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // 数据行从第2行开始
      // 提取字段（兼容列名可能包含的空格）
      const name = row['姓名'] || row['姓名 '];
      const studentClass = row['学校、年级班级'] || row['学校/年级班级'] || row['班级'];
      const guardian = row['负责人'];
      const firstOrderDate = row['首次订餐日'];
      const phone = row['手机号'];

      if (!name || !studentClass) {
        errors.push(`第 ${rowNum} 行：姓名和班级为必填项`);
        return;
      }

      // 如果手机号存在则校验格式
      const phoneStr = phone ? String(phone).trim() : '';
      if (phoneStr && !/^1\d{10}$/.test(phoneStr)) {
        errors.push(`第 ${rowNum} 行：手机号格式不正确 (${phoneStr})`);
        return;
      }

      studentsToImport.push({
        name: name.trim(),
        class: studentClass.trim(),
        guardian: guardian ? String(guardian).trim() : '',
        firstOrderDate: firstOrderDate ? String(firstOrderDate).trim() : '-',
        phone: phoneStr
      });
    });

    if (studentsToImport.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '未解析到有效的学生数据，全部校验失败',
        errors: errors
      });
    } else if (studentsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未解析到学生数据，请检查模板格式是否正确',
      });
    }

    const importedStudents = db.importStudents(studentsToImport);

    res.json({
      success: true,
      message: `导入成功 ${importedStudents.length} 条记录` + (errors.length > 0 ? `，失败 ${errors.length} 条` : ''),
      data: importedStudents,
      errors: errors
    });
  } catch (error) {
    console.error('导入Excel错误:', error);
    res.status(500).json({
      success: false,
      message: 'Excel文件解析失败',
      error: error.message
    });
  }
});

// 下载导入模板
router.get('/template', (req, res) => {
  try {
    const templateData = [
      {
        '姓名': '张三（示例）',
        '学校/年级班级': '榆林路校区4年2班',
        '负责人': '张妈妈',
        '手机号': '13900000001',
        '首次订餐日': '2026-01-15'
      },
      {
        '姓名': '',
        '学校/年级班级': '',
        '负责人': '',
        '手机号': '',
        '首次订餐日': ''
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 15 },  // 姓名
      { wch: 25 },  // 学校/年级班级
      { wch: 12 },  // 负责人
      { wch: 15 },  // 手机号
      { wch: 15 },  // 首次订餐日
    ];

    xlsx.utils.book_append_sheet(wb, ws, '学生信息');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buf));
  } catch (error) {
    console.error('生成模板失败:', error);
    res.status(500).json({
      success: false,
      message: '生成模板失败',
      error: error.message
    });
  }
});

export default router;

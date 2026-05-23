import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { 
  User, 
  Smartphone, 
  Calendar, 
  GraduationCap, 
  Heart, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AddStudent: React.FC = () => {
  const navigate = useNavigate();
  const { userToken, currentUser, setStudents, setCurrentStudentId } = useStore();
  
  // 表单状态
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [guardian, setGuardian] = useState('');
  const [phone, setPhone] = useState('');
  const [firstOrderDate, setFirstOrderDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 必须登录才能访问，否则强行重定向到登录页
  useEffect(() => {
    if (!userToken) {
      toast.error('请先登录家长账号以绑定宝贝信息');
      navigate('/login');
      return;
    }
    
    // 默认预填家长手机号和姓名
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setGuardian(currentUser.name || '');
    }

    // 异步自动获取服务器当天日期作为默认首次订餐日期
    const fetchServerDate = async () => {
      try {
        const res = await api.auth.getServerDate();
        if (res && res.date) {
          setFirstOrderDate(res.date);
        } else {
          throw new Error('服务器未返回有效日期');
        }
      } catch (err) {
        console.warn('⚠️ 自动获取服务器时间失败，已降级启用客户端本地时间：', err);
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setFirstOrderDate(`${year}-${month}-${day}`);
      }
    };

    fetchServerDate();
  }, [userToken, currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 前端严格校验
    if (!name.trim()) {
      setError('请输入宝贝姓名');
      return;
    }
    if (!studentClass.trim()) {
      setError('请输入学校及年级班级');
      return;
    }
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入合法的11位家长手机号');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.addStudent({
        name: name.trim(),
        class: studentClass.trim(),
        guardian: guardian.trim() || currentUser?.name || '家长',
        phone: phone.trim(),
        firstOrderDate: firstOrderDate || undefined
      });

      // 自动更新 Zustand Store 缓存的学生列表
      setStudents(data.students);
      
      // 智能激活选中刚才新增的这只宝贝，提供极致顺滑的产品体验
      if (data.student && data.student.id) {
        setCurrentStudentId(data.student.id);
      }

      toast.success('🎉 宝贝绑定成功，已为您智能设置为当前就餐人！');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定宝贝失败，请检查输入项');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div className="max-w-md mx-auto bg-white min-h-screen w-full flex flex-col justify-between shadow-md pb-8">
        <div>
          <Navbar title="绑定新宝贝" showBack={true} showCart={false} />
          
          {/* 高档渐变头图，凸显专业温馨气质 */}
          <div className="bg-gradient-to-br from-purple-500 via-indigo-500 to-indigo-600 text-white px-6 py-8 text-center rounded-b-[2rem] shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
            <div className="text-5xl mb-3 transform hover:scale-110 transition-transform duration-300 inline-block">🧒</div>
            <h2 className="text-xl font-bold tracking-wide">宝贝成长档案录入</h2>
            <p className="text-purple-100 text-xs mt-1">录入学生信息，即可享受小厨房智能菜品配送服务</p>
          </div>

          <div className="px-6 py-6">
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs flex items-center space-x-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. 宝贝姓名 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">宝贝姓名 *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="请输入就餐学生的姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 focus:bg-white text-sm rounded-xl focus:outline-none transition-all placeholder:text-gray-400 text-gray-800 font-medium"
                  />
                </div>
              </div>

              {/* 2. 学校及年级班级 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">所属学校/年级班级 *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="例如：榆林路校区4年2班"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 focus:bg-white text-sm rounded-xl focus:outline-none transition-all placeholder:text-gray-400 text-gray-800 font-medium"
                  />
                </div>
              </div>

              {/* 3. 家长姓名 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">监护人/负责人姓名</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Heart className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="请输入家长姓名"
                    value={guardian}
                    onChange={(e) => setGuardian(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 focus:bg-white text-sm rounded-xl focus:outline-none transition-all placeholder:text-gray-400 text-gray-800 font-medium"
                  />
                </div>
              </div>

              {/* 4. 家长手机号 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">联系家长手机号 *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    placeholder="请输入11位家长手机号码"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 focus:bg-white text-sm rounded-xl focus:outline-none transition-all placeholder:text-gray-400 text-gray-800 font-medium font-mono"
                  />
                </div>
                <span className="text-[10px] text-gray-400 ml-1.5 mt-1 block">
                  💡 注意：学生将自动绑定到此手机号下的家长账号。
                </span>
              </div>

              {/* 5. 首次订餐日 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">首次订餐日期 (可选)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={firstOrderDate}
                    onChange={(e) => setFirstOrderDate(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 focus:bg-white text-sm rounded-xl focus:outline-none transition-all text-gray-800 font-medium"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center space-x-1.5 active:scale-98"
                >
                  <span>{loading ? '正在绑定中...' : '提交绑定新宝贝'}</span>
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* 底部保障小贴士 */}
        <div className="px-6 mt-2">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-700">董老师小厨房安全保障</h4>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                我们十分重视宝贝的信息安全与就餐体验，录入的学生信息仅用于配送校验与配餐安排，董老师将以最高标准呵护宝贝的每餐健康。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStudent;

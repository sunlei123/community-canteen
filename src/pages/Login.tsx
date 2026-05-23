import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Smartphone, Lock, AlertCircle, CheckCircle2, User, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUserToken, setStudents, setCurrentStudentId, setCurrentUser } = useStore();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // 登录表单状态
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // 注册表单状态
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 登录提交处理
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的11位手机号码');
      return;
    }
    if (!password || password.length < 6) {
      setError('请输入至少6位的密码');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.parentLogin(phone, password);
      setUserToken(data.token);
      setCurrentUser(data.user);
      setStudents(data.students);
      if (data.students && data.students.length > 0) {
        setCurrentStudentId(data.students[0].id);
      }
      setSuccess('登录成功！正在跳转到订餐大厅...');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查手机号或密码');
    } finally {
      setLoading(false);
    }
  };

  // 注册提交处理
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setError('请输入您的姓名');
      return;
    }
    if (!regPhone || !/^1[3-9]\d{9}$/.test(regPhone)) {
      setError('请输入正确的11位手机号码');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('密码长度至少为6位');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // 1. 注册/激活账号
      const regRes = await api.auth.parentRegister(regPhone, regName.trim(), regPassword);
      setSuccess(regRes.message || '注册成功！正在为您自动登录...');
      
      // 2. 注册成功后自动执行登录，提供极简流畅体验
      setTimeout(async () => {
        try {
          const data = await api.auth.parentLogin(regPhone, regPassword);
          setUserToken(data.token);
          setCurrentUser(data.user);
          setStudents(data.students);
          if (data.students && data.students.length > 0) {
            setCurrentStudentId(data.students[0].id);
          }
          setSuccess('自动登录成功！正在进入订餐页面...');
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } catch (loginErr) {
          // 自动登录失败则切换到登录页并填入手机号
          setPhone(regPhone);
          setActiveTab('login');
          setError('注册成功，请使用刚设置的密码登录');
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请检查输入或更换手机号');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div className="max-w-md mx-auto bg-white min-h-screen w-full flex flex-col justify-between shadow-md">
        <div>
          <Navbar title="家长订餐系统" showBack={true} showCart={false} />
          
          {/* 渐变装饰头图 */}
          <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white px-6 py-10 text-center rounded-b-[2rem] shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
            <div className="text-6xl mb-4 transform hover:scale-110 transition-transform duration-300 inline-block">🍳</div>
            <h2 className="text-2xl font-bold tracking-wide">董老师小厨房</h2>
            <p className="text-orange-100 text-xs mt-1">用心做菜 · 健康膳食 · 家长放心的订餐接龙</p>
          </div>

          <div className="px-6 py-6">
            {/* 炫酷的双模式切换 Tabs */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 shadow-inner relative">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 z-10",
                  activeTab === 'login'
                    ? "bg-white text-orange-600 shadow-md transform scale-102"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                密码登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 z-10",
                  activeTab === 'register'
                    ? "bg-white text-orange-600 shadow-md transform scale-102"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                家长注册 / 激活
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 backdrop-blur-md bg-white/90 transition-all duration-500">
              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs flex items-center space-x-2 animate-shake mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 成功提示 */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-xs flex items-center space-x-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* 1. 登录表单 */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 text-center mb-2">欢迎回来</h3>
                  
                  {/* 手机号 */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block">手机号码</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <input
                        type="tel"
                        placeholder="请输入您的手机号码"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* 密码 */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block">登录密码</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        placeholder="请输入登录密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  <Button
                    type="submit"
                    disabled={loading || phone.length !== 11 || password.length < 6}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-md hover:from-orange-600 hover:to-red-600 active:scale-95 transition-all mt-4 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:scale-100 flex justify-center items-center space-x-1"
                  >
                    <span>{loading ? '正在验证登录...' : '安 全 登 录'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </form>
              )}

              {/* 2. 注册与激活表单 */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="text-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">新家长注册</h3>
                    <p className="text-gray-400 text-[10px] mt-0.5">如您在后台已有学生信息，直接用对应手机号注册即可完成绑定激活</p>
                  </div>
                  
                  {/* 家长姓名 */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block">家长姓名</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="例如：张妈妈 / 李爸爸"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* 手机号码 */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block">手机号码</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <input
                        type="tel"
                        placeholder="请输入手机号码（用于登录）"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* 密码 */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block">登录密码 (至少6位)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        placeholder="请设置您的登录密码"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* 确认密码 */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block">确认密码</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        placeholder="请再次输入密码以确认"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  <Button
                    type="submit"
                    disabled={loading || regPhone.length !== 11 || regPassword.length < 6 || regConfirmPassword.length < 6 || !regName}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-md hover:from-orange-600 hover:to-red-600 active:scale-95 transition-all mt-4 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:scale-100 flex justify-center items-center space-x-1"
                  >
                    <span>{loading ? '正在提交注册...' : '注 册 并 自 动 登 录'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </form>
              )}
            </div>
            
            {/* 温馨提示 */}
            <div className="mt-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <p className="font-semibold text-gray-700">💡 温馨测试小贴士：</p>
              <p>1. <b>测试账号</b>：系统已为您内置测试家长账号（如手机号 <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">13900000001</code> 或 <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">13800000000</code>），默认初始密码为 <code className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded font-mono font-bold">123456</code>。</p>
              <p>2. <b>自动匹配机制</b>：只要注册时填写的手机号与后台学生列表绑定的手机号一致，登录后即可秒速同步载入您家孩子的姓名与班级信息，开始订餐接龙！</p>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center py-6 text-xs text-gray-400 px-6 border-t border-gray-100 mt-8">
          <p>© 2026 董老师小厨房. All rights reserved.</p>
          <p className="mt-1">用心呵护每个孩子的健康成长</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

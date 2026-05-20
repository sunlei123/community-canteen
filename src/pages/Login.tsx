import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Smartphone, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUserToken, setStudents, setCurrentStudentId } = useStore();
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 验证码倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的11位手机号码');
      return;
    }
    
    setError(null);
    setSending(true);
    try {
      await api.auth.sendCode(phone);
      setSuccess('验证码已发送，测试环境下可输入 888888 快速登录');
      setCountdown(60);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败，请重试');
    } finally {
      setSending(false);
    }
  };

  // 登录提交
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的11位手机号码');
      return;
    }
    if (!code || code.length !== 6) {
      setError('请输入6位数字验证码');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.phoneLogin(phone, code);
      setUserToken(data.token);
      setStudents(data.students);
      if (data.students && data.students.length > 0) {
        setCurrentStudentId(data.students[0].id);
      }
      setSuccess('登录成功！正在跳转...');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查验证码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div className="max-w-md mx-auto bg-white min-h-screen w-full flex flex-col justify-between shadow-md">
        <div>
          <Navbar title="家长独立登录" showBack={true} showCart={false} />
          
          {/* 渐变装饰头图 */}
          <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white px-6 py-10 text-center rounded-b-[2rem] shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
            <div className="text-6xl mb-4 transform hover:scale-110 transition-transform duration-300 inline-block">🍳</div>
            <h2 className="text-2xl font-bold tracking-wide">董老师小厨房</h2>
            <p className="text-orange-100 text-xs mt-1">家长的安心之选 · 用餐省心 · 营养相随</p>
          </div>

          <div className="px-6 py-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 backdrop-blur-md bg-white/90">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">快捷电话登录</h3>
              
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-xs flex items-center space-x-2 animate-pulse">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 成功提示 */}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {/* 手机号输入框 */}
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

                {/* 验证码输入框 */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 block">短信验证码</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-3.5 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="请输入6位验证码"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-mono tracking-widest text-center"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || sending || loading}
                      className={cn(
                        "px-4 text-xs font-semibold rounded-xl border transition-all min-w-[110px]",
                        countdown > 0
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                      )}
                    >
                      {countdown > 0 ? `${countdown}s 后重新发送` : sending ? '发送中...' : '发送验证码'}
                    </button>
                  </div>
                </div>

                {/* 登录按钮 */}
                <Button
                  type="submit"
                  disabled={loading || phone.length !== 11 || code.length !== 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-md hover:from-orange-600 hover:to-red-600 active:scale-95 transition-all mt-4 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {loading ? '正在登录...' : '立 即 登 录 ➔'}
                </Button>
              </form>
            </div>
            
            {/* 温馨提示 */}
            <div className="mt-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <p className="font-semibold text-gray-700">💡 温馨测试小贴士：</p>
              <p>1. 您可以输入数据库已有的测试家长手机号（如 <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">13900000001</code> 或 <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">13800000000</code>），即可同步载入关联的学生信息。</p>
              <p>2. 测试环境下，验证码默认将打印在服务端的后台控制台。您也可以直接输入万能快捷码 <code className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded font-mono font-bold">888888</code> 直接通过验证登录。</p>
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

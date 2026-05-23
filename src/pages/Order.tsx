import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, UserCheck, KeyRound, Smartphone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MealTime, Address } from '../types';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { toast } from 'sonner';

const Order: React.FC = () => {
  const navigate = useNavigate();
  const { 
    cartItems, getTotalPrice, setDeliveryInfo, setAddress, submitOrder, setOrderSubmitting,
    userToken, students, currentStudentId, setUserToken, setCurrentUser, setStudents, setCurrentStudentId, logout
  } = useStore();
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime | ''>('');
  const [address, setAddressState] = useState<Address>({
    street: '',
    building: '',
    room: '',
    phone: '',
    note: ''
  });

  const totalPrice = getTotalPrice();

  // 生成未来7天的日期选项
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const displayStr = i === 0 ? '今天' : i === 1 ? '明天' : 
        `${date.getMonth() + 1}月${date.getDate()}日`;
      
      dates.push({ value: dateStr, label: displayStr });
    }
    
    return dates;
  };

  const dateOptions = getDateOptions();
  const mealTimeOptions = [
    { value: MealTime.LUNCH, label: '午餐 (11:30-13:30)', icon: '☀️' },
    { value: MealTime.DINNER, label: '晚餐 (17:30-19:30)', icon: '🌙' }
  ];

  const handleAddressChange = (field: keyof Address, value: string) => {
    setAddressState(prev => ({ ...prev, [field]: value }));
  };

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }
    
    try {
      setIsSendingCode(true);
      await api.auth.sendCode(phone);
      toast.success('验证码发送成功（模拟环境请看后端控制台，或输入 888888）');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || '发送验证码失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleLogin = async () => {
    if (!phone || !code) {
      toast.error('请输入手机号和验证码');
      return;
    }

    try {
      setIsLoggingIn(true);
      const data = await api.auth.phoneLogin(phone, code);
      setUserToken(data.token);
      setCurrentUser(data.user);
      setStudents(data.students);
      if (data.students.length > 0) {
        setCurrentStudentId(data.students[0].id);
      }
      toast.success('登录成功');
    } catch (error: any) {
      toast.error(error.message || '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const validateForm = () => {
    if (!userToken || !currentStudentId) {
      toast.error('请先登录并选择订餐学生');
      return false;
    }
    if (!selectedDate) {
      toast.error('请选择配送日期');
      return false;
    }
    
    if (!selectedMealTime) {
      toast.error('请选择用餐时段');
      return false;
    }
    
    if (!address.street.trim()) {
      toast.error('请填写详细地址');
      return false;
    }
    
    if (!address.phone.trim()) {
      toast.error('请填写联系电话');
      return false;
    }
    
    // 简单的手机号验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(address.phone.trim())) {
      toast.error('请填写正确的手机号码');
      return false;
    }
    
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;
    
    setOrderSubmitting(true);
    
    try {
      // 设置配送信息
      setDeliveryInfo(selectedDate, selectedMealTime as MealTime);
      setAddress(address);
      
      // 提交订单
      const orderId = await submitOrder();
      
      toast.success('订单提交成功！');
      navigate('/success');
    } catch (error) {
      toast.error('订单提交失败，请重试');
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white min-h-screen">
          <Navbar title="订单配置" showBack={true} />
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🥡</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              购物车为空
            </h3>
            <p className="text-gray-500 mb-6">
              请先选择菜品再进行下单
            </p>
            <Button onClick={() => navigate('/menu')}>
              去选餐
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Navbar title="订单配置" showBack={true} />
        
        <div className="p-4 space-y-6">
          {/* 订单摘要 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🍱</span>
                订单摘要
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.food.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.food.name} × {item.quantity}
                    </span>
                    <span className="text-gray-800">
                      ¥{(item.food.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>总计</span>
                    <span className="text-orange-600">¥{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 账号与学生选择 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-800 flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                订餐人信息
              </h3>
            </CardHeader>
            <CardContent>
              {!userToken ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Smartphone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="请输入家长手机号"
                        className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyRound className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="输入验证码"
                          className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleSendCode} 
                        disabled={countdown > 0 || isSendingCode}
                        className="whitespace-nowrap"
                      >
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? '登录中...' : '登录验证'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">已绑定手机号：{phone || '当前账号'}</span>
                    <button onClick={logout} className="text-sm text-blue-600 hover:text-blue-800">切换账号</button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择订餐学生</label>
                    <div className="space-y-2">
                      {students.map(student => (
                        <div 
                          key={student.id}
                          onClick={() => setCurrentStudentId(student.id)}
                          className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center ${
                            currentStudentId === student.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <span className="font-medium text-gray-900">{student.name}</span>
                            <span className="ml-2 text-sm text-gray-500">{student.class}</span>
                          </div>
                          {currentStudentId === student.id && (
                            <span className="text-orange-500">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 配送时间选择 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                选择配送时间
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 日期选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配送日期
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {dateOptions.map((date) => (
                    <Button
                      key={date.value}
                      variant={selectedDate === date.value ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedDate(date.value)}
                      className="text-xs"
                    >
                      {date.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* 用餐时段选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用餐时段
                </label>
                <div className="space-y-2">
                  {mealTimeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedMealTime === option.value ? 'primary' : 'outline'}
                      onClick={() => setSelectedMealTime(option.value)}
                      className="w-full justify-start"
                    >
                      <span className="mr-2">{option.icon}</span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 配送地址 */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-800 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                配送地址
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  详细地址 *
                </label>
                <textarea
                  value={address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="请输入详细地址，如：XX路XX号XX小区"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    楼栋号
                  </label>
                  <input
                    type="text"
                    value={address.building}
                    onChange={(e) => handleAddressChange('building', e.target.value)}
                    placeholder="如：3栋"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    房间号
                  </label>
                  <input
                    type="text"
                    value={address.room}
                    onChange={(e) => handleAddressChange('room', e.target.value)}
                    placeholder="如：1201"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  联系电话 *
                </label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                  placeholder="请输入手机号码"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注信息
                </label>
                <input
                  type="text"
                  value={address.note}
                  onChange={(e) => handleAddressChange('note', e.target.value)}
                  placeholder="如：门口放置、联系门卫等"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 提交按钮 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleSubmitOrder}
              className="w-full"
              size="lg"
              disabled={useStore.getState().isOrderSubmitting}
            >
              {useStore.getState().isOrderSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  提交中...
                </>
              ) : (
                `确认下单 ¥${totalPrice.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>

        {/* 底部间距 */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default Order;
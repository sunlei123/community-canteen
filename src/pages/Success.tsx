import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, MapPin } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MealTime } from '../types';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrder, clearOrder } = useStore();
  const [showAnimation, setShowAnimation] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState('');

  useEffect(() => {
    // 如果没有订单信息，跳转到首页
    if (!currentOrder) {
      navigate('/');
      return;
    }

    // 计算预计送达时间
    const calculateEstimatedTime = () => {
      if (!currentOrder.deliveryDate || !currentOrder.mealTime) return '';
      
      const deliveryDate = new Date(currentOrder.deliveryDate);
      const today = new Date();
      
      let timeRange = '';
      if (currentOrder.mealTime === MealTime.LUNCH) {
        timeRange = '11:30-13:30';
      } else {
        timeRange = '17:30-19:30';
      }
      
      if (deliveryDate.toDateString() === today.toDateString()) {
        return `今天 ${timeRange}`;
      } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        if (deliveryDate.toDateString() === tomorrow.toDateString()) {
          return `明天 ${timeRange}`;
        } else {
          return `${deliveryDate.getMonth() + 1}月${deliveryDate.getDate()}日 ${timeRange}`;
        }
      }
    };

    setEstimatedTime(calculateEstimatedTime());

    // 5秒后隐藏动画
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentOrder, navigate]);

  const handleBackToHome = () => {
    clearOrder();
    navigate('/');
  };

  const handleViewOrders = () => {
    clearOrder();
    navigate('/my-orders');
  };

  if (!currentOrder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Navbar title="订单成功" showBack={false} showCart={false} />
        
        <div className="p-4">
          {showAnimation ? (
            /* 制作动画页面 */
            <div className="text-center py-12">
              <div className="relative mb-8">
                {/* 旋转的厨师帽动画 */}
                <div className="text-8xl animate-bounce mb-4">👨‍🍳</div>
                <div className="text-6xl animate-spin" style={{ animationDuration: '2s' }}>🍳</div>
                
                {/* 制作中文字动效 */}
                <div className="mt-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    正在制作中
                    <span className="animate-pulse">...</span>
                  </h2>
                  <p className="text-gray-600">
                    我们的厨师正在用心为您准备美味的饭菜
                  </p>
                </div>
                
                {/* 制作进度动画 */}
                <div className="mt-8">
                  <div className="flex justify-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 订单详情页面 */
            <div className="space-y-6">
              {/* 成功提示 */}
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  订单提交成功！
                </h1>
                <p className="text-gray-600">
                  订单号：{currentOrder.id}
                </p>
              </div>

              {/* 配送信息 */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    配送信息
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">预计送达时间</span>
                      <span className="font-semibold text-orange-600">{estimatedTime}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        配送地址
                      </span>
                      <span className="text-right text-gray-800 max-w-48">
                        {currentOrder.address}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 订单详情 */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-800">
                    订单详情
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentOrder.items?.map((item) => (
                      <div key={item.food.id} className="flex justify-between">
                        <span className="text-gray-600">
                          {item.food.name} × {item.quantity}
                        </span>
                        <span className="text-gray-800">
                          ¥{(item.food.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-semibold">
                        <span>总计</span>
                        <span className="text-orange-600">
                          ¥{currentOrder.totalPrice?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 祝福语 */}
              <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="text-xl font-bold text-orange-800 mb-2">
                    祝你用餐愉快！
                  </h3>
                  <p className="text-orange-700 text-sm">
                    感谢您选择社区小饭桌，我们会用心为您准备每一份美味
                  </p>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleViewOrders}
                  className="w-full"
                  size="lg"
                >
                  查看我的订单 📋
                </Button>
                
                <Button
                  onClick={handleBackToHome}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  返回首页
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Success;
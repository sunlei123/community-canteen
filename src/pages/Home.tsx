import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FoodCategory, Food } from '../types';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';

import {
  ChefHat,
  ClipboardList,
  CreditCard,
  Baby,
  BookOpen,
  Phone,
  X,
  Check,
  Copy,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { foods, isLoading, loadFoods, userToken, students, getTotalItems, systemSettings } = useStore();

  // 模态框显隐状态
  const [showBabyModal, setShowBabyModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 今日供应菜品数据及状态
  const [todayFoods, setTodayFoods] = useState<Food[]>([]);
  const [isTodayLoading, setIsTodayLoading] = useState(true);

  // 初始化数据加载：获取服务器日期并拉取今日菜单，同时调用 loadFoods 供其他位置做全局缓存
  useEffect(() => {
    const fetchTodayFoods = async () => {
      try {
        setIsTodayLoading(true);
        const serverDateRes = await api.auth.getServerDate();
        const dateStr = serverDateRes.date;
        const items = await api.menu.getItems({ date: dateStr });
        setTodayFoods(items);
      } catch (error) {
        console.error('获取今日菜单失败:', error);
      } finally {
        setIsTodayLoading(false);
      }
    };

    fetchTodayFoods();
    loadFoods();
  }, [loadFoods]);

  const handleGridClick = (action: string) => {
    if (action === 'notice') {
      setShowNoticeModal(true);
      return;
    }
    if (action === 'contact') {
      setShowContactModal(true);
      return;
    }

    if (!userToken) {
      toast.error('订餐前请先登录并绑定宝贝');
      navigate('/login');
      return;
    }

    switch (action) {
      case 'menu':
        if (!students || students.length === 0) {
          toast.error('订餐前请先绑定您的宝贝档案！');
          navigate('/add-student');
          return;
        }
        navigate('/menu');
        break;
      case 'orders':
        navigate('/my-orders');
        break;
      case 'cart':
        if (getTotalItems() > 0) {
          navigate('/cart');
        } else {
          toast.info('购物车空空如也，已为您智能跳转到订单列表');
          navigate('/my-orders');
        }
        break;
      case 'baby':
        setShowBabyModal(true);
        break;
      default:
        break;
    }
  };

  const handleFoodClick = (foodId: string) => {
    if (!userToken) {
      toast.error('请先登录以查看菜品详情并下单');
      navigate('/login');
      return;
    }
    if (!students || students.length === 0) {
      toast.error('订餐前请先绑定您的宝贝档案！');
      navigate('/add-student');
      return;
    }
    navigate(`/menu?highlight=${foodId}`);
  };

  const copyWeChat = () => {
    const wechatId = systemSettings?.wechat || 'dong_teacher_kitchen';
    navigator.clipboard.writeText(wechatId);
    setCopied(true);
    toast.success('董老师微信号复制成功，快去微信添加吧！');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div className="max-w-md mx-auto bg-white min-h-screen w-full flex flex-col justify-between shadow-md relative pb-16">
        <div>
          {/* 首页 Navbar 隐藏购物车图标，提升视觉完整性 */}
          <Navbar showCart={false} />

          {/* 品牌展示区 - 高端渐变质感 */}
          <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white p-6 rounded-b-[2rem] shadow-lg text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
            <div className="text-6xl mb-3 transform hover:scale-110 transition-transform duration-300 inline-block">🍳</div>
            <h1 className="text-2xl font-bold tracking-wide">董老师小厨房</h1>
            <p className="text-orange-100 text-xs mt-1">
              新鲜食材 · 严选荤素 · 邻里温情到餐
            </p>
          </div>

          {/* 6宫格网格导航 */}
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3">
              {/* 1. 开始选餐 */}
              <button
                onClick={() => handleGridClick('menu')}
                className="flex flex-col items-center justify-center p-4 bg-orange-50/50 hover:bg-orange-50 border border-orange-100/60 rounded-2xl transition-all duration-300 active:scale-95 shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-2 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <ChefHat className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700">开始选餐</span>
              </button>

              {/* 2. 我的订单 */}
              <button
                onClick={() => handleGridClick('orders')}
                className="flex flex-col items-center justify-center p-4 bg-green-50/50 hover:bg-green-50 border border-green-100/60 rounded-2xl transition-all duration-300 active:scale-95 shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center mb-2 shadow-md shadow-green-500/20 group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700">我的订单</span>
              </button>

              {/* 3. 去结算 */}
              <button
                onClick={() => handleGridClick('cart')}
                className="flex flex-col items-center justify-center p-4 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/60 rounded-2xl transition-all duration-300 active:scale-95 shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-2 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700">去结算</span>
              </button>

              {/* 4. 宝贝档案 */}
              <button
                onClick={() => handleGridClick('baby')}
                className="flex flex-col items-center justify-center p-4 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/60 rounded-2xl transition-all duration-300 active:scale-95 shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center mb-2 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                  <Baby className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700">宝贝档案</span>
              </button>

              {/* 5. 订餐须知 */}
              <button
                onClick={() => handleGridClick('notice')}
                className="flex flex-col items-center justify-center p-4 bg-pink-50/50 hover:bg-pink-50 border border-pink-100/60 rounded-2xl transition-all duration-300 active:scale-95 shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-pink-500 text-white flex items-center justify-center mb-2 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700">订餐须知</span>
              </button>

              {/* 6. 董老师热线 */}
              <button
                onClick={() => handleGridClick('contact')}
                className="flex flex-col items-center justify-center p-4 bg-yellow-50/50 hover:bg-yellow-50 border border-yellow-100/60 rounded-2xl transition-all duration-300 active:scale-95 shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-500 text-white flex items-center justify-center mb-2 shadow-md shadow-yellow-500/20 group-hover:scale-105 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700">董老师热线</span>
              </button>
            </div>
          </div>

          {/* 今日供应菜品列表 */}
          <div className="px-6 pb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🍽️</span>今日供应菜品
            </h2>
            {isTodayLoading ? (
              <div className="text-center py-8">
                <span className="text-2xl mb-2 inline-block animate-spin">🌀</span>
                <p className="text-gray-500 text-sm">正在加载今日供应...</p>
              </div>
            ) : todayFoods.length > 0 ? (
              <div className="space-y-5">
                {[
                  { type: FoodCategory.MEAT, label: '今日荤菜', icon: '🍖' },
                  { type: FoodCategory.VEGGIE, label: '今日素菜', icon: '🥦' },
                  { type: FoodCategory.STAPLE, label: '今日主食', icon: '🍚' },
                  { type: FoodCategory.DESSERT_FRUIT, label: '甜品饮品', icon: '🍰' },
                  { type: FoodCategory.SOUP, label: '今日营养汤', icon: '🥣' }
                ].map((cat) => {
                  const foodsInCat = todayFoods.filter(f => f.category === cat.type);
                  if (foodsInCat.length === 0) return null;
                  return (
                    <div key={cat.type} className="space-y-2">
                      <div className="flex items-center text-xs font-bold text-gray-400 tracking-wide pl-1">
                        <span className="mr-1">{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-500 rounded-full font-bold">
                          {foodsInCat.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {foodsInCat.map((food) => (
                          <Card
                            key={food.id}
                            onClick={() => handleFoodClick(food.id)}
                            className="cursor-pointer hover:shadow-md border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 active:scale-98 flex flex-col justify-between"
                          >
                            <CardContent className="p-3 flex flex-col justify-between h-full">
                              <div className="min-w-0">
                                <h3 className="font-bold text-gray-800 text-sm truncate">{food.name}</h3>
                                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 font-light">{food.description || '营养搭配，美味可口'}</p>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                <span className="text-orange-600 font-extrabold text-sm">¥{food.price.toFixed(2)}</span>
                                <span className="text-[9px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full border border-green-100 flex-shrink-0">
                                  今日
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 border border-dashed rounded-2xl">
                <div className="text-3xl mb-1">👩‍🍳</div>
                <p className="text-gray-400 text-xs">董老师正在用心配餐中...</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="text-center py-4 text-xs text-gray-400 px-6 border-t border-gray-100 bg-gray-50/30">
          <p>© 2026 董老师小厨房. All rights reserved.</p>
          <p className="mt-0.5 text-[10px] text-gray-300">每一餐，都倾注邻里关爱与安全健康</p>
          {/* <button 
            onClick={() => navigate('/verify')}
            className="mt-2 text-[9px] text-gray-300 hover:text-green-500 font-bold transition-all flex items-center justify-center mx-auto space-x-1 border border-gray-200/50 hover:border-green-200 bg-white hover:bg-green-50/20 px-2 py-0.8 rounded-full shadow-sm"
          >
            <span>⚙️ 算法计价与日历接龙联动诊断系统</span>
          </button> */}
        </div>

        {/* ==================== 模态弹窗系统 ==================== */}

        {/* 4. 宝贝档案 弹窗 */}
        {showBabyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-5 relative">
                <button
                  onClick={() => setShowBabyModal(false)}
                  className="absolute right-4 top-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-3xl mb-1">🧒</div>
                <h3 className="text-lg font-bold">宝贝成长档案</h3>
                <p className="text-purple-100 text-xs mt-0.5">当前登录账号绑定的学生列表</p>
              </div>
              <div className="p-6">
                {students && students.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center space-x-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm">{student.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{student.class}</p>
                        </div>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                          已绑定
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">暂未绑定任何宝贝信息</p>
                  </div>
                )}
                <div className="mt-6 flex flex-col space-y-2">
                  <Button
                    onClick={() => {
                      setShowBabyModal(false);
                      navigate('/add-student');
                    }}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center justify-center space-x-1"
                  >
                    <span>管理或绑定新宝贝</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBabyModal(false)}
                    className="w-full text-xs text-gray-500 hover:text-gray-800"
                  >
                    关闭返回
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. 订餐须知 弹窗 */}
        {showNoticeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-5 relative">
                <button
                  onClick={() => setShowNoticeModal(false)}
                  className="absolute right-4 top-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-3xl mb-1">📖</div>
                <h3 className="text-lg font-bold">订餐接龙须知</h3>
                <p className="text-pink-100 text-xs mt-0.5">董老师小厨房配送及退款守则</p>
              </div>
              <div className="p-6 space-y-4 text-xs text-gray-600 leading-relaxed max-h-96 overflow-y-auto pr-1">
                <div className="bg-pink-50/50 border border-pink-100 p-3.5 rounded-2xl">
                  <h4 className="font-bold text-pink-700 mb-1.5 flex items-center">
                    <span className="w-1.5 h-3 bg-pink-500 rounded mr-1.5 inline-block"></span>配送时间安排
                  </h4>
                  <div className="whitespace-pre-wrap">{systemSettings?.noticeDelivery || '🔹 工作日午餐：11:30 - 12:15 之间配送到校门指定取餐点；\n🔹 工作日晚餐：17:30 - 18:15 之间配送到校门指定取餐点。'}</div>
                </div>

                <div className="bg-orange-50/50 border border-orange-100 p-3.5 rounded-2xl">
                  <h4 className="font-bold text-orange-700 mb-1.5 flex items-center">
                    <span className="w-1.5 h-3 bg-orange-500 rounded mr-1.5 inline-block"></span>套餐超级抵扣规则
                  </h4>
                  <div className="whitespace-pre-wrap">{systemSettings?.noticeDiscount || '只要您同时点了一份主食与一份汤品，即可享受套餐特惠：\n💰 一荤两素一饭一汤 = 15元\n💰 两荤一素一饭一汤 = 17元\n💰 三荤一饭一汤 = 20元\n※ 超出套餐以外的菜品或未配齐饭汤将按单价累计，水果甜品始终按单价核算。'}</div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl">
                  <h4 className="font-bold text-blue-700 mb-1.5 flex items-center">
                    <span className="w-1.5 h-3 bg-blue-500 rounded mr-1.5 inline-block"></span>取消与修改
                  </h4>
                  <div className="whitespace-pre-wrap">{systemSettings?.noticeCancel || '由于食材需每日清晨新鲜采购，如需退订或修改配送信息，请提前一天晚上 20:00 前在“我的订单”中直接取消，系统将即时退回全款。逾期由于备料完成，恕不接受退订，敬请家长谅解。'}</div>
                </div>

                <button
                  onClick={() => setShowNoticeModal(false)}
                  className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold transition-all shadow-md shadow-pink-200 mt-2 text-xs"
                >
                  我已了解规则
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. 董老师热线 弹窗 */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white p-5 relative">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="absolute right-4 top-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-3xl mb-1">☎️</div>
                <h3 className="text-lg font-bold">董老师客服热线</h3>
                <p className="text-yellow-100 text-xs mt-0.5">邻里送餐 · 膳食沟通微电名片</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-600 font-bold block">微信咨询服务号</span>
                    <span className="font-mono text-sm font-bold text-gray-800">{systemSettings?.wechat || 'dong_teacher_kitchen'}</span>
                  </div>
                  <button
                    onClick={copyWeChat}
                    className="p-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl transition-colors flex items-center justify-center"
                    title="复制微信号"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-600 font-bold block">紧急催餐/订餐热线</span>
                    <span className="font-mono text-sm font-bold text-gray-800">{systemSettings?.phone || '139-0000-0001'}</span>
                  </div>
                  <a
                    href={`tel:${systemSettings?.phone?.replace(/-/g, '') || '13900000001'}`}
                    className="p-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl transition-colors flex items-center justify-center"
                    title="拨打电话"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-150 text-[10px] text-gray-500 leading-normal text-center italic">
                  {systemSettings?.quote || '“每一道菜，都用做给自己孩子的心意去烹饪。” —— 董老师'}
                </div>

                <Button
                  onClick={() => setShowContactModal(false)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-200"
                >
                  关闭名片
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Home;
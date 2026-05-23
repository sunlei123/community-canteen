import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FoodCategory, MealTime, Food } from '../types';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { 
  Calendar, 
  User, 
  School, 
  Check, 
  Heart, 
  MessageSquare, 
  ShoppingBag, 
  Smile, 
  BookOpen, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Utensils
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

// 最优折扣套餐计算
export const calculateOptimalComboPrice = (
  meatPrices: number[],
  veggiePrices: number[],
  staplePrices: number[],
  soupPrices: number[]
): number => {
  // 从大到小降序排序，套餐折抵时优先消耗单价高的菜品，确保用户享受到最大优惠
  const sortedMeats = [...meatPrices].sort((a, b) => b - a);
  const sortedVeggies = [...veggiePrices].sort((a, b) => b - a);
  const sortedStaples = [...staplePrices].sort((a, b) => b - a);
  const sortedSoups = [...soupPrices].sort((a, b) => b - a);

  const memo: Record<string, number> = {};

  const getMinPrice = (
    mCount: number,
    vCount: number,
    sCount: number,
    spCount: number
  ): number => {
    const key = `${mCount},${vCount},${sCount},${spCount}`;
    if (key in memo) return memo[key];

    // 递归基：不再匹配任何套餐，直接计算剩余菜品的原价总和
    let minPrice = 0;
    for (let i = sortedMeats.length - mCount; i < sortedMeats.length; i++) minPrice += sortedMeats[i];
    for (let i = sortedVeggies.length - vCount; i < sortedVeggies.length; i++) minPrice += sortedVeggies[i];
    for (let i = sortedStaples.length - sCount; i < sortedStaples.length; i++) minPrice += sortedStaples[i];
    for (let i = sortedSoups.length - spCount; i < sortedSoups.length; i++) minPrice += sortedSoups[i];

    // 尝试匹配：三荤一饭一汤 = 20元
    if (mCount >= 3 && sCount >= 1 && spCount >= 1) {
      const price = 20 + getMinPrice(mCount - 3, vCount, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    // 尝试匹配：两荤一素一饭一汤 = 17元
    if (mCount >= 2 && vCount >= 1 && sCount >= 1 && spCount >= 1) {
      const price = 17 + getMinPrice(mCount - 2, vCount - 1, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    // 尝试匹配：一荤两素一饭一汤 = 15元
    if (mCount >= 1 && vCount >= 2 && sCount >= 1 && spCount >= 1) {
      const price = 15 + getMinPrice(mCount - 1, vCount - 2, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    memo[key] = minPrice;
    return minPrice;
  };

  return getMinPrice(sortedMeats.length, sortedVeggies.length, sortedStaples.length, sortedSoups.length);
};

interface QuantitySelectorProps {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ quantity, onChange, min = 0 }) => {
  if (quantity === 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChange(1);
        }}
        className="w-8 h-8 rounded-full border border-green-500 bg-white hover:bg-green-50 flex items-center justify-center text-green-600 transition-all active:scale-90 shadow-sm"
      >
        <span className="text-xl font-bold leading-none">+</span>
      </button>
    );
  }

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="flex items-center space-x-2 bg-[#E8F5E9]/60 backdrop-blur-sm rounded-full p-1 border border-green-200/50 shadow-sm animate-in zoom-in-75 duration-200"
    >
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className="w-6 h-6 rounded-full bg-white hover:bg-green-100 flex items-center justify-center text-green-700 font-bold shadow-sm transition-colors"
      >
        -
      </button>
      <span className="text-xs font-bold text-green-800 px-1">{quantity}</span>
      <button
        onClick={() => onChange(quantity + 1)}
        className="w-6 h-6 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white font-bold shadow-sm transition-colors"
      >
        +
      </button>
    </div>
  );
};

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryDate = queryParams.get('date');
  
  const { 
    userToken, 
    students, 
    currentStudentId, 
    setCurrentStudentId,
    foods, 
    isLoading, 
    error, 
    loadFoods 
  } = useStore();

  // 认证守卫：若未登录直接重定向到 /login
  useEffect(() => {
    if (!userToken) {
      navigate('/login');
    }
  }, [userToken, navigate]);

  // 当前选定的配送日期
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      return queryDate;
    }
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });

  // 用餐时段，默认午餐
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime>(MealTime.LUNCH);

  // 表单选择状态：使用 Record<string, number> 记录每个菜品对应的数量，支持多份追加调节
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  // 今日已订餐检查状态
  const [todayOrderExists, setTodayOrderExists] = useState<boolean>(false);
  const [existingOrderNo, setExistingOrderNo] = useState<string>('');
  const [isCheckingOrder, setIsCheckingOrder] = useState<boolean>(false);

  // 获取当前选中的学生
  const currentStudent = students.find(s => s.id === currentStudentId) || students[0];

  // 生成未来7天的日期列表
  const getNext7Days = () => {
    const days = [];
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const offset = d.getTimezoneOffset();
      const localD = new Date(d.getTime() - (offset * 60 * 1000));
      const dateStr = localD.toISOString().split('T')[0];
      
      let label = '';
      if (i === 0) label = '今天';
      else if (i === 1) label = '明天';
      else if (i === 2) label = '后天';
      else label = weekdayNames[d.getDay()];
      
      const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
      
      days.push({
        dateStr,
        label,
        monthDay
      });
    }
    return days;
  };
  
  const dateList = getNext7Days();

  // 根据选定日期请求该日期的每日菜单
  useEffect(() => {
    if (userToken) {
      const fetchDateMenu = async () => {
        try {
          await loadFoods(selectedDate);
        } catch (e) {
          console.error('加载菜单失败：', e);
        }
      };
      fetchDateMenu();
    }
  }, [selectedDate, loadFoods, userToken]);

  // 当日期或学生变化时，检查该学生当天是否已订餐
  useEffect(() => {
    const studentId = (students.find(s => s.id === currentStudentId) || students[0])?.id;
    if (!studentId || !selectedDate || !userToken) return;
    const checkOrder = async () => {
      try {
        setIsCheckingOrder(true);
        const result = await api.order.checkToday(studentId, selectedDate);
        setTodayOrderExists(result.hasOrder);
        setExistingOrderNo(result.order?.orderNumber || '');
      } catch {
        setTodayOrderExists(false);
        setExistingOrderNo('');
      } finally {
        setIsCheckingOrder(false);
      }
    };
    checkOrder();
  }, [selectedDate, currentStudentId, students, userToken]);


  // 当这一天的菜品数据发生变化时，自动初始化选中的状态
  useEffect(() => {
    if (foods && foods.length > 0) {
      const initialQuantities: Record<string, number> = {};
      const staples = foods.filter(f => f.category === FoodCategory.STAPLE);
      const soups = foods.filter(f => f.category === FoodCategory.SOUP);
      
      // 默认选中第一个主食，数量为 1
      if (staples.length > 0) {
        initialQuantities[staples[0].id] = 1;
      }
      
      // 汤品默认选中并数量为 1
      soups.forEach(s => {
        initialQuantities[s.id] = 1;
      });
      
      setSelectedQuantities(initialQuantities);
    }
  }, [foods]);

  // 分类过滤菜品
  const staples = foods.filter(f => f.category === FoodCategory.STAPLE);
  const mains = foods.filter(f => f.category === FoodCategory.MEAT || f.category === FoodCategory.VEGGIE);
  const soups = foods.filter(f => f.category === FoodCategory.SOUP);
  const desserts = foods.filter(f => f.category === FoodCategory.DESSERT_FRUIT);

  // 学生切换
  const handleStudentSelect = (studentId: string) => {
    setCurrentStudentId(studentId);
    // 切换学生时重置已订餐状态，等待 useEffect 重新检查
    setTodayOrderExists(false);
    setExistingOrderNo('');
  };

  // 通用卡片点击处理（主食、主菜、水果甜品）
  const handleCardClick = (id: string) => {
    setSelectedQuantities(prev => {
      const qty = prev[id] || 0;
      if (qty > 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      } else {
        return { ...prev, [id]: 1 };
      }
    });
  };

  // 计算已选菜品详细价格（包括原价、折后价及所省金额）
  const calculatePriceDetails = () => {
    let originalTotal = 0;
    const meatPrices: number[] = [];
    const veggiePrices: number[] = [];
    const staplePrices: number[] = [];
    const soupPrices: number[] = [];
    let dessertTotal = 0;

    Object.entries(selectedQuantities).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const food = foods.find(f => f.id === id);
      if (!food) return;

      originalTotal += food.price * qty;

      for (let i = 0; i < qty; i++) {
        if (food.category === FoodCategory.MEAT) {
          meatPrices.push(food.price);
        } else if (food.category === FoodCategory.VEGGIE) {
          veggiePrices.push(food.price);
        } else if (food.category === FoodCategory.STAPLE) {
          staplePrices.push(food.price);
        } else if (food.category === FoodCategory.SOUP) {
          soupPrices.push(food.price);
        } else if (food.category === FoodCategory.DESSERT_FRUIT) {
          dessertTotal += food.price;
        }
      }
    });

    const comboTotal = calculateOptimalComboPrice(meatPrices, veggiePrices, staplePrices, soupPrices);
    const finalTotal = comboTotal + dessertTotal;
    const discount = originalTotal - finalTotal;

    return {
      originalTotal,
      finalTotal,
      discount,
      meatCount: meatPrices.length,
      veggieCount: veggiePrices.length,
      hasStaple: staplePrices.length > 0,
      hasSoup: soupPrices.length > 0
    };
  };

  const calculateTotal = () => {
    return calculatePriceDetails().finalTotal;
  };

  // 提交接龙订单
  const handleSubmitSolitaire = async () => {
    if (!currentStudent) {
      toast.error('请选择订餐学生 👦');
      return;
    }

    const selectedStaples = staples.filter(f => (selectedQuantities[f.id] || 0) > 0);
    if (selectedStaples.length === 0) {
      toast.error('请至少选择一份配送主食 🍚');
      return;
    }

    const selectedMains = mains.filter(f => (selectedQuantities[f.id] || 0) > 0);
    if (selectedMains.length === 0) {
      toast.error('请至少勾选一道美味菜品 🍖🥦');
      return;
    }

    // 构建创建订单的 items 数据格式
    const orderItems: Array<{ foodId: string; quantity: number; price: number }> = [];

    Object.entries(selectedQuantities).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const food = foods.find(f => f.id === id);
      if (food) {
        orderItems.push({
          foodId: food.id,
          quantity: qty,
          price: food.price
        });
      }
    });

    const totalPrice = calculateTotal();

    try {
      // 前端二次校验：今日已订餐则阻止提交
      if (todayOrderExists) {
        toast.error('该学生今日已订餐，每天每人仅允许下一单哦 🍱');
        return;
      }

      setSubmitting(true);

      const orderData = {
        items: orderItems,
        address: `${currentStudent.class} 送达教室`,
        deliveryDate: selectedDate,
        mealTime: selectedMealTime,
        totalPrice,
        studentId: currentStudent.id,
        customerInfo: { note: note.trim() }
      };

      // 提交到后端数据库
      const result = await api.order.create(orderData);

      // 将后端返回的 items 映射为 Success.tsx 期望的前端 Order.items 格式，以防属性未定义报错
      const formattedItems = orderItems.map(oi => {
        const food = foods.find(f => f.id === oi.foodId);
        if (!food) {
          throw new Error('选中的菜品数据不匹配');
        }
        return {
          food,
          quantity: oi.quantity
        };
      });

      // 手动同步设置 Zustand store 的 currentOrder，确保 Success 页面可以直接取用
      useStore.setState({
        currentOrder: {
          id: result.id,
          items: formattedItems,
          totalPrice,
          deliveryDate: selectedDate,
          mealTime: selectedMealTime,
          address: orderData.address,
          customerInfo: orderData.customerInfo
        }
      });

      toast.success('订单提交成功！享受美味吧 🍲');
      navigate('/success');
    } catch (e: any) {
      toast.error(e.message || '接龙提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 生成接龙已选摘要文字
  const getSelectedSummaryText = () => {
    const list: string[] = [];
    
    const categoriesOrder = [
      FoodCategory.STAPLE,
      FoodCategory.MEAT,
      FoodCategory.VEGGIE,
      FoodCategory.SOUP,
      FoodCategory.DESSERT_FRUIT
    ];

    categoriesOrder.forEach(category => {
      const categoryFoods = foods.filter(f => f.category === category);
      categoryFoods.forEach(food => {
        const qty = selectedQuantities[food.id] || 0;
        if (qty > 0) {
          if (food.category === FoodCategory.SOUP) {
            list.push(`${food.name}`);
          } else {
            list.push(`${food.name} x${qty}`);
          }
        }
      });
    });

    return list.join(' + ') || '尚未选择菜品';
  };

  // 微信经典拟真序号徽标
  const getSolitaireIndexBadge = (index: number) => {
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (index < emojiNumbers.length) {
      return <span className="text-lg mr-1.5">{emojiNumbers[index]}</span>;
    }
    return <span className="w-5 h-5 flex items-center justify-center bg-green-100 text-green-700 rounded-full text-xs font-bold mr-2">{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      <div className="max-w-md mx-auto bg-[#F0F2F5] min-h-screen shadow-md flex flex-col relative">
        <Navbar title="订餐接龙" showBack={true} showCart={false} />
        


        {/* 订餐主界面 */}
        <div className="p-4 flex-1">
          {error && (
            <div className="text-center py-8 bg-white rounded-2xl p-4 shadow-sm border border-red-100">
              <div className="text-red-500 text-sm mb-3 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 mr-1" /> {error}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadFoods(selectedDate)}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                重新加载
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 mx-1 mt-2">
              <div className="text-5xl mb-4 animate-bounce">⏳</div>
              <p className="text-gray-500 text-sm">正在加载每日订餐接龙菜单...</p>
            </div>
          ) : foods.length === 0 ? (
            /* 未发布菜单的友好提示（保持和每日发布逻辑一致，未发布不显示预览页面） */
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm mx-1 mt-2 space-y-4">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 text-4xl animate-pulse">
                📅
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-800">该日期未发布订餐</h3>
                <p className="text-gray-500 text-sm max-w-[280px] mx-auto leading-relaxed">
                  董老师今天还没有发布特定菜单或休假哦，敬请期待！您可以选择其他日期看看。
                </p>
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 transition-colors"
                >
                  返回今天
                </Button>
              </div>
            </div>
          ) : (
            /* 高颜值微信订餐接龙表单 */
            <div className="space-y-5">
              
              {/* ===== 今日已订餐提示横幅 ===== */}
              {isCheckingOrder && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 animate-pulse shadow-sm">
                  <span className="text-2xl">🔍</span>
                  <p className="text-blue-600 text-sm font-medium">正在检查今日订餐情况...</p>
                </div>
              )}

              {!isCheckingOrder && todayOrderExists && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">🍱</span>
                    <div className="flex-1">
                      <h3 className="text-amber-800 font-bold text-base mb-1">今日已完成订餐</h3>
                      <p className="text-amber-700 text-sm leading-relaxed mb-3">
                        {currentStudent?.name} 今天已经订餐啦！每天每人只能订一份哦。
                        {existingOrderNo && <span className="block mt-1 text-xs text-amber-600">订单号：{existingOrderNo}</span>}
                      </p>
                      <button
                        onClick={() => navigate('/my-orders')}
                        className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm"
                      >
                        查看我的订单 →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 多孩学生切换区、接龙表单：仅在今日尚未订餐时显示 */}
              {!isCheckingOrder && !todayOrderExists && (
              <>

              {/* 多孩学生切换区（如果有多个孩子，在这里展示漂亮的学生切换栏） */}

              {students.length > 1 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-1 text-green-600" /> 请选择订餐宝贝
                  </div>
                  <div className="flex space-x-2">
                    {students.map((student) => {
                      const active = currentStudentId === student.id;
                      return (
                        <button
                          key={student.id}
                          onClick={() => handleStudentSelect(student.id)}
                          className={cn(
                            "flex-1 py-2.5 px-3 rounded-xl border text-center transition-all duration-200 active:scale-95",
                            active
                              ? "bg-gradient-to-br from-green-500 to-emerald-600 border-transparent text-white font-bold shadow-md shadow-green-100 scale-[1.02] ring-2 ring-green-500/20"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50/50 hover:border-gray-300 shadow-sm"
                          )}
                        >
                          <span className={cn(
                            "text-sm block transition-colors duration-150",
                            active ? "text-white font-extrabold" : "text-gray-800 font-semibold"
                          )}>
                            {student.name}
                          </span>
                          <span className={cn(
                            "text-[10px] block font-light transition-colors duration-150 mt-0.5",
                            active ? "text-green-100/90 font-normal" : "text-gray-400"
                          )}>
                            {student.class}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 微信风格订餐接龙卡片 */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                {/* 渐变头部 */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white relative">
                  <div className="absolute right-4 top-4 opacity-10">
                    <Utensils className="w-24 h-24 rotate-12" />
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center">
                      <Sparkles className="w-3 h-3 mr-1 text-yellow-300 animate-pulse" /> 社区小食堂
                    </span>
                    <span className="text-xs text-green-100">| 班级集中配送</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-wide">董老师厨房 · 每日订餐接龙 🍀</h2>
                  <p className="text-xs text-green-100 mt-2 font-light leading-relaxed">
                    【每日订餐接龙】为了让孩子们吃上新鲜、营养、美味的午餐，请各位家长按要求如实填写，感谢您的配合与支持！
                  </p>
                </div>

                {/* 接龙选项部分 */}
                <div className="p-5 space-y-6">
                  
                  {/* #01 配送班级 */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      <span className="bg-green-100 text-green-700 w-5 h-5 flex items-center justify-center rounded-full text-xs mr-2 font-bold">1</span>
                      学校、年级班级
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <School className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        disabled
                        value={currentStudent?.class || '暂无班级信息'}
                        className="block w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>

                  {/* #02 订餐学生姓名 */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      <span className="bg-green-100 text-green-700 w-5 h-5 flex items-center justify-center rounded-full text-xs mr-2 font-bold">2</span>
                      订餐学生姓名
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        disabled
                        value={currentStudent?.name || '请先添加学生'}
                        className="block w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>

                  {/* #03 选择配送主食 (多选 & 追加) */}
                  {staples.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-dashed border-gray-100">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <span className="bg-green-100 text-green-700 w-5 h-5 flex items-center justify-center rounded-full text-xs mr-2 font-bold">3</span>
                        选择配送主食 (多选 & 追加)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {staples.map((food) => {
                          const qty = selectedQuantities[food.id] || 0;
                          const isSelected = qty > 0;
                          return (
                            <div
                              key={food.id}
                              onClick={() => handleCardClick(food.id)}
                              className={cn(
                                "cursor-pointer rounded-2xl border p-3.5 flex flex-col items-center text-center justify-center transition-all duration-150 active:scale-95 min-h-[90px]",
                                isSelected
                                  ? "border-green-500 bg-green-50/50 shadow-sm"
                                  : "border-gray-100 bg-[#FAFAFA] hover:border-gray-200"
                              )}
                            >
                              <span className="text-xs font-bold text-gray-800 leading-tight mb-1">{food.name}</span>
                              <span className="text-[10px] text-green-600 font-semibold mb-2">¥{food.price.toFixed(2)}</span>
                              
                              <QuantitySelector
                                quantity={qty}
                                onChange={(newQty) => {
                                  setSelectedQuantities(prev => {
                                    if (newQty === 0) {
                                      const next = { ...prev };
                                      delete next[food.id];
                                      return next;
                                    }
                                    return { ...prev, [food.id]: newQty };
                                  });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* #04 选择每日菜品 (多选 & 追加) */}
                  {mains.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-dashed border-gray-100">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <span className="bg-green-100 text-green-700 w-5 h-5 flex items-center justify-center rounded-full text-xs mr-2 font-bold">4</span>
                        选择每日菜品 (荤素多选 & 追加)
                      </label>
                      
                      {/* 菜品列表：荷菜排在前，素菜排在后 */}
                      <div className="space-y-3">
                        {[...mains]
                          .sort((a, b) => {
                            // MEAT = 0, VEGGIE = 1, 确保荷菜在前
                            const order = (c: string) => c === FoodCategory.MEAT ? 0 : 1;
                            return order(a.category) - order(b.category);
                          })
                          .map((food, index) => {
                          const qty = selectedQuantities[food.id] || 0;
                          const isSelected = qty > 0;
                          const isMeat = food.category === FoodCategory.MEAT;
                          return (
                            <div
                              key={food.id}
                              onClick={() => handleCardClick(food.id)}
                              className={cn(
                                "cursor-pointer rounded-2xl border p-3 flex items-center justify-between transition-all duration-150 active:scale-[0.99]",
                                isSelected
                                  ? "border-green-500 bg-green-50/30 shadow-sm"
                                  : "border-gray-100 bg-[#FAFAFA] hover:border-gray-200"
                              )}
                            >
                              <div className="flex items-center space-x-2.5">
                                {/* 拟真微信序号数字 */}
                                {getSolitaireIndexBadge(index)}
                                
                                <div>
                                  <div className="flex items-center">
                                    <span className="text-xs font-bold text-gray-800">{food.name}</span>
                                    <span className={cn(
                                      "text-[9px] px-1.5 py-0.5 rounded-md ml-1.5 font-medium",
                                      isMeat ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                    )}>
                                      {isMeat ? '🍖 荤菜' : '🥦 素菜'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-light mt-0.5 block leading-tight">{food.description || '精心搭配，健康美味'}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <span className="text-xs font-bold text-gray-700 mr-1">¥{food.price.toFixed(2)}</span>
                                <QuantitySelector
                                  quantity={qty}
                                  onChange={(newQty) => {
                                    setSelectedQuantities(prev => {
                                      if (newQty === 0) {
                                        const next = { ...prev };
                                        delete next[food.id];
                                        return next;
                                      }
                                      return { ...prev, [food.id]: newQty };
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* #05 汤品选择 (需要/不需要) */}
                  {soups.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-dashed border-gray-100">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <span className="bg-green-100 text-green-700 w-5 h-5 flex items-center justify-center rounded-full text-xs mr-2 font-bold">5</span>
                        今日营养汤品选择
                      </label>
                      
                      <div className="space-y-3">
                        {soups.map((food) => {
                          const qty = selectedQuantities[food.id] || 0;
                          const isYes = qty > 0;
                          return (
                            <div key={food.id} className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">🥣</span>
                                  <div>
                                    <div className="flex items-center">
                                      <span className="text-xs font-bold text-gray-800">{food.name}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 block font-light mt-0.5">每日例汤，精细熬制</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-green-600">¥{food.price.toFixed(2)}</span>
                              </div>
                              
                              <div className="flex space-x-2 items-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedQuantities(prev => ({ ...prev, [food.id]: 1 }));
                                  }}
                                  className={cn(
                                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center space-x-1",
                                    isYes
                                      ? "bg-green-500 border-transparent text-white shadow-sm"
                                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {isYes && <Check className="w-3.5 h-3.5" />}
                                  <span>👍 需要汤品</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedQuantities(prev => {
                                      const next = { ...prev };
                                      delete next[food.id];
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center space-x-1",
                                    !isYes
                                      ? "bg-gray-700 border-transparent text-white shadow-sm"
                                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {!isYes && <Check className="w-3.5 h-3.5" />}
                                  <span>🙅 不需要</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* #06 水果酸奶饮品 (多选 & 追加) */}
                  {desserts.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-dashed border-gray-100">
                      <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <span className="bg-green-100 text-green-700 w-5 h-5 flex items-center justify-center rounded-full text-xs mr-2 font-bold">6</span>
                        水果、饮品与健康酸奶 (多选 & 追加)
                      </label>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {desserts.map((food) => {
                          const qty = selectedQuantities[food.id] || 0;
                          const isSelected = qty > 0;
                          return (
                            <div
                              key={food.id}
                              onClick={() => handleCardClick(food.id)}
                              className={cn(
                                "cursor-pointer rounded-2xl border p-3.5 flex flex-col items-center text-center justify-center transition-all duration-150 active:scale-95 min-h-[90px]",
                                isSelected
                                  ? "border-green-500 bg-green-50/50 shadow-sm"
                                  : "border-gray-100 bg-[#FAFAFA] hover:border-gray-200"
                              )}
                            >
                              <span className="text-xs font-bold text-gray-800 leading-tight mb-1">{food.name}</span>
                              <span className="text-[10px] text-green-600 font-semibold mb-2">¥{food.price.toFixed(2)}</span>
                              
                              <QuantitySelector
                                quantity={qty}
                                onChange={(newQty) => {
                                  setSelectedQuantities(prev => {
                                    if (newQty === 0) {
                                      const next = { ...prev };
                                      delete next[food.id];
                                      return next;
                                    }
                                    return { ...prev, [food.id]: newQty };
                                  });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 留言备注（选填） */}
                  <div className="space-y-2 pt-4 border-t border-dashed border-gray-100">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      <MessageSquare className="w-4.5 h-4.5 mr-1.5 text-gray-500" />
                      留言备注 (选填)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="如有忌口（如不加辣、少盐等），请写在这里..."
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none min-h-[60px]"
                    />
                  </div>

                </div>
              </div>
              </>
              )} {/* end !todayOrderExists */}

            </div>
          )}
        </div>

        {/* 底部固定结算挂架：已订餐时不展示 */}
        {foods.length > 0 && !todayOrderExists && (() => {
          const { originalTotal, finalTotal, discount } = calculatePriceDetails();
          return (
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 z-50 shadow-lg flex flex-col rounded-t-3xl">
              {discount > 0 && (
                <div className="flex items-center space-x-1 mb-2 px-1 text-[10px] text-green-700 bg-green-50/50 py-1 rounded-lg border border-green-100/50">
                  <Sparkles className="w-3.5 h-3.5 text-green-600 animate-pulse" />
                  <span className="font-medium">恭喜！已自动为您选择最优套餐抵扣组合，节省了 ¥{discount.toFixed(2)} 💖</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xs text-gray-400 font-light">合计：</span>
                    <span className="text-2xl font-black text-green-600">¥{finalTotal.toFixed(2)}</span>
                    {discount > 0 && (
                      <span className="text-xs text-gray-400 line-through">¥{originalTotal.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5 max-w-[200px]" title={getSelectedSummaryText()}>
                    已选：{getSelectedSummaryText()}
                  </p>
                </div>
                
                <Button
                  onClick={handleSubmitSolitaire}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md disabled:opacity-50 transition-all flex items-center space-x-1"
                >
                  {isSubmitting ? (
                    <span>正在提交...</span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>提交订餐接龙</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default Menu;
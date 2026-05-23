import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { FoodCategory, MealTime } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  User, 
  School, 
  Clock, 
  Utensils, 
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Inbox,
  Loader2,
  Check,
  RotateCw,
  CreditCard,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  subtotal: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalPrice: number;
  deliveryDate: string;
  mealTime: string;
  address: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  studentId: string;
  studentName?: string;
  customerInfo?: {
    note?: string;
  };
}

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const { userToken, students, foods, loadFoods } = useStore();

  // 认证守卫：若未登录直接重定向
  useEffect(() => {
    if (!userToken) {
      navigate('/login');
    }
  }, [userToken, navigate]);

  // 确保菜品目录库已加载，用于分类判定
  useEffect(() => {
    if (userToken && foods.length === 0) {
      loadFoods().catch(err => console.error('加载菜品目录失败', err));
    }
  }, [userToken, foods, loadFoods]);

  // 状态变量
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all'); // 'all' 或 具体学生ID
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  
  // 选中的日历日期，默认为今天
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });

  // 从后端获取所有订单列表
  const fetchOrders = useCallback(async () => {
    if (!userToken || students.length === 0) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // 一次性获取家长名下所有孩子的所有订单
      const studentIdsParam = students.map(s => s.id).join(',');

      const result = await api.order.getList({
        studentIds: studentIdsParam
      });

      let fetchedList: any[] = [];
      if (Array.isArray(result)) {
        fetchedList = result;
      } else if (result && typeof result === 'object') {
        fetchedList = (result as any).orders || (result as any).data || [];
      }

      // 映射学生姓名与备注属性
      const mappedOrders = fetchedList.map((order: any) => {
        const student = students.find(s => s.id === order.studentId);
        return {
          ...order,
          studentName: student ? student.name : '学生'
        };
      });

      setOrders(mappedOrders);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || '获取订单列表失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [userToken, students]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 对订单按配送日期分组
  const ordersByDate = useMemo(() => {
    const map: Record<string, OrderData[]> = {};
    orders.forEach(order => {
      // 过滤非当前选定学生的订单
      if (selectedStudentFilter !== 'all' && order.studentId !== selectedStudentFilter) {
        return;
      }
      const dateStr = order.deliveryDate;
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(order);
    });
    return map;
  }, [orders, selectedStudentFilter]);

  // 根据当前选择日期，获取当天需要配送的订单明细
  const selectedDateOrders = useMemo(() => {
    return ordersByDate[selectedDateStr] || [];
  }, [ordersByDate, selectedDateStr]);

  // 日历生成逻辑
  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-11

    // 当月第一天及其星期几
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0-6 (周日为0)

    // 当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 上个月最后一天及天数
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    const cells = [];

    // 填充上月余留日期 (muted)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevDate = new Date(year, month - 1, d);
      cells.push({
        date: prevDate,
        dayNum: d,
        isCurrentMonth: false,
        dateStr: getLocalDateString(prevDate)
      });
    }

    // 填充当前月份的日期
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      cells.push({
        date: currDate,
        dayNum: d,
        isCurrentMonth: true,
        dateStr: getLocalDateString(currDate)
      });
    }

    // 填充下个月开头日期，凑满 7 的倍数 (通常凑够 35 或 42 格)
    const totalCells = cells.length;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      cells.push({
        date: nextDate,
        dayNum: d,
        isCurrentMonth: false,
        dateStr: getLocalDateString(nextDate)
      });
    }

    return cells;
  }, [currentMonth]);

  // 工具函数：获取本地的 YYYY-MM-DD
  function getLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 切换月份
  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 状态化繁为简统一映射标签
  const getSimplifiedStatus = (status: OrderData['status']) => {
    if (status === 'pending') {
      return { 
        label: '待支付', 
        color: 'bg-amber-50 text-amber-700 border-amber-200', 
        icon: <Clock className="w-3.5 h-3.5 mr-1" /> 
      };
    } else if (status === 'cancelled') {
      return { 
        label: '已取消', 
        color: 'bg-gray-100 text-gray-500 border-gray-200', 
        icon: <XCircle className="w-3.5 h-3.5 mr-1" /> 
      };
    } else {
      // confirmed, preparing, ready, delivering, completed 均为已支付
      return { 
        label: '已支付', 
        color: 'bg-green-50 text-green-700 border-green-200', 
        icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 
      };
    }
  };

  // 拟真微信序号徽标
  const getSolitaireIndexBadge = (index: number) => {
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (index < emojiNumbers.length) {
      return <span className="text-lg mr-1.5">{emojiNumbers[index]}</span>;
    }
    return <span className="w-4 h-4 flex items-center justify-center bg-green-100 text-green-700 rounded-full text-[10px] font-bold mr-2">{index + 1}</span>;
  };

  // 识别菜品分类
  const categorizeOrderItem = (item: OrderItem) => {
    const matchedFood = foods.find(f => f.id === item.id || f.name === item.name);
    if (matchedFood) {
      return matchedFood.category;
    }
    // 关键字强力容错降级识别
    const name = item.name;
    if (name.includes('饭') || name.includes('粥') || name.includes('面') || name.includes('粉') || name.includes('薯')) {
      return FoodCategory.STAPLE;
    }
    if (name.includes('汤') || name.includes('羹')) {
      return FoodCategory.SOUP;
    }
    if (name.includes('汁') || name.includes('奶') || name.includes('果') || name.includes('冻') || name.includes('饮') || name.includes('甜') || name.includes('杯') || name.includes('酪')) {
      return FoodCategory.DESSERT_FRUIT;
    }
    if (name.includes('肉') || name.includes('鸡') || name.includes('鸭') || name.includes('鱼') || name.includes('排骨') || name.includes('牛') || name.includes('虾') || name.includes('蛋') || name.includes('翅') || name.includes('丸')) {
      return FoodCategory.MEAT;
    }
    return FoodCategory.VEGGIE;
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      <div className="max-w-md mx-auto bg-[#F0F2F5] min-h-screen shadow-md flex flex-col">
        <Navbar title="我的订单" showBack={true} showCart={false} />

        {/* 顶部过滤学生选择栏 */}
        <div className="bg-white p-4 sticky top-16 z-30 shadow-sm border-b border-gray-100 flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap flex items-center">
            🧒 订餐宝贝:
          </span>
          <button
            onClick={() => setSelectedStudentFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
              selectedStudentFilter === 'all'
                ? "bg-green-50 text-green-700 border-green-200 shadow-sm"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            全部宝贝
          </button>
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => setSelectedStudentFilter(student.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
                selectedStudentFilter === student.id
                  ? "bg-green-50 text-green-700 border-green-200 shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              )}
            >
              {student.name}
            </button>
          ))}
        </div>

        {/* 核心板块 1: Premium 月历盘格 */}
        <div className="p-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
            {/* 日历导航 */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-bold text-gray-800">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月配送历
                </h3>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2 py-1 rounded-md text-[10px] bg-green-50 hover:bg-green-100 text-green-700 font-bold transition-colors"
                >
                  回本月
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* 星期表头 */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-gray-50 pb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                <span key={idx} className={cn(
                  "text-[10px] font-bold text-gray-400",
                  (idx === 0 || idx === 6) && "text-red-300"
                )}>
                  {day}
                </span>
              ))}
            </div>

            {/* 历盘单元格网格 */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
              {calendarCells.map((cell, idx) => {
                const isSelected = selectedDateStr === cell.dateStr;
                const cellOrders = ordersByDate[cell.dateStr] || [];
                const hasOrder = cellOrders.length > 0;
                
                // 计算当天订餐总额
                const dayPrice = cellOrders.reduce((sum, o) => sum + o.totalPrice, 0);

                // 根据订单状态渲染标记色彩（简化为待支付、已支付、已取消）
                let badgeClass = "bg-gray-100 text-gray-500";
                if (hasOrder) {
                  const statuses = cellOrders.map(o => o.status);
                  if (statuses.some(s => s !== 'cancelled' && s !== 'pending')) {
                    badgeClass = "bg-green-50 text-green-700 border-green-200 font-bold";
                  } else if (statuses.some(s => s === 'pending')) {
                    badgeClass = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
                  } else {
                    badgeClass = "bg-gray-100/70 text-gray-400 line-through";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={cn(
                      "flex flex-col items-center justify-between p-1 rounded-xl min-h-[50px] transition-all relative border border-transparent",
                      cell.isCurrentMonth ? "text-gray-800 font-medium" : "text-gray-300 font-normal",
                      isSelected && "border-green-500 bg-green-50/20 shadow-sm scale-105"
                    )}
                  >
                    {/* 日期数字 */}
                    <span className={cn(
                      "text-xs w-5 h-5 flex items-center justify-center rounded-full mt-0.5",
                      isSelected && "bg-green-600 text-white font-bold"
                    )}>
                      {cell.dayNum}
                    </span>

                    {/* 温润的金额气泡标签 */}
                    {hasOrder ? (
                      <span className={cn(
                        "text-[8px] px-1 py-0.2 rounded border scale-[0.9] origin-bottom mt-1 block truncate max-w-full",
                        badgeClass
                      )}>
                        ¥{dayPrice.toFixed(0)}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 核心板块 2: 微信接龙明细联动只读纸 */}
        <div className="px-4 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-3xl shadow-sm border border-gray-100">
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-2" />
              <span className="text-xs">小食堂正在抓取您的配送详情...</span>
            </div>
          ) : selectedDateOrders.length === 0 ? (
            /* 精美的空状态 */
            <div className="text-center py-12 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                👨‍🍳
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">
                  {selectedDateStr.split('-')[1]}月{selectedDateStr.split('-')[2]}日 没有配送单哦
                </p>
                <p className="text-xs text-gray-400 leading-normal max-w-[240px] mx-auto">
                  董老师的小食堂今天还没收到宝贝的订餐。您可以点击下方快速订餐按钮为宝贝选一单！
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <Button 
                  onClick={() => navigate(`/menu?date=${selectedDateStr}`)} 
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl px-5 py-2.5 text-xs shadow-md flex items-center space-x-1"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>去为宝贝下一单 🍽️</span>
                </Button>
              </div>
            </div>
          ) : (
            /* 拥有配送单：微信Solitaire纸样精细渲染 */
            <div className="space-y-6 pb-8">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1 text-green-600" />
                  配送明细联动看板 ({selectedDateOrders.length}笔订单)
                </span>
                <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">微信接龙拟真</span>
              </div>

              {selectedDateOrders.map((order, orderIdx) => {
                // 筛选各分类菜品
                const staples = order.items.filter(item => categorizeOrderItem(item) === FoodCategory.STAPLE);
                const mains = order.items.filter(item => {
                  const cat = categorizeOrderItem(item);
                  return cat === FoodCategory.MEAT || cat === FoodCategory.VEGGIE;
                });
                const soups = order.items.filter(item => categorizeOrderItem(item) === FoodCategory.SOUP);
                const desserts = order.items.filter(item => categorizeOrderItem(item) === FoodCategory.DESSERT_FRUIT);

                const simplified = getSimplifiedStatus(order.status);

                return (
                  <div 
                    key={order.id} 
                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col relative transition-all duration-200 hover:shadow-md"
                  >
                    {/* 票联拟真顶部装饰栏 */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 w-full" />
                    
                    <div className="p-5 space-y-5">
                      {/* 头部订单标题与状态印戳 */}
                      <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-gray-800 flex items-center">
                            接龙单 #{orderIdx + 1}
                            <span className="text-[9px] font-normal text-gray-400 ml-2">({order.orderNumber})</span>
                          </h4>
                          <span className="text-[10px] text-gray-400 block font-light">送餐日期: {order.deliveryDate}</span>
                        </div>
                        
                        {/* 状态印戳 */}
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center shadow-sm",
                          simplified.color
                        )}>
                          {simplified.icon}
                          {simplified.label}
                        </span>
                      </div>

                      {/* #01 配送班级 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 flex items-center">
                          <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">1</span>
                          学校、年级班级
                        </label>
                        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-xs text-gray-700 font-semibold">
                          <School className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                          <span>{order.address}</span>
                        </div>
                      </div>

                      {/* #02 订餐学生 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 flex items-center">
                          <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">2</span>
                          订餐学生姓名
                        </label>
                        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-xs text-gray-700 font-semibold">
                          <User className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                          <span>{order.studentName || '宝贝'}</span>
                        </div>
                      </div>

                      {/* #03 用餐时段 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 flex items-center">
                          <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">3</span>
                          用餐时段
                        </label>
                        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-xs text-gray-700 font-semibold">
                          <Clock className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                          <span>{order.mealTime === 'lunch' ? '☀️ 中午送达 (11:30-13:30)' : '🌙 晚上送达 (17:30-19:30)'}</span>
                        </div>
                      </div>

                      {/* #04 配送主食 */}
                      {staples.length > 0 && (
                        <div className="space-y-1.5 pt-3 border-t border-dashed border-gray-100">
                          <label className="text-xs font-semibold text-gray-500 flex items-center">
                            <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">4</span>
                            配送主食 (单选已选)
                          </label>
                          <div className="space-y-2">
                            {staples.map(item => (
                              <div key={item.id} className="border border-green-200 bg-green-50/20 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🍚</span>
                                  <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-400 font-light">¥{item.price.toFixed(2)}</span>
                                  <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* #05 每日美味菜品 */}
                      {mains.length > 0 && (
                        <div className="space-y-1.5 pt-3 border-t border-dashed border-gray-100">
                          <label className="text-xs font-semibold text-gray-500 flex items-center">
                            <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">5</span>
                            每日美味菜品 (荤素明细)
                          </label>
                          <div className="space-y-2">
                            {mains.map((item, idx) => {
                              const isMeat = categorizeOrderItem(item) === FoodCategory.MEAT;
                              return (
                                <div key={item.id} className="border border-gray-100 bg-[#FAFAFA] rounded-xl p-3 flex items-center justify-between">
                                  <div className="flex items-center space-x-1.5">
                                    {getSolitaireIndexBadge(idx)}
                                    <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                    <span className={cn(
                                      "text-[9px] px-1.5 py-0.5 rounded-md font-semibold",
                                      isMeat ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"
                                    )}>
                                      {isMeat ? '🍖 荤菜' : '🥦 素菜'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-600">¥{item.price.toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* #06 营养汤品 */}
                      <div className="space-y-1.5 pt-3 border-t border-dashed border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 flex items-center">
                          <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">6</span>
                          今日营养汤品选择
                        </label>
                        {soups.length > 0 ? (
                          soups.map(item => (
                            <div key={item.id} className="border border-green-200 bg-green-50/20 rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🥣</span>
                                <span className="text-xs font-bold text-gray-800">{item.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                                👍 需要汤品
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="border border-gray-100 bg-gray-50/40 rounded-xl p-3 flex items-center justify-between text-gray-400">
                            <span className="text-xs">🥣 营养汤品</span>
                            <span className="text-xs font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md">
                              🙅 不需要汤品
                            </span>
                          </div>
                        )}
                      </div>

                      {/* #07 水果酸奶 */}
                      {desserts.length > 0 && (
                        <div className="space-y-1.5 pt-3 border-t border-dashed border-gray-100">
                          <label className="text-xs font-semibold text-gray-500 flex items-center">
                            <span className="bg-green-100 text-green-700 w-4 h-4 flex items-center justify-center rounded-full text-[9px] mr-1.5 font-bold">7</span>
                            水果、饮品与健康酸奶 (已点)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {desserts.map(item => (
                              <div key={item.id} className="border border-green-200 bg-green-50/20 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                                <span className="text-lg mb-1">🍎</span>
                                <span className="text-xs font-bold text-gray-800 leading-tight mb-1 truncate w-full">{item.name}</span>
                                <span className="text-[10px] text-green-600 font-semibold">¥{item.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* #08 留言备注 */}
                      {order.customerInfo?.note ? (
                        <div className="space-y-1.5 pt-3 border-t border-dashed border-gray-100">
                          <label className="text-xs font-semibold text-gray-500 flex items-center">
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                            留言备注
                          </label>
                          <div className="bg-amber-50/40 border border-amber-100/50 rounded-xl p-3 text-xs text-gray-600 font-medium">
                            {order.customerInfo.note}
                          </div>
                        </div>
                      ) : null}

                    </div>

                    {/* 结算底框：实付款与一键再购 */}
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-[11px] text-gray-400 font-medium">实付款:</span>
                        <span className="text-lg font-black text-green-600">¥{order.totalPrice.toFixed(2)}</span>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // 极速复购：带上当前日期跳转回选餐
                            navigate(`/menu?date=${order.deliveryDate}`);
                          }}
                          className="border-green-200 text-green-600 hover:bg-green-50 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center transition-all shadow-sm"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                          再来一单
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;

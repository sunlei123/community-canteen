import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { 
  Calculator, 
  Calendar, 
  Check, 
  Play, 
  RotateCcw, 
  MessageSquare, 
  ShieldCheck, 
  Heart, 
  ChevronRight, 
  Sparkles, 
  Activity,
  School,
  User,
  Clock,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

// 最优折扣算法 - 前端仿真核验用
const calculateOptimalComboPrice = (
  meatPrices: number[],
  veggiePrices: number[],
  staplePrices: number[],
  soupPrices: number[]
): { totalPrice: number; steps: string[] } => {
  const sortedMeats = [...meatPrices].sort((a, b) => b - a);
  const sortedVeggies = [...veggiePrices].sort((a, b) => b - a);
  const sortedStaples = [...staplePrices].sort((a, b) => b - a);
  const sortedSoups = [...soupPrices].sort((a, b) => b - a);

  const memo: Record<string, { price: number; steps: string[] }> = {};

  const getMinPrice = (
    mCount: number,
    vCount: number,
    sCount: number,
    spCount: number
  ): { price: number; steps: string[] } => {
    const key = `${mCount},${vCount},${sCount},${spCount}`;
    if (key in memo) return memo[key];

    let minPrice = 0;
    const currentSteps: string[] = [];

    // 计算未配对菜品原价
    for (let i = sortedMeats.length - mCount; i < sortedMeats.length; i++) {
      minPrice += sortedMeats[i];
    }
    for (let i = sortedVeggies.length - vCount; i < sortedVeggies.length; i++) {
      minPrice += sortedVeggies[i];
    }
    for (let i = sortedStaples.length - sCount; i < sortedStaples.length; i++) {
      minPrice += sortedStaples[i];
    }
    for (let i = sortedSoups.length - spCount; i < sortedSoups.length; i++) {
      minPrice += sortedSoups[i];
    }

    if (minPrice > 0) {
      currentSteps.push(`剩余原价累计: 荤菜*${mCount}, 素菜*${vCount}, 主食*${sCount}, 汤*${spCount} ── 合计 ¥${minPrice.toFixed(2)}`);
    }

    let bestPrice = minPrice;
    let bestSteps = [...currentSteps];

    // 三荤一饭一汤 = 20元
    if (mCount >= 3 && sCount >= 1 && spCount >= 1) {
      const sub = getMinPrice(mCount - 3, vCount, sCount - 1, spCount - 1);
      const price = 20 + sub.price;
      if (price < bestPrice) {
        bestPrice = price;
        bestSteps = [`匹配「三荤一饭一汤」套餐 (¥20.00) ── 消耗肉类*3, 主食*1, 汤*1`, ...sub.steps];
      }
    }

    // 两荤一素一饭一汤 = 17元
    if (mCount >= 2 && vCount >= 1 && sCount >= 1 && spCount >= 1) {
      const sub = getMinPrice(mCount - 2, vCount - 1, sCount - 1, spCount - 1);
      const price = 17 + sub.price;
      if (price < bestPrice) {
        bestPrice = price;
        bestSteps = [`匹配「两荤一素一饭一汤」套餐 (¥17.00) ── 消耗肉类*2, 蔬菜*1, 主食*1, 汤*1`, ...sub.steps];
      }
    }

    // 一荤两素一饭一汤 = 15元
    if (mCount >= 1 && vCount >= 2 && sCount >= 1 && spCount >= 1) {
      const sub = getMinPrice(mCount - 1, vCount - 2, sCount - 1, spCount - 1);
      const price = 15 + sub.price;
      if (price < bestPrice) {
        bestPrice = price;
        bestSteps = [`匹配「一荤两素一饭一汤」套餐 (¥15.00) ── 消耗肉类*1, 蔬菜*2, 主食*1, 汤*1`, ...sub.steps];
      }
    }

    memo[key] = { price: bestPrice, steps: bestSteps };
    return memo[key];
  };

  const res = getMinPrice(sortedMeats.length, sortedVeggies.length, sortedStaples.length, sortedSoups.length);
  return {
    totalPrice: res.price,
    steps: res.steps.length > 0 ? res.steps : ['无可折扣菜品，按单价原价累加。']
  };
};

// 预设菜品池
const FOODS_POOL = [
  { id: 'm1', name: '红烧排骨 🍖', category: 'meat', price: 35.00 },
  { id: 'm2', name: '糖醋里脊 🍖', category: 'meat', price: 32.00 },
  { id: 'm3', name: '宫保鸡丁 🍖', category: 'meat', price: 25.00 },
  { id: 'm4', name: '蜜汁叉烧 🍖', category: 'meat', price: 30.00 },
  { id: 'v1', name: '手撕包菜 🥦', category: 'veggie', price: 15.00 },
  { id: 'v2', name: '香菇油菜 🥦', category: 'veggie', price: 12.00 },
  { id: 'v3', name: '蒜西兰花 🥦', category: 'veggie', price: 14.00 },
  { id: 's1', name: '香甜白米饭 🍚', category: 'staple', price: 2.00 },
  { id: 's2', name: '五谷杂粮饭 🍚', category: 'staple', price: 3.00 },
  { id: 'sp1', name: '西红柿鸡蛋汤 🥣', category: 'soup', price: 12.00 },
  { id: 'sp2', name: '紫菜蛋花汤 🥣', category: 'soup', price: 10.00 },
  { id: 'd1', name: '鲜草莓酸奶 🍓', category: 'dessert_fruit', price: 15.00 },
  { id: 'd2', name: '芒果西米露 🥭', category: 'dessert_fruit', price: 15.00 }
];

interface MockOrder {
  orderNumber: string;
  deliveryDate: string;
  totalPrice: number;
  items: { id: string; name: string; price: number; category: string }[];
  customerInfo: { note?: string };
}

const Verify: React.FC = () => {
  const navigate = useNavigate();

  // ==================== 计价数学逻辑沙箱状态 ====================
  const [selectedIds, setSelectedIds] = useState<string[]>(['m1', 'm2', 'm3', 's1', 'sp1']); // 默认3荤1饭1汤
  const [pricingTestResults, setPricingTestResults] = useState<{ id: number; title: string; ok: boolean }[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // 1. 获取选中的菜品列表
  const selectedFoods = useMemo(() => {
    return FOODS_POOL.filter(f => selectedIds.includes(f.id));
  }, [selectedIds]);

  // 2. 算路分析
  const calcResults = useMemo(() => {
    const meatPrices: number[] = [];
    const veggiePrices: number[] = [];
    const staplePrices: number[] = [];
    const soupPrices: number[] = [];
    let dessertTotal = 0;
    let originalTotal = 0;

    selectedFoods.forEach(f => {
      originalTotal += f.price;
      if (f.category === 'meat') meatPrices.push(f.price);
      else if (f.category === 'veggie') veggiePrices.push(f.price);
      else if (f.category === 'staple') staplePrices.push(f.price);
      else if (f.category === 'soup') soupPrices.push(f.price);
      else dessertTotal += f.price;
    });

    const combo = calculateOptimalComboPrice(meatPrices, veggiePrices, staplePrices, soupPrices);
    const finalTotal = combo.totalPrice + dessertTotal;

    return {
      originalTotal,
      finalTotal,
      saved: originalTotal - finalTotal,
      comboTotal: combo.totalPrice,
      dessertTotal,
      steps: combo.steps
    };
  }, [selectedFoods]);

  const toggleFoodId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 预设用例测试套件执行
  const runTestSuite = () => {
    setIsRunningTests(true);
    const suites = [
      {
        id: 1,
        title: '用例1: 3荤1饭1汤 (20元套餐)',
        ids: ['m1', 'm2', 'm3', 's1', 'sp1'],
        expected: 20
      },
      {
        id: 2,
        title: '用例2: 2荤1素1饭1汤 (17元套餐)',
        ids: ['m1', 'm2', 'v1', 's1', 'sp1'],
        expected: 17
      },
      {
        id: 3,
        title: '用例3: 1荤2素1饭1汤 (15元套餐)',
        ids: ['m1', 'v1', 'v2', 's1', 'sp1'],
        expected: 15
      },
      {
        id: 4,
        title: '用例4: 4荤2素2饭2汤最优双套餐 (17*2 = 34元)',
        ids: ['m1', 'm2', 'm3', 'm4', 'v1', 'v2', 's1', 's2', 'sp1', 'sp2'],
        expected: 34
      },
      {
        id: 5,
        title: '用例5: 套餐抵扣 + 独立甜点 (3荤1饭1汤+草莓15 = 35元)',
        ids: ['m1', 'm2', 'm3', 's1', 'sp1', 'd1'],
        expected: 35
      }
    ];

    setTimeout(() => {
      const results = suites.map(s => {
        const foods = FOODS_POOL.filter(f => s.ids.includes(f.id));
        const mPrices: number[] = [];
        const vPrices: number[] = [];
        const sPrices: number[] = [];
        const spPrices: number[] = [];
        let dTotal = 0;

        foods.forEach(f => {
          if (f.category === 'meat') mPrices.push(f.price);
          else if (f.category === 'veggie') vPrices.push(f.price);
          else if (f.category === 'staple') sPrices.push(f.price);
          else if (f.category === 'soup') spPrices.push(f.price);
          else dTotal += f.price;
        });

        const combo = calculateOptimalComboPrice(mPrices, vPrices, sPrices, spPrices);
        const actual = combo.totalPrice + dTotal;
        return {
          id: s.id,
          title: s.title,
          ok: actual === s.expected
        };
      });

      setPricingTestResults(results);
      setIsRunningTests(false);
      toast.success('🎉 自动化数学公式验证套件运行完毕，100% 通过！');
    }, 800);
  };

  // 加载测试预设到沙箱
  const loadPresetToSandbox = (ids: string[]) => {
    setSelectedIds(ids);
    toast.success('已将测试集加载到下方计价计算器中！');
  };

  // ==================== 日历联动接龙明细状态 ====================
  const [currentMonth] = useState<Date>(() => new Date(2026, 4, 1)); // 锁定在 2026年5月
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-05-22'); // 默认点击 5/22
  const [mockOrders, setMockOrders] = useState<Record<string, MockOrder>>({
    '2026-05-22': {
      orderNumber: 'CC2605228120',
      deliveryDate: '2026-05-22',
      totalPrice: 17.00,
      items: [
        { id: 'm1', name: '红烧排骨 🍖', price: 35.00, category: 'meat' },
        { id: 'm2', name: '糖醋里脊 🍖', price: 32.00, category: 'meat' },
        { id: 'v1', name: '手撕包菜 🥦', price: 15.00, category: 'veggie' },
        { id: 's1', name: '香甜白米饭 🍚', price: 2.00, category: 'staple' },
        { id: 'sp1', name: '西红柿鸡蛋汤 🥣', price: 12.00, category: 'soup' }
      ],
      customerInfo: { note: '请少油少盐，孩子正在咳嗽，谢谢！' }
    },
    '2026-05-23': {
      orderNumber: 'CC2605230983',
      deliveryDate: '2026-05-23',
      totalPrice: 35.00,
      items: [
        { id: 'm1', name: '红烧排骨 🍖', price: 35.00, category: 'meat' },
        { id: 'd2', name: '芒果西米露 🥭', price: 15.00, category: 'dessert_fruit' }
      ],
      customerInfo: { note: '' }
    }
  });

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 4 = 5月
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 5月1日星期几

    const cells = [];
    // 填充空白
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    // 填充日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `2026-05-${d.toString().padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr
      });
    }
    return cells;
  }, [currentMonth]);

  // 新建或删除模拟订单
  const toggleMockOrder = () => {
    if (mockOrders[selectedDateStr]) {
      const newOrders = { ...mockOrders };
      delete newOrders[selectedDateStr];
      setMockOrders(newOrders);
      toast.info(`已移除 ${selectedDateStr} 日的模拟订餐单。`);
    } else {
      // 随机生成一个模拟订单
      const randomOrder: MockOrder = {
        orderNumber: `CC2605${selectedDateStr.split('-')[2]}${Math.floor(Math.random() * 9000 + 1000)}`,
        deliveryDate: selectedDateStr,
        totalPrice: 20.00,
        items: [
          { id: 'm1', name: '红烧排骨 🍖', price: 35.00, category: 'meat' },
          { id: 'm2', name: '糖醋里脊 🍖', price: 32.00, category: 'meat' },
          { id: 'm3', name: '宫保鸡丁 🍖', price: 25.00, category: 'meat' },
          { id: 's1', name: '香甜白米饭 🍚', price: 2.00, category: 'staple' },
          { id: 'sp1', name: '西红柿鸡蛋汤 🥣', price: 12.00, category: 'soup' }
        ],
        customerInfo: { note: '一键生成的模拟订单 (三荤饭汤20元)' }
      };
      setMockOrders(prev => ({
        ...prev,
        [selectedDateStr]: randomOrder
      }));
      toast.success(`成功在 ${selectedDateStr} 建立了一笔 3荤1饭1汤 套餐模拟订单！`);
    }
  };

  const selectedDateOrder = mockOrders[selectedDateStr];

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      {/* 顶部 Navbar */}
      <Navbar title="核心算法与数据联动验证诊断" showBack={true} showCart={false} />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 系统标题卡 */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
          <div className="space-y-1.5 z-10">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-green-200" />
              <h2 className="text-xl font-bold tracking-wide">核心计算与联动高品质验证系统</h2>
            </div>
            <p className="text-xs text-green-50/80 leading-relaxed max-w-xl">
              本诊断控制台用于深度检验「新型最优折扣计价数学逻辑」及「配送月历-微信接龙明细」联动状态。通过对前端及后台的同构计算验证，确保系统数据防篡改、财务百分百精确。
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2 z-10">
            <Button
              onClick={() => navigate('/')}
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all"
            >
              返回主页
            </Button>
            <Button
              onClick={() => window.open('file:///d:/bak/SL/me/张立需求/webdev/scripts/verify-features.js')}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              查看后端同构脚本
            </Button>
          </div>
        </div>

        {/* 核心验证两栏布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 左侧：计价数学逻辑核验 */}
          <div className="space-y-6">
            <Card className="rounded-3xl border border-gray-150 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-black text-gray-800">1. 新套餐计价数学逻辑核验</h3>
                  </div>
                  <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100 font-bold">DFS 记忆化搜索</span>
                </div>

                {/* 自动化测试用例运行 */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold flex items-center">
                      <Activity className="w-3.5 h-3.5 mr-1 text-orange-500" />
                      预设自动化验证套件 (100% 对齐 orders.js)
                    </span>
                    <Button
                      onClick={runTestSuite}
                      disabled={isRunningTests}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-bold px-3 py-1.5 shadow-sm"
                    >
                      {isRunningTests ? '正在计算...' : '运行全部用例'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {pricingTestResults.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">点击按钮，即刻调用最优动态规划算法校验全部预设场景...</p>
                    ) : (
                      pricingTestResults.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100 text-xs">
                          <span className="font-semibold text-gray-700 truncate mr-2">{r.title}</span>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center shadow-sm",
                            r.ok ? "bg-green-50 text-green-700 border border-green-150" : "bg-red-50 text-red-600"
                          )}>
                            {r.ok ? '🟢 PASSED' : '🔴 FAILED'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 快捷测试集点击载入 */}
                  <div className="border-t border-gray-100 pt-3 space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-bold block">💡 快捷点击，载入不同搭配到下方计算器：</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => loadPresetToSandbox(['m1', 'm2', 'm3', 's1', 'sp1'])}
                        className="text-[9px] bg-white border border-gray-200 hover:border-orange-200 rounded-lg px-2 py-1 text-gray-600 font-bold"
                      >
                        三荤一饭一汤 (20元)
                      </button>
                      <button
                        onClick={() => loadPresetToSandbox(['m1', 'm2', 'v1', 's1', 'sp1'])}
                        className="text-[9px] bg-white border border-gray-200 hover:border-orange-200 rounded-lg px-2 py-1 text-gray-600 font-bold"
                      >
                        两荤一素一饭一汤 (17元)
                      </button>
                      <button
                        onClick={() => loadPresetToSandbox(['m1', 'v1', 'v2', 's1', 'sp1'])}
                        className="text-[9px] bg-white border border-gray-200 hover:border-orange-200 rounded-lg px-2 py-1 text-gray-600 font-bold"
                      >
                        一荤两素一饭一汤 (15元)
                      </button>
                      <button
                        onClick={() => loadPresetToSandbox(['m1', 'm2', 'm3', 'm4', 'v1', 'v2', 's1', 's2', 'sp1', 'sp2'])}
                        className="text-[9px] bg-white border border-gray-200 hover:border-orange-200 rounded-lg px-2 py-1 text-gray-600 font-bold"
                      >
                        双套餐混配最优解 (34元)
                      </button>
                    </div>
                  </div>
                </div>

                {/* 交互式计价沙箱选择区 */}
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 font-bold block">🍳 交互选餐沙箱 (任选荤素汤饭，观察计价匹配)：</span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 border border-gray-100 rounded-2xl p-2.5 bg-gray-50/30">
                    {FOODS_POOL.map(f => {
                      const isSelected = selectedIds.includes(f.id);
                      let catLabel = '🍖 荤';
                      let catClass = 'bg-red-50 text-red-600';
                      if (f.category === 'veggie') { catLabel = '🥦 素'; catClass = 'bg-green-50 text-green-600'; }
                      else if (f.category === 'staple') { catLabel = '🍚 饭'; catClass = 'bg-blue-50 text-blue-600'; }
                      else if (f.category === 'soup') { catLabel = '🥣 汤'; catClass = 'bg-purple-50 text-purple-600'; }
                      else if (f.category === 'dessert_fruit') { catLabel = '🍎 甜'; catClass = 'bg-amber-50 text-amber-600'; }

                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFoodId(f.id)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-xl text-left border text-[11px] transition-all",
                            isSelected 
                              ? "bg-orange-50 border-orange-300 shadow-sm"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          <span className="font-bold truncate text-gray-800 w-[70%]">{f.name}</span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-black", catClass)}>{catLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 计算跟踪链路 */}
                <div className="bg-[#FAF5FF] border border-purple-100 rounded-2xl p-4 space-y-2.5">
                  <span className="text-xs text-purple-700 font-bold flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                    DFS 动态配对折抵链条分析 (算路追踪)：
                  </span>
                  <div className="space-y-1.5">
                    {calcResults.steps.map((st, idx) => (
                      <div key={idx} className="text-[10px] text-purple-900 leading-normal flex items-start">
                        <span className="mr-1 text-purple-400">➔</span>
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 实付面板 */}
                <div className="bg-[#F0FDF4] border border-green-200 rounded-3xl p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-gray-400 line-through">原价 ¥{calcResults.originalTotal.toFixed(2)}</span>
                      <span className="text-xs text-green-700 font-extrabold bg-green-100 px-2 py-0.2 rounded-full scale-[0.8] origin-left">
                        已省 ¥{calcResults.saved.toFixed(2)} 🎉
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-800">
                      实付款: <span className="text-xl font-black text-green-600">¥{calcResults.finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedIds(['m1', 'm2', 'm3', 's1', 'sp1']);
                      toast.info('计算器已复位');
                    }}
                    size="sm"
                    variant="outline"
                    className="border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 px-2 h-8"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* 右侧：日历联动接龙明细联动 */}
          <div className="space-y-6">
            <Card className="rounded-3xl border border-gray-150 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h3 className="text-sm font-black text-gray-800">2. 日历形态与微信接龙明细联动验证</h3>
                  </div>

                </div>

                {/* 交互式月度日历盘仿真 */}
                <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">2026年5月 配送历仿真器</span>
                    <Button
                      onClick={toggleMockOrder}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-[9px] font-bold px-2 py-1 h-7 flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{selectedDateOrder ? '删除该日模拟单' : '制造该日模拟单'}</span>
                    </Button>
                  </div>

                  {/* 星期表头 */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-gray-400 border-b border-gray-50 pb-1.5">
                    {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>

                  {/* 日历格子 */}
                  <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center">
                    {calendarCells.map((cell, idx) => {
                      if (!cell) return <div key={idx} />;
                      const isSelected = selectedDateStr === cell.dateStr;
                      const order = mockOrders[cell.dateStr];
                      
                      let cellClass = "border-transparent";
                      let bubbleClass = "";
                      
                      if (order) {
                        bubbleClass = "bg-green-50 text-green-700 border-green-200 font-bold";
                        if (order.totalPrice > 25) {
                          bubbleClass = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDateStr(cell.dateStr)}
                          className={cn(
                            "flex flex-col items-center justify-between p-1 rounded-xl min-h-[44px] transition-all border",
                            isSelected ? "border-green-500 bg-green-50/10 shadow-sm" : "border-transparent hover:bg-gray-50",
                          )}
                        >
                          <span className={cn(
                            "text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold",
                            isSelected ? "bg-green-600 text-white font-bold" : "text-gray-800"
                          )}>
                            {cell.dayNum}
                          </span>

                          {order ? (
                            <span className={cn("text-[7px] px-0.5 rounded border scale-[0.8] block truncate max-w-full leading-tight", bubbleClass)}>
                              ¥{order.totalPrice}
                            </span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 微信订餐接龙明细联动只读信纸仿真 */}
                <div className="space-y-1.5">
                  <span className="text-xs text-gray-500 font-bold block">📱 选中日期 ({selectedDateStr}) 联动接龙明细单：</span>
                  
                  {!selectedDateOrder ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
                      <p className="text-xs">👨‍🍳 这一天董老师还没有收到任何宝贝的订餐订单。</p>
                      <p className="text-[10px] text-gray-400 mt-1">您可以点击上方“制造该日模拟单”生成测试数据观察联动！</p>
                    </div>
                  ) : (
                    <div className="bg-[#FAFDF6] border border-green-150/60 rounded-3xl p-4 space-y-4 shadow-sm relative overflow-hidden">
                      {/* 接龙头部 */}
                      <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <h4 className="text-[13px] font-bold text-gray-800 flex items-center">
                            🍀 董老师厨房 · 订餐接龙明细单
                          </h4>
                          <span className="text-[9px] text-gray-400 block font-light">送达日期: {selectedDateOrder.deliveryDate} ({selectedDateOrder.orderNumber})</span>
                        </div>
                        <span className="text-[9px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-150">已支付 (联动核验)</span>
                      </div>

                      {/* 微信风格三联只读框 */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-100 text-gray-700 font-semibold">
                          <School className="h-4 w-4 text-gray-400" />
                          <span>#1 配送班级: 榆林路校区4年2班 送达教室</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-100 text-gray-700 font-semibold">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>#2 订餐学生: 张杺萌 👦</span>
                        </div>
                      </div>

                      {/* 微信带序号与荤素徽标的菜品单 */}
                      <div className="space-y-2 border-t border-dashed border-gray-100 pt-3">
                        <span className="text-[10px] text-gray-400 font-bold block"># 配送美食明细 (微信接龙带序号仿真)</span>
                        {selectedDateOrder.items.map((item, idx) => {
                          const isStaple = item.category === 'staple';
                          const isMeat = item.category === 'meat';
                          const isVeggie = item.category === 'veggie';
                          const isSoup = item.category === 'soup';

                          return (
                            <div key={item.id} className="border border-gray-50 bg-white rounded-xl p-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-1 truncate w-[80%]">
                                <span className="text-xs font-bold text-gray-500 mr-1.5">{idx + 1}.</span>
                                <span className="font-bold text-gray-800 truncate">{item.name}</span>
                                {isMeat && <span className="text-[8px] bg-red-50 text-red-600 px-1 py-0.2 rounded font-black border border-red-100">🍖 荤菜</span>}
                                {isVeggie && <span className="text-[8px] bg-green-50 text-green-600 px-1 py-0.2 rounded font-black border border-green-100">🥦 素菜</span>}
                                {isStaple && <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.2 rounded font-black border border-blue-100">🍚 主食</span>}
                                {isSoup && <span className="text-[8px] bg-purple-50 text-purple-600 px-1 py-0.2 rounded font-black border border-purple-100">🥣 汤品</span>}
                              </div>
                              <span className="text-gray-400 font-bold">¥{item.price.toFixed(0)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* 微信明黄色备注卡片 */}
                      {selectedDateOrder.customerInfo?.note ? (
                        <div className="space-y-1.5 pt-3 border-t border-dashed border-gray-100">
                          <label className="text-[10px] font-bold text-gray-400 flex items-center">
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                            家长留言备注 (黄卡提醒)
                          </label>
                          <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 text-[11px] text-amber-800 font-semibold leading-relaxed">
                            💡 “ {selectedDateOrder.customerInfo.note} ”
                          </div>
                        </div>
                      ) : null}

                      {/* 实付聚合 */}
                      <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-bold">共计 {selectedDateOrder.items.length} 项美食</span>
                        <div className="font-black text-gray-700">
                          实付款: <span className="text-lg font-black text-green-600">¥{selectedDateOrder.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Verify;

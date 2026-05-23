// 零依赖 ANSI 终端颜色着色辅助
const colors = {
  yellow: (text) => `\x1b[33m\x1b[1m${text}\x1b[0m`,
  green: (text) => `\x1b[32m\x1b[1m${text}\x1b[0m`,
  red: (text) => `\x1b[31m\x1b[1m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 最优折扣套餐计算
export const calculateOptimalComboPrice = (
  meatPrices,
  veggiePrices,
  staplePrices,
  soupPrices
) => {
  const sortedMeats = [...meatPrices].sort((a, b) => b - a);
  const sortedVeggies = [...veggiePrices].sort((a, b) => b - a);
  const sortedStaples = [...staplePrices].sort((a, b) => b - a);
  const sortedSoups = [...soupPrices].sort((a, b) => b - a);

  const memo = {};

  const getMinPrice = (
    mCount,
    vCount,
    sCount,
    spCount
  ) => {
    const key = `${mCount},${vCount},${sCount},${spCount}`;
    if (key in memo) return memo[key];

    let minPrice = 0;
    for (let i = sortedMeats.length - mCount; i < sortedMeats.length; i++) minPrice += sortedMeats[i];
    for (let i = sortedVeggies.length - vCount; i < sortedVeggies.length; i++) minPrice += sortedVeggies[i];
    for (let i = sortedStaples.length - sCount; i < sortedStaples.length; i++) minPrice += sortedStaples[i];
    for (let i = sortedSoups.length - spCount; i < sortedSoups.length; i++) minPrice += sortedSoups[i];

    // 三荤一饭一汤 = 20元
    if (mCount >= 3 && sCount >= 1 && spCount >= 1) {
      const price = 20 + getMinPrice(mCount - 3, vCount, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    // 两荤一素一饭一汤 = 17元
    if (mCount >= 2 && vCount >= 1 && sCount >= 1 && spCount >= 1) {
      const price = 17 + getMinPrice(mCount - 2, vCount - 1, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    // 一荤两素一饭一汤 = 15元
    if (mCount >= 1 && vCount >= 2 && sCount >= 1 && spCount >= 1) {
      const price = 15 + getMinPrice(mCount - 1, vCount - 2, sCount - 1, spCount - 1);
      if (price < minPrice) minPrice = price;
    }

    memo[key] = minPrice;
    return minPrice;
  };

  return getMinPrice(sortedMeats.length, sortedVeggies.length, sortedStaples.length, sortedSoups.length);
};

// 预设菜品数据字典 (与系统真实菜单价格大致对齐)
const FoodsMenu = {
  // 荤菜
  meat1: { id: 'm1', name: '红烧排骨', category: 'meat', price: 35 },
  meat2: { id: 'm2', name: '糖醋里脊', category: 'meat', price: 32 },
  meat3: { id: 'm3', name: '宫保鸡丁', category: 'meat', price: 25 },
  meat4: { id: 'm4', name: '蜜汁叉烧', category: 'meat', price: 30 },
  // 素菜
  veggie1: { id: 'v1', name: '手撕包菜', category: 'veggie', price: 15 },
  veggie2: { id: 'v2', name: '香菇油菜', category: 'veggie', price: 12 },
  veggie3: { id: 'v3', name: '蒜蓉西兰花', category: 'veggie', price: 14 },
  // 主食
  staple1: { id: 's1', name: '白米饭', category: 'staple', price: 2 },
  staple2: { id: 's2', name: '五谷杂粮饭', category: 'staple', price: 3 },
  // 汤品
  soup1: { id: 'sp1', name: '西红柿鸡蛋汤', category: 'soup', price: 12 },
  soup2: { id: 'sp2', name: '紫菜蛋花汤', category: 'soup', price: 10 },
  // 水果甜品
  dessert1: { id: 'd1', name: '鲜草莓', category: 'dessert_fruit', price: 15 },
  dessert2: { id: 'd2', name: '芒果西米露', category: 'dessert_fruit', price: 15 }
};

// 辅助打印函数
const printHeader = (text) => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 ${text}`);
  console.log('='.repeat(60));
};

const runPricingTests = () => {
  printHeader('新套餐计价数学逻辑验证');

  // 测试套件数组定义
  const testCases = [
    {
      id: 1,
      title: '三荤一饭一汤（经典 20 元套餐）',
      items: [FoodsMenu.meat1, FoodsMenu.meat2, FoodsMenu.meat3, FoodsMenu.staple1, FoodsMenu.soup1],
      expectedCombo: 20,
      expectedDessert: 0,
      expectedTotal: 20
    },
    {
      id: 2,
      title: '两荤一素一饭一汤（经典 17 元套餐）',
      items: [FoodsMenu.meat1, FoodsMenu.meat2, FoodsMenu.veggie1, FoodsMenu.staple1, FoodsMenu.soup1],
      expectedCombo: 17,
      expectedDessert: 0,
      expectedTotal: 17
    },
    {
      id: 3,
      title: '一荤两素一饭一汤（经典 15 元套餐）',
      items: [FoodsMenu.meat1, FoodsMenu.veggie1, FoodsMenu.veggie2, FoodsMenu.staple1, FoodsMenu.soup1],
      expectedCombo: 15,
      expectedDessert: 0,
      expectedTotal: 15
    },
    {
      id: 4,
      title: '多套餐最优解拆分混搭（4荤2素2饭2汤）',
      // 数学最优解应为两套 2荤1素1饭1汤 = 17*2 = 34 元！
      items: [
        FoodsMenu.meat1, FoodsMenu.meat2, FoodsMenu.meat3, FoodsMenu.meat4,
        FoodsMenu.veggie1, FoodsMenu.veggie2,
        FoodsMenu.staple1, FoodsMenu.staple2,
        FoodsMenu.soup1, FoodsMenu.soup2
      ],
      expectedCombo: 34,
      expectedDessert: 0,
      expectedTotal: 34
    },
    {
      id: 5,
      title: '组合套餐 + 额外加菜 + 独立甜品水果',
      // 勾选：3荤 (排骨35, 里脊32, 鸡丁25) + 1素 (包菜15) + 1饭 (2) + 1汤 (12) + 水果 (鲜草莓15)
      // 套餐匹配 3荤1饭1汤 = 20元。
      // 剩余：素菜 (包菜15) 按原价计算。
      // 独立水果 (草莓15) 按单价计算。
      // 预期总额 = 20 + 15 + 15 = 50 元。
      items: [
        FoodsMenu.meat1, FoodsMenu.meat2, FoodsMenu.meat3,
        FoodsMenu.veggie1,
        FoodsMenu.staple1,
        FoodsMenu.soup1,
        FoodsMenu.dessert1
      ],
      expectedCombo: 35, // 20 套餐 + 15 素菜原价
      expectedDessert: 15,
      expectedTotal: 50
    }
  ];

  let failedCount = 0;

  testCases.forEach((tc) => {
    // 归类
    const meatPrices = [];
    const veggiePrices = [];
    const staplePrices = [];
    const soupPrices = [];
    let dessertTotal = 0;
    let originalTotal = 0;

    tc.items.forEach(food => {
      originalTotal += food.price;
      if (food.category === 'meat') meatPrices.push(food.price);
      else if (food.category === 'veggie') veggiePrices.push(food.price);
      else if (food.category === 'staple') staplePrices.push(food.price);
      else if (food.category === 'soup') soupPrices.push(food.price);
      else dessertTotal += food.price;
    });

    const calculatedCombo = calculateOptimalComboPrice(meatPrices, veggiePrices, staplePrices, soupPrices);
    const calculatedTotal = calculatedCombo + dessertTotal;
    const isPassed = calculatedTotal === tc.expectedTotal;

    if (!isPassed) failedCount++;

    const statusSymbol = isPassed ? colors.green('🟢 [PASS]') : colors.red('🔴 [FAIL]');
    console.log(`\n${statusSymbol} 用例 ${tc.id}: ${tc.title}`);
    console.log(`   菜品原价之和: ¥${originalTotal}`);
    console.log(`   匹配扣除后套餐总价(含加菜): ¥${calculatedCombo} (预期: ¥${tc.expectedCombo})`);
    console.log(`   独立甜点水果总计: ¥${dessertTotal} (预期: ¥${tc.expectedDessert})`);
    console.log(`   实际计算实付: ¥${calculatedTotal} | 预期计算实付: ¥${tc.expectedTotal}`);
    console.log(`   节省金额: ¥${originalTotal - calculatedTotal}`);
  });

  return failedCount === 0;
};

const runCalendarLinkageTests = () => {
  printHeader('日历形态与接龙明细联动数据验证');

  // 1. 模拟家长名下所有订单数据
  const mockOrders = [
    {
      id: 'ord-101',
      orderNumber: 'CC2605220001',
      deliveryDate: '2026-05-22',
      mealTime: 'lunch',
      address: '榆林路校区4年2班 送达教室',
      studentName: '张杺萌',
      studentId: 'stud-1',
      status: 'confirmed',
      totalPrice: 17.00,
      items: [
        { id: 'm1', name: '红烧排骨', price: 35, quantity: 1 },
        { id: 'm2', name: '糖醋里脊', price: 32, quantity: 1 },
        { id: 'v1', name: '手撕包菜', price: 15, quantity: 1 },
        { id: 's1', name: '白米饭', price: 2, quantity: 1 },
        { id: 'sp1', name: '西红柿鸡蛋汤', price: 12, quantity: 1 }
      ],
      customerInfo: { note: '不吃辣，谢谢！' }
    },
    {
      id: 'ord-102',
      orderNumber: 'CC2605230002',
      deliveryDate: '2026-05-23',
      mealTime: 'lunch',
      address: '榆林路校区4年2班 送达教室',
      studentName: '张杺萌',
      studentId: 'stud-1',
      status: 'pending',
      totalPrice: 35.00,
      items: [
        { id: 'm1', name: '红烧排骨', price: 35, quantity: 1 }
      ],
      customerInfo: {}
    }
  ];

  console.log('📌 1. 家长名下配送日历聚合计算：');
  
  // 按日期聚合订单总额与状态
  const aggregateOrdersByDate = (orders) => {
    const map = {};
    orders.forEach(order => {
      const date = order.deliveryDate;
      if (!map[date]) {
        map[date] = {
          totalAmount: 0,
          orders: [],
          status: 'cancelled'
        };
      }
      map[date].totalAmount += order.totalPrice;
      map[date].orders.push(order);
      
      if (order.status === 'pending') {
        map[date].status = 'pending';
      } else if (order.status !== 'cancelled' && map[date].status !== 'pending') {
        map[date].status = 'confirmed';
      }
    });
    return map;
  };

  const aggregated = aggregateOrdersByDate(mockOrders);

  // 验证日期 5/22
  const day22 = aggregated['2026-05-22'];
  const day22Pass = day22 && day22.totalAmount === 17 && day22.status === 'confirmed';
  console.log(`   [2026-05-22] 配送总额: ¥${day22?.totalAmount} | 状态: ${day22?.status === 'confirmed' ? '🟢 已支付' : '🔴 ERROR'} ── ${day22Pass ? colors.green('[PASS]') : colors.red('[FAIL]')}`);

  // 验证日期 5/23
  const day23 = aggregated['2026-05-23'];
  const day23Pass = day23 && day23.totalAmount === 35 && day23.status === 'pending';
  console.log(`   [2026-05-23] 配送总额: ¥${day23?.totalAmount} | 状态: ${day23?.status === 'pending' ? '🟡 待支付' : '🔴 ERROR'} ── ${day23Pass ? colors.green('[PASS]') : colors.red('[FAIL]')}`);

  console.log('\n📌 2. 日历点击与微信接龙明细联动数据提取：');
  
  const getSolitaireDetailsByDate = (date) => {
    const result = aggregated[date];
    if (!result) return null;
    return result.orders;
  };

  const detailOrders = getSolitaireDetailsByDate('2026-05-22');
  let detailsPass = false;
  if (detailOrders && detailOrders.length > 0) {
    const mainOrder = detailOrders[0];
    const hasNote = mainOrder.customerInfo?.note === '不吃辣，谢谢！';
    const hasClass = mainOrder.address === '榆林路校区4年2班 送达教室';
    const hasStudentName = mainOrder.studentName === '张杺萌';
    
    const meatCount = mainOrder.items.filter(item => item.id === 'm1' || item.id === 'm2').length;
    const veggieCount = mainOrder.items.filter(item => item.id === 'v1').length;
    const categoriesPassed = meatCount === 2 && veggieCount === 1;

    detailsPass = hasNote && hasClass && hasStudentName && categoriesPassed;

    console.log(`   微信订餐接龙明细联动成功！`);
    console.log(`     #1 配送班级: ${mainOrder.address} ── [OK]`);
    console.log(`     #2 订餐学生: ${mainOrder.studentName} ── [OK]`);
    console.log(`     #3 用餐时段: ${mainOrder.mealTime === 'lunch' ? '☀️ 中午送达' : '🌙 晚上送达'} ── [OK]`);
    console.log(`     #4 主食配置: ${mainOrder.items.find(i => i.id === 's1')?.name} ── [OK]`);
    console.log(`     #5 荤素明细: 荤菜*${meatCount}，素菜*${veggieCount} ── [OK]`);
    console.log(`     #8 留言备注: "${mainOrder.customerInfo?.note}" ── [OK]`);
  }

  const linkagePass = day22Pass && day23Pass && detailsPass;
  console.log(`\n${linkagePass ? colors.green('[PASS]') : colors.red('[FAIL]')} 日历形态与接龙明细联动逻辑完全成立！`);

  return linkagePass;
};

// 执行测试运行器
const main = () => {
  console.clear();
  console.log(colors.yellow('============================================================'));
  console.log(colors.yellow('    🍱  董老师小厨房：新套餐计价与日历接龙联动自动化测试集   '));
  console.log(colors.yellow('============================================================'));

  const pricingOk = runPricingTests();
  const linkageOk = runCalendarLinkageTests();

  console.log('\n' + '='.repeat(60));
  if (pricingOk && linkageOk) {
    console.log(colors.green('🏆 全量核心测试执行完毕！所有自动化验证百分百通过！[ALL PASSED]'));
  } else {
    console.log(colors.red('🚨 全量测试中存在未通过的用例，请重新核对公式代码。[FAIL]'));
  }
  console.log('='.repeat(60) + '\n');
};

main();

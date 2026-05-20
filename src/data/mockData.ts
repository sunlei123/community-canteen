import { Food, FoodCategory } from '../types';

export const mockFoods: Food[] = [
  // 荤菜 (meat)
  {
    id: '1',
    name: '红烧肉',
    price: 28,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop',
    category: FoodCategory.MEAT,
    description: '肥瘦相间，软糯香甜',
    nutrition: '蛋白质丰富，铁质充足',
    isPopular: true
  },
  {
    id: '2', 
    name: '宫保鸡丁',
    price: 25,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&h=200&fit=crop',
    category: FoodCategory.MEAT,
    description: '酸甜微辣，嫩滑爽口',
    nutrition: '高蛋白低脂'
  },
  {
    id: '4',
    name: '糖醋里脊',
    price: 32,
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop',
    category: FoodCategory.MEAT,
    description: '酸甜可口，外酥内嫩',
    nutrition: '优质蛋白，健脾开胃',
    isPopular: true
  },
  {
    id: '16',
    name: '红烧排骨',
    price: 35,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    category: FoodCategory.MEAT,
    description: '排骨酥烂，酱香浓郁',
    nutrition: '富含钙质与优质蛋白'
  },

  // 素菜 (veggie)
  {
    id: '3',
    name: '麻婆豆腐',
    price: 18,
    image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=200&fit=crop',
    category: FoodCategory.VEGGIE,
    description: '麻辣鲜香，嫩滑可口',
    nutrition: '丰富植物蛋白',
    isPopular: true
  },
  {
    id: '11',
    name: '手撕包菜',
    price: 15,
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&h=200&fit=crop',
    category: FoodCategory.VEGGIE,
    description: '爽脆清甜，香辣开胃',
    nutrition: '富含膳食纤维、维生素C'
  },
  {
    id: '17',
    name: '地三鲜',
    price: 18,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
    category: FoodCategory.VEGGIE,
    description: '土豆茄子青椒，咸鲜下饭',
    nutrition: '多种蔬菜，微量元素丰富'
  },

  // 甜点/水果 (dessert_fruit)
  {
    id: '5',
    name: '红豆汤圆',
    price: 12,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop',
    category: FoodCategory.DESSERT_FRUIT,
    description: '软糯香甜，暖心暖胃',
    nutrition: '清心温补，碳水化合物'
  },
  {
    id: '6',
    name: '绿豆糕',
    price: 15,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=200&fit=crop',
    category: FoodCategory.DESSERT_FRUIT,
    description: '清香甘甜，细腻消暑',
    nutrition: '维生素B丰富，清热解毒',
    isPopular: true
  },
  {
    id: '7',
    name: '时令水果拼盘',
    price: 20,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
    category: FoodCategory.DESSERT_FRUIT,
    description: '新鲜时令水果大组合',
    nutrition: '维生素C极其丰富',
    isPopular: true
  },

  // 汤 (soup)
  {
    id: '12',
    name: '西红柿鸡蛋汤',
    price: 12,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=200&fit=crop',
    category: FoodCategory.SOUP,
    description: '酸甜开胃，色泽诱人',
    nutrition: '番茄红素与卵磷脂'
  },
  {
    id: '13',
    name: '排骨玉米汤',
    price: 18,
    image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=300&h=200&fit=crop',
    category: FoodCategory.SOUP,
    description: '玉米清甜，排骨酥烂',
    nutrition: '滋补钙质，维生素丰富'
  },

  // 主食 (staple)
  {
    id: '14',
    name: '白米饭',
    price: 2,
    image: 'https://images.unsplash.com/photo-1536304997881-a372c179924b?w=300&h=200&fit=crop',
    category: FoodCategory.STAPLE,
    description: '精选优质大米，香甜软糯',
    nutrition: '提供必备碳水化合物能量'
  },
  {
    id: '15',
    name: '手工小馒头',
    price: 3,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop',
    category: FoodCategory.STAPLE,
    description: '暄软可口，面香浓郁',
    nutrition: '易消化，补益脾胃'
  }
];

// 获取热门菜品
export const getPopularFoods = (): Food[] => {
  return mockFoods.filter(food => food.isPopular);
};

// 根据分类获取菜品
export const getFoodsByCategory = (category: FoodCategory): Food[] => {
  return mockFoods.filter(food => food.category === category);
};

// 根据ID获取菜品
export const getFoodById = (id: string): Food | undefined => {
  return mockFoods.find(food => food.id === id);
};
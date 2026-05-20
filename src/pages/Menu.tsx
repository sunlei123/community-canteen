import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FoodCategory } from '../types';
import { Navbar } from '../components/Navbar';
import { FoodCard } from '../components/FoodCard';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

const Menu: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all');
  const [highlightedFood, setHighlightedFood] = useState<string | null>(null);
  
  const { foods, categories, isLoading, error, loadFoods, loadCategories } = useStore();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  const [isFallback, setIsFallback] = useState(false);

  const defaultCategories = [
    { id: 'all' as const, name: '全部', emoji: '🍽️' },
    { id: FoodCategory.VEGGIE, name: '素菜', emoji: '🥦' },
    { id: FoodCategory.MEAT, name: '荤菜', emoji: '🍖' },
    { id: FoodCategory.DESSERT_FRUIT, name: '甜点/水果', emoji: '🍰' },
    { id: FoodCategory.SOUP, name: '汤', emoji: '🥣' },
    { id: FoodCategory.STAPLE, name: '主食', emoji: '🍚' }
  ];

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
    const fetchDateMenu = async () => {
      setIsFallback(false);
      try {
        await loadFoods(selectedDate);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDateMenu();
  }, [selectedDate, loadFoods]);

  // 如果没有发布每日菜单，回退为加载所有经典菜品
  useEffect(() => {
    if (!isLoading && foods.length === 0 && !isFallback) {
      setIsFallback(true);
      loadFoods();
    }
  }, [foods, isLoading, isFallback, loadFoods]);

  // 加载分类
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 处理URL参数
  useEffect(() => {
    const category = searchParams.get('category') as FoodCategory;
    const highlight = searchParams.get('highlight');
    
    if (category && Object.values(FoodCategory).includes(category)) {
      setSelectedCategory(category);
    }
    
    if (highlight) {
      setHighlightedFood(highlight);
      setTimeout(() => setHighlightedFood(null), 3000);
    }
  }, [searchParams]);

  // 获取当前分类的菜品
  const getCurrentFoods = () => {
    if (selectedCategory === 'all') {
      return foods;
    }
    return foods.filter(food => food.category === selectedCategory);
  };

  const currentFoods = getCurrentFoods();
  const displayCategories = categories.length > 0 ? 
    [{ id: 'all' as const, name: '全部', emoji: '🍽️' }, ...categories.map(cat => ({
      id: cat.key as FoodCategory,
      name: cat.name,
      emoji: cat.icon
    }))] : 
    defaultCategories;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-md flex flex-col">
        <Navbar title="选择菜品" showBack={true} />
        
        {/* 日期滑动选择器 */}
        <div className="bg-white border-b border-gray-100 p-4 sticky top-16 z-40">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            <span className="mr-1">📅</span> 选择配送日期
          </h3>
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-1">
            {dateList.map((day) => {
              const active = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl min-w-[70px] transition-all duration-150 border",
                    active 
                      ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white border-transparent shadow-md scale-105" 
                      : "bg-white border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-orange-200"
                  )}
                >
                  <span className="text-xs font-medium">{day.label}</span>
                  <span className={cn("text-[10px] mt-0.5", active ? "text-orange-100" : "text-gray-400")}>
                    {day.monthDay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="bg-white border-b border-gray-100 sticky top-[138px] z-30">
          <div className="p-4">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              {displayCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'flex-shrink-0 whitespace-nowrap',
                    selectedCategory === category.id && 'shadow-md'
                  )}
                >
                  <span className="mr-1">{category.emoji}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 温馨提示（菜单未发布回退） */}
        {isFallback && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mx-4 mt-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-orange-500 text-lg">💡</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  董老师今天还没有发布特定菜单，已为您推荐小厨房全部经典菜品哦！
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 菜品展示 */}
        <div className="p-4 flex-1">
          {error && (
            <div className="text-center py-8">
              <div className="text-red-500 text-sm mb-2">⚠️ {error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadFoods(selectedDate)}
              >
                重新加载
              </Button>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-bounce">⏳</div>
              <p className="text-gray-500">正在加载小厨房美味...</p>
            </div>
          ) : currentFoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentFoods.map((food) => (
                <div
                  key={food.id}
                  className={cn(
                    'transition-all duration-500',
                    highlightedFood === food.id && 'ring-4 ring-orange-300 ring-opacity-75 scale-105'
                  )}
                >
                  <FoodCard food={food} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                暂无{selectedCategory !== 'all' ? displayCategories.find(c => c.id === selectedCategory)?.name : ''}菜品
              </h3>
              <p className="text-gray-500 text-sm">
                请选择其他分类或稍后再来看看
              </p>
            </div>
          )}
        </div>

        {/* 底部间距 */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default Menu;
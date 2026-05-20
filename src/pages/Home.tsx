import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FoodCategory } from '../types';
import { Navbar } from '../components/Navbar';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { foods, categories, isLoading, loadFoods, loadCategories } = useStore();

  // 获取热门菜品
  const popularFoods = foods.filter(food => food.isPopular);

  const defaultCategories = [
    { id: FoodCategory.VEGGIE, name: '素菜', emoji: '🥦', color: 'bg-green-100 text-green-600' },
    { id: FoodCategory.MEAT, name: '荤菜', emoji: '🍖', color: 'bg-red-100 text-red-600' },
    { id: FoodCategory.DESSERT_FRUIT, name: '甜点/水果', emoji: '🍰', color: 'bg-pink-100 text-pink-600' },
    { id: FoodCategory.SOUP, name: '汤', emoji: '🥣', color: 'bg-blue-100 text-blue-600' },
    { id: FoodCategory.STAPLE, name: '主食', emoji: '🍚', color: 'bg-yellow-100 text-yellow-600' }
  ];

  const displayCategories = categories.length > 0 ? 
    categories.map(cat => ({
      id: cat.key as FoodCategory,
      name: cat.name,
      emoji: cat.icon,
      color: defaultCategories.find(dc => dc.id === cat.key)?.color || 'bg-gray-100 text-gray-600'
    })) : 
    defaultCategories;

  // 初始化数据加载
  useEffect(() => {
    loadFoods();
    loadCategories();
  }, [loadFoods, loadCategories]);

  const handleCategoryClick = (category: FoodCategory) => {
    navigate(`/menu?category=${category}`);
  };

  const handleFoodClick = (foodId: string) => {
    navigate(`/menu?highlight=${foodId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Navbar />
        
        {/* 品牌展示区 */}
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🍱</div>
            <h1 className="text-2xl font-bold mb-2">董老师小厨房</h1>
            <p className="text-orange-100 text-sm">
              新鲜食材 · 用心烹饪 · 温暖到家
            </p>
          </div>
        </div>

        {/* 分类导航 */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">选择分类</h2>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-gray-500 text-sm">正在加载分类...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {displayCategories.map((category) => (
                <Card
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center mx-auto mb-3`}>
                      <span className="text-2xl">{category.emoji}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{category.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 热门推荐 */}
        <div className="px-6 pb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🔥 热门推荐</h2>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-gray-500 text-sm">正在加载热门菜品...</p>
            </div>
          ) : popularFoods.length > 0 ? (
            <div className="space-y-3">
              {popularFoods.map((food) => (
                <Card
                  key={food.id}
                  onClick={() => handleFoodClick(food.id)}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={food.image}
                        alt={food.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{food.name}</h3>
                        <p className="text-sm text-gray-600 mb-1">{food.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600 font-bold">¥{food.price}</span>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                            热门
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-gray-500 text-sm">暂无热门菜品</p>
            </div>
          )}
        </div>

        {/* 底部行动按钮 */}
        <div className="p-6 pt-0">
          <Button
            onClick={() => navigate('/menu')}
            className="w-full"
            size="lg"
          >
            开始选餐 🍽️
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
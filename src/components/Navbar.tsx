import React from 'react';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Button } from './ui/Button';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  showCart?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  title = '董老师小厨房', 
  showBack = false, 
  showCart = true 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const totalItems = useStore(state => state.getTotalItems());
  const { userToken, logout, currentUser } = useStore();

  const handleBack = () => {
    navigate(-1);
  };

  const handleCartClick = () => {
    if (location.pathname !== '/cart') {
      navigate('/cart');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左侧：返回按钮或Logo */}
          <div className="flex items-center">
            {showBack ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2 p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <div className="flex items-center">
                <span className="text-2xl mr-2">🍱</span>
              </div>
            )}
            
            <h1 className="text-lg font-bold text-gray-800 truncate">
              {title}
            </h1>
          </div>

          {/* 右侧：登录/退出及购物车 */}
          <div className="flex items-center space-x-2">
            {/* 统一展示当前登录人信息，完全删除“我的订单”按钮 */}
            {userToken && currentUser && (
              <span className="text-emerald-700 text-xs font-bold px-2.5 py-1 bg-gradient-to-r from-emerald-50/80 to-green-50/80 border border-emerald-100/60 rounded-xl flex items-center shadow-[0_2px_8px_rgba(16,185,129,0.08)] backdrop-blur-sm hover:scale-102 transition-all duration-300">
                <span className="mr-1 text-sm animate-pulse">👤</span>
                {currentUser.name} <span className="text-emerald-600/70 font-normal ml-1">({currentUser.phone ? currentUser.phone.slice(-4) : ''})</span>
              </span>
            )}

            {/* 登录/退出按钮 */}
            {userToken ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-orange-600 text-sm font-medium px-2 py-1"
              >
                退出
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-orange-600 text-sm font-medium px-2 py-1"
              >
                登录
              </Button>
            )}

            {/* 购物车图标 */}
            {showCart && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCartClick}
                className="relative p-2"
              >
                <ShoppingBag className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
import { create } from 'zustand';
import { Food, CartItem, Order, Address, MealTime } from '../types';
import { api } from '../services/api';

interface StoreState {
  // 用户及学生状态
  userToken: string | null;
  students: any[];
  currentStudentId: string | null;
  setUserToken: (token: string | null) => void;
  setStudents: (students: any[]) => void;
  setCurrentStudentId: (id: string | null) => void;
  logout: () => void;

  // 购物车状态
  cartItems: CartItem[];
  addToCart: (food: Food) => void;
  removeFromCart: (foodId: string) => void;
  updateQuantity: (foodId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;

  // 订单状态
  currentOrder: Partial<Order> | null;
  setDeliveryInfo: (date: string, mealTime: MealTime) => void;
  setAddress: (address: Address) => void;
  submitOrder: () => Promise<string>; // 返回订单ID
  clearOrder: () => void;

  // UI状态
  isOrderSubmitting: boolean;
  setOrderSubmitting: (submitting: boolean) => void;

  // 菜品数据状态
  foods: Food[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  loadFoods: (date?: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  searchFoods: (keyword: string) => Promise<Food[]>;
}

export const useStore = create<StoreState>((set, get) => ({
  // 用户及学生初始状态
  userToken: localStorage.getItem('userToken'),
  students: JSON.parse(localStorage.getItem('userStudents') || '[]'),
  currentStudentId: localStorage.getItem('currentStudentId'),
  
  setUserToken: (token) => {
    if (token) localStorage.setItem('userToken', token);
    else localStorage.removeItem('userToken');
    set({ userToken: token });
  },
  
  setStudents: (students) => {
    localStorage.setItem('userStudents', JSON.stringify(students));
    set({ students });
  },
  
  setCurrentStudentId: (id) => {
    if (id) localStorage.setItem('currentStudentId', id);
    else localStorage.removeItem('currentStudentId');
    set({ currentStudentId: id });
  },
  
  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userStudents');
    localStorage.removeItem('currentStudentId');
    set({ userToken: null, students: [], currentStudentId: null });
  },

  // 购物车初始状态
  cartItems: [],

  // 菜品数据初始状态
  foods: [],
  categories: [],
  isLoading: false,
  error: null,

  // 购物车操作
  addToCart: (food: Food) => {
    const { cartItems } = get();
    const existingItem = cartItems.find(item => item.food.id === food.id);
    
    if (existingItem) {
      set({
        cartItems: cartItems.map(item =>
          item.food.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      set({
        cartItems: [...cartItems, { food, quantity: 1 }]
      });
    }
  },

  removeFromCart: (foodId: string) => {
    set({
      cartItems: get().cartItems.filter(item => item.food.id !== foodId)
    });
  },

  updateQuantity: (foodId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(foodId);
      return;
    }
    
    set({
      cartItems: get().cartItems.map(item =>
        item.food.id === foodId
          ? { ...item, quantity }
          : item
      )
    });
  },

  clearCart: () => {
    set({ cartItems: [] });
  },

  getTotalPrice: () => {
    return get().cartItems.reduce(
      (total, item) => total + item.food.price * item.quantity,
      0
    );
  },

  getTotalItems: () => {
    return get().cartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
  },

  // 订单初始状态
  currentOrder: null,

  // 订单操作
  setDeliveryInfo: (date: string, mealTime: MealTime) => {
    set({
      currentOrder: {
        ...get().currentOrder,
        deliveryDate: date,
        mealTime
      }
    });
  },

  setAddress: (address: Address) => {
    set({
      currentOrder: {
        ...get().currentOrder,
        address: `${address.street} ${address.building || ''} ${address.room || ''}`.trim()
      }
    });
  },

  submitOrder: async () => {
    const { cartItems, currentOrder, getTotalPrice } = get();
    
    try {
      set({ isOrderSubmitting: true });
      
      const orderData = {
        items: cartItems.map(item => ({
          foodId: item.food.id,
          quantity: item.quantity,
          price: item.food.price
        })),
        address: currentOrder?.address || '',
        deliveryDate: currentOrder?.deliveryDate || '',
        mealTime: currentOrder?.mealTime || MealTime.LUNCH,
        totalPrice: getTotalPrice(),
        studentId: get().currentStudentId || ''
      };

      const result = await api.order.create(orderData);
      
      // 清空购物车和设置当前订单
      set({
        cartItems: [],
        currentOrder: result,
        isOrderSubmitting: false
      });

      return result.id;
    } catch (error) {
      set({ 
        isOrderSubmitting: false,
        error: error instanceof Error ? error.message : '订单提交失败'
      });
      throw error;
    }
  },

  clearOrder: () => {
    set({ currentOrder: null });
  },

  // UI状态
  isOrderSubmitting: false,
  setOrderSubmitting: (submitting: boolean) => {
    set({ isOrderSubmitting: submitting });
  },

  // API方法
  loadFoods: async (date?: string) => {
    try {
      set({ isLoading: true, error: null });
      const foods = await api.menu.getItems({ date });
      set({ foods, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '加载菜品失败'
      });
    }
  },

  loadCategories: async () => {
    try {
      const categories = await api.menu.getCategories();
      set({ categories });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '加载分类失败'
      });
    }
  },

  searchFoods: async (keyword: string) => {
    try {
      set({ isLoading: true, error: null });
      const foods = await api.menu.search(keyword);
      set({ isLoading: false });
      return foods;
    } catch (error) {
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : '搜索失败'
      });
      return [];
    }
  }
}));
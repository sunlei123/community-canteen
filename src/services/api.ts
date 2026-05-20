// API服务配置
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // 生产环境使用相对路径
  : 'http://localhost:3001/api';  // 开发环境使用localhost

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || result.error || 'API请求失败');
  }

  return result.data as T;
}

// 菜品相关API
export const menuApi = {
  getItems: (params?: { category?: string; available?: boolean; date?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.available !== undefined) searchParams.append('available', params.available.toString());
    if (params?.date) searchParams.append('date', params.date);
    
    const query = searchParams.toString();
    return apiRequest<any[]>(`/menu${query ? `?${query}` : ''}`);
  },

  // 获取单个菜品
  getItem: (id: string) => {
    return apiRequest<any>(`/menu/${id}`);
  },

  // 获取分类列表
  getCategories: () => {
    return apiRequest<any[]>('/menu/categories/list');
  },

  // 搜索菜品
  search: (keyword: string) => {
    return apiRequest<any[]>(`/menu/search/${encodeURIComponent(keyword)}`);
  },
};

// 订单相关API
export const orderApi = {
  // 创建订单
  create: (orderData: {
    items: Array<{ foodId: string; quantity: number; price: number }>;
    address: string;
    deliveryDate: string;
    mealTime: string;
    totalPrice: number;
    studentId: string;
  }) => {
    return apiRequest<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // 获取订单列表
  getList: (params?: { 
    status?: string; 
    startDate?: string; 
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return apiRequest<{
      orders: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/orders${query ? `?${query}` : ''}`);
  },

  // 获取订单详情
  getDetail: (id: string) => {
    return apiRequest<any>(`/orders/${id}`);
  },

  // 更新订单状态
  updateStatus: (id: string, status: string) => {
    return apiRequest<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // 获取订单统计
  getStatistics: () => {
    return apiRequest<{
      total: number;
      today: number;
      pending: number;
      completed: number;
      revenue: number;
    }>('/orders/statistics');
  },
};

// 健康检查API
export const healthApi = {
  check: () => {
    return apiRequest<{ status: string; message: string; timestamp: string }>('/health');
  },
};

// 认证与学生相关API
export const authApi = {
  sendCode: (phone: string) => {
    return apiRequest<any>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
  
  phoneLogin: (phone: string, code: string) => {
    return apiRequest<{ token: string; students: any[] }>('/auth/phone-login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }
};

// 导出默认API对象
export const api = {
  menu: menuApi,
  order: orderApi,
  health: healthApi,
  auth: authApi,
};

export default api;
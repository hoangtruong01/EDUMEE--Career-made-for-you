// src/services/api.ts
import axios from 'axios';
import { router } from 'expo-router'; // 🟢 ĐÃ THÊM: Điều hướng toàn cục từ file cấu hình axios
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
// const DEV_MACHINE_IP = '192.168.101.87';
// const API_BASE_URL =
//   Platform.OS === 'web' ? 'http://localhost:3001/api/v1' : `http://${DEV_MACHINE_IP}:3001/api/v1`;
// const DEV_MACHINE_IP = '192.168.1.8';
const DEV_MACHINE_IP = '10.0.2.2';

// const DEV_MACHINE_IP = '192.168.101.87';
export const API_BASE_URL =
  Platform.OS === 'web' ? 'http://localhost:3001/api/v1' : `http://${DEV_MACHINE_IP}:3001/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = async (token: string | null) => {
  if (token) {
    if (Platform.OS === 'web') {
      localStorage.setItem('userToken', token);
    } else {
      await SecureStore.setItemAsync('userToken', token);
    }
  } else {
    if (Platform.OS === 'web') {
      localStorage.removeItem('userToken');
    } else {
      await SecureStore.deleteItemAsync('userToken');
    }
  }
};

export const getAuthToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  } else {
    return await SecureStore.getItemAsync('userToken');
  }
};

// Tự động đính kèm Token Bearer vào mọi API gửi đi
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Lỗi khi lấy Token đính kèm vào Request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Bắt lỗi 401 (JWT Expired) toàn cục để tự động Đăng xuất
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log(' HẾT HẠN PHIÊN JWT HOẶC CHƯA XÁC THỰC! Tiến hành dọn dẹp hệ thống...');
      try {
        await setAuthToken(null);
      } catch (cleanError) {
        console.error('Lỗi dọn dẹp token cũ dưới SecureStore:', cleanError);
      }
      router.replace('/login');
      setTimeout(() => {
        if (Platform.OS === 'web') {
          alert('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!');
        } else {
          Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại tài khoản của bạn.');
        }
      }, 300);
    }
    return Promise.reject(error);
  },
);
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function unwrapResponseData<T>(response: unknown): T {
  const payload = (response as { data?: unknown })?.data ?? response;

  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    const inner = (payload as { data?: unknown }).data;
    if (inner && typeof inner === 'object' && 'data' in inner) {
      return (inner as { data: T }).data;
    }
    return inner as T;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

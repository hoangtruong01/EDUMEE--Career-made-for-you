import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEV_MACHINE_IP = '192.168.101.87';
export const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3001/api/v1'
  : `http://${DEV_MACHINE_IP}:3001/api/v1`;

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

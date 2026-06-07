import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { setAuthToken } from '../src/services/api';
import { getRoleHomeRoute } from '../src/utils/roleNavigation';

export default function OAuthSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string; role?: string }>();

  useEffect(() => {
    const handleComplete = async () => {
      // 1. Nếu đang ở thiết bị di động Native (Popup in-app browser)
      if (Platform.OS !== 'web') {
        WebBrowser.maybeCompleteAuthSession();
        return;
      }

      // 2. Nếu đang ở môi trường Web Browser (Chuyển hướng trực tiếp toàn trang)
      const { access_token } = params;
      if (access_token) {
        console.log('OAuth Success Web - Nhận được Access Token:', access_token);
        
        // Lưu token vào bộ nhớ Web (localStorage)
        await setAuthToken(access_token);
        
        // Chuyển hướng người dùng về trang chủ Dashboard
        const role = Array.isArray(params.role) ? params.role[0] : params.role;
        router.replace(getRoleHomeRoute(role) as any);
      } else {
        console.warn('OAuth Success Web - Không tìm thấy token trong tham số URL:', params);
        // Nếu không có token, quay trở lại màn hình đăng nhập
        router.replace('/login');
      }
    };

    handleComplete();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.text}>Đang hoàn tất đăng nhập...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  text: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ImageBackground,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../src/theme';
import { GlassView } from '../src/components/GlassView';
import { Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { api, setAuthToken } from '../src/services/api';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async () => {
    console.log('Attempting Admin login with:', email);
    if (!email || !password) {
      const msg = 'Vui lòng nhập tài khoản admin';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Lỗi', msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/admin/login', { email, password });
      console.log('Admin login success');
      const { accessToken } = response.data;
      await setAuthToken(accessToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Admin login error:', error);
      const message = error.response?.data?.message || 'Đăng nhập Admin thất bại. Kiểm tra Backend.';
      Platform.OS === 'web' ? alert(message) : Alert.alert('Lỗi', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>

          <View style={styles.header}>
            <ShieldCheck size={64} color={COLORS.primary} />
            <Text style={styles.title}>ADMIN PANEL</Text>
            <Text style={styles.subtitle}>Cổng quản trị EDUMEE</Text>
          </View>

          <GlassView style={styles.formContainer}>
            <Text style={styles.welcomeText}>Xác thực quản trị viên</Text>
            <Text style={styles.instructionText}>Vui lòng nhập thông tin để truy cập hệ thống quản lý.</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Admin Email"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color={COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Mật khẩu"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <Pressable 
              onPress={handleAdminLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loginButton,
                { opacity: pressed || isLoading ? 0.7 : 1 }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.foreground} />
              ) : (
                <Text style={styles.loginButtonText}>Xác nhận truy cập</Text>
              )}
            </Pressable>
          </GlassView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.foreground,
    letterSpacing: 2,
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  formContainer: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl * 1.5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 50,
    color: COLORS.foreground,
    fontSize: 16,
  },
  loginButton: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  loginButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
});

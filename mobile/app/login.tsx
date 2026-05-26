import React, { useState, useRef } from 'react';
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
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { api, setAuthToken } from '../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleLogoPress = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    console.log('Logo clicked:', newCount);
    if (newCount >= 5) {
      setClickCount(0);
      router.push('/admin-login');
    }
  };

  const handleLogin = async () => {
    console.log('Attempting login with:', email);
    if (!email || !password) {
      const msg = 'Vui lòng nhập đầy đủ email và mật khẩu';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Lỗi', msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', JSON.stringify(response.data));
      
      const token = response.data?.data?.result?.access_token || response.data?.data?.access_token;
      
      if (token) {
        await setAuthToken(token);
        router.replace('/(tabs)');
      } else {
        throw new Error('Token không tìm thấy trong phản hồi từ server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại kết nối mạng hoặc Backend.';
      Platform.OS === 'web' ? alert(message) : Alert.alert('Lỗi', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Pressable onPress={handleLogoPress} style={styles.header}>
            <Text style={styles.title}>EDUMEE</Text>
            <Text style={styles.subtitle}>Sự nghiệp trong tầm tay</Text>
          </Pressable>

          <GlassView style={styles.formContainer}>
            <Text style={styles.welcomeText}>Chào mừng trở lại!</Text>
            <Text style={styles.instructionText}>Đăng nhập để tiếp tục hành trình khám phá bản thân.</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
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
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loginButton,
                { opacity: pressed || isLoading ? 0.7 : 1 }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.foreground} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                  <ArrowRight size={20} color={COLORS.foreground} style={{ marginLeft: 8 }} />
                </>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản?</Text>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.signUpLink}> Đăng ký ngay</Text>
              </Pressable>
            </View>
          </GlassView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.foreground,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: -SPACING.sm,
  },
  formContainer: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl * 1.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  instructionText: {
    fontSize: 14,
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
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  loginButton: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  loginButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.muted,
  },
  signUpLink: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
});

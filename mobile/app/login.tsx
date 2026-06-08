// app/login.tsx
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { GlassView } from '../src/components/GlassView';
import { api, setAuthToken } from '../src/services/api';
import { COLORS, RADIUS, SPACING } from '../src/theme';
import { getRoleHomeRoute } from '../src/utils/roleNavigation';
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    Keyboard.dismiss();
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

      const result =
        response.data?.data?.result || response.data?.result || response.data?.data || {};
      const token =
        result?.access_token || response.data?.data?.access_token || response.data?.access_token;
      const role = result?.role || response.data?.data?.role || response.data?.role;

      if (token) {
        await setAuthToken(token);
        router.replace(getRoleHomeRoute(role) as any);
      } else {
        throw new Error('Token không tìm thấy trong phản hồi từ server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message =
        error.response?.data?.message ||
        'Đăng nhập thất bại. Kiểm tra lại kết nối mạng hoặc Backend.';
      Platform.OS === 'web' ? alert(message) : Alert.alert('Lỗi', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const redirectUrl = Linking.createURL('oauth-success');
      console.log('Mobile Deep Link Callback:', redirectUrl);

      const backendAuthUrl = `${api.defaults.baseURL}/auth/google?state=${encodeURIComponent(redirectUrl)}`;
      console.log('Opening Backend Google Auth URL:', backendAuthUrl);

      if ((Platform.OS as string) === 'web') {
        window.location.href = backendAuthUrl;
        return;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(backendAuthUrl, redirectUrl);

      if (authResult.type === 'success' && authResult.url) {
        const parsedUrl = Linking.parse(authResult.url);
        const { access_token } = parsedUrl.queryParams as {
          access_token?: string;
          refresh_token?: string;
          role?: string;
        };

        if (access_token) {
          await setAuthToken(access_token);

          // Điều hướng người dùng vào Dashboard chính
          const role = (parsedUrl.queryParams as { role?: string })?.role;
          router.replace(getRoleHomeRoute(role) as any);
          const successMsg = 'Đăng nhập Google thành công!';
          (Platform.OS as string) === 'web'
            ? alert(successMsg)
            : Alert.alert('Thành công', successMsg);
        } else {
          throw new Error('Không lấy được token từ Google.');
        }
      } else {
        console.log('User cancelled or browser closed. Result status:', authResult.type);
      }
    } catch (error: any) {
      console.error('Google Login Error:', error);
      const msg = error.message || 'Có lỗi xảy ra trong quá trình đăng nhập bằng Google';
      (Platform.OS as string) === 'web' ? alert(msg) : Alert.alert('Lỗi', msg);
    } finally {
      if ((Platform.OS as string) !== 'web') {
        setIsLoading(false);
      }
    }
  };

  return (
    <View style={styles.flex}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop',
        }}
        style={styles.backgroundImage}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top + SPACING.lg, SPACING.xxl),
                paddingBottom: Math.max(insets.bottom + SPACING.lg, SPACING.xxl),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={handleLogoPress} style={styles.header}>
              <Text style={styles.title}>EDUMEE</Text>
              <Text style={styles.subtitle}>Sự nghiệp trong tầm tay</Text>
            </Pressable>

            <GlassView style={styles.formContainer}>
              <Text style={styles.welcomeText}>Chào mừng trở lại!</Text>
              <Text style={styles.instructionText}>
                Đăng nhập để tiếp tục hành trình khám phá bản thân.
              </Text>

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
                  { opacity: pressed || isLoading ? 0.7 : 1 },
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

              {/* Ngăn cách tinh tế */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Nút đăng nhập Google Glassmorphism Premium */}
              <Pressable
                onPress={handleGoogleLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.googleButton,
                  {
                    backgroundColor: pressed
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.07)',
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.foreground} />
                ) : (
                  <View style={styles.googleButtonContent}>
                    {/* Vẽ Icon Google SVG màu chuẩn */}
                    <Svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 12 }}>
                      <Path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.79 5.79 0 0 1 8.2 12.725a5.79 5.79 0 0 1 5.79-5.79 5.71 5.71 0 0 1 3.93 1.547l3.1-3.1A9.94 9.94 0 0 0 13.99 2.14c-5.5 0-9.96 4.46-9.96 9.96s4.46 9.96 9.96 9.96c5.77 0 9.8-4.06 9.8-9.96 0-.67-.06-1.3-.17-1.815H12.24Z"
                      />
                      <Path
                        fill="#4285F4"
                        d="M23.62 12.285c0-.67-.06-1.3-.17-1.815H12.24V14.4h6.887c-.28 1.05-.9 1.94-1.75 2.51v3.29h2.72a9.92 9.92 0 0 0 3.52-7.915Z"
                      />
                      <Path
                        fill="#34A853"
                        d="M13.99 22.06c2.7 0 4.96-.89 6.62-2.42l-3.22-2.51c-.9.6-2.06.96-3.4.96-2.617 0-4.828-1.764-5.617-4.135l-3.32 2.57A9.95 9.95 0 0 0 13.99 22.06Z"
                      />
                      <Path
                        fill="#FBBC05"
                        d="M8.373 13.955a5.9 5.9 0 0 1-.307-1.83c0-.64.11-1.26.307-1.83l-3.32-2.57a9.93 9.93 0 0 0 0 8.8l3.32-2.57Z"
                      />
                    </Svg>
                    <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Chưa có tài khoản?</Text>
                <Pressable onPress={() => router.push('/register')}>
                  <Text style={styles.signUpLink}> Đăng ký ngay</Text>
                </Pressable>
              </View>
            </GlassView>
          </ScrollView>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
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
    width: '100%',
    alignSelf: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl * 1.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  instructionText: { fontSize: 14, color: COLORS.muted, marginBottom: SPACING.xl },
  inputGroup: { gap: SPACING.md, marginBottom: SPACING.xl },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
  },
  inputIcon: { marginRight: SPACING.sm },
  eyeIconWrapper: { padding: SPACING.xs, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1,
    height: 50,
    color: COLORS.foreground,
    fontSize: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
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
  loginButtonText: { color: COLORS.foreground, fontSize: 16, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: { color: COLORS.muted },
  signUpLink: { color: COLORS.secondary, fontWeight: '700' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  dividerText: { color: COLORS.muted, paddingHorizontal: SPACING.md, fontSize: 13 },
  googleButton: {
    height: 56,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  googleButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

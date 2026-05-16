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
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../src/theme';
import { GlassView } from '../src/components/GlassView';
import { Mail, Lock, User, Calendar, ArrowLeft, ArrowRight, UserCircle2 } from 'lucide-react-native';
import { api } from '../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'Nam',
    date_of_birth: '2000-01-01',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const { name, email, password, confirmPassword, gender, date_of_birth } = formData;
    
    if (!name || !email || !password || !confirmPassword) {
      const msg = 'Vui lòng điền đầy đủ các thông tin bắt buộc';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Lỗi', msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Mật khẩu xác nhận không khớp';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Lỗi', msg);
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register', formData);
      const successMsg = 'Đăng ký thành công! Vui lòng đăng nhập.';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Thành công', successMsg);
      }
      router.replace('/login');
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      if (Array.isArray(message)) {
        Platform.OS === 'web' ? alert(message.join('\n')) : Alert.alert('Lỗi', message.join('\n'));
      } else {
        Platform.OS === 'web' ? alert(message) : Alert.alert('Lỗi', message);
      }
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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.foreground} />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.title}>EDUMEE</Text>
              <Text style={styles.subtitle}>Bắt đầu hành trình của bạn</Text>
            </View>

            <GlassView style={styles.formContainer}>
              <Text style={styles.welcomeText}>Tạo tài khoản</Text>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <User size={20} color={COLORS.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Họ và tên"
                    placeholderTextColor={COLORS.muted}
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(val) => setFormData({...formData, name: val})}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Mail size={20} color={COLORS.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={COLORS.muted}
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(val) => setFormData({...formData, email: val})}
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
                    value={formData.password}
                    onChangeText={(val) => setFormData({...formData, password: val})}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Lock size={20} color={COLORS.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Xác nhận mật khẩu"
                    placeholderTextColor={COLORS.muted}
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(val) => setFormData({...formData, confirmPassword: val})}
                    secureTextEntry
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputWrapper, { flex: 1, marginRight: SPACING.sm }]}>
                    <UserCircle2 size={20} color={COLORS.muted} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Giới tính"
                      placeholderTextColor={COLORS.muted}
                      style={styles.input}
                      value={formData.gender}
                      onChangeText={(val) => setFormData({...formData, gender: val})}
                    />
                  </View>
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <Calendar size={20} color={COLORS.muted} style={styles.inputIcon} />
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.muted}
                      style={styles.input}
                      value={formData.date_of_birth}
                      onChangeText={(val) => setFormData({...formData, date_of_birth: val})}
                    />
                  </View>
                </View>
              </View>

              <Pressable 
                onPress={handleRegister}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.registerButton,
                  { opacity: pressed || isLoading ? 0.7 : 1 }
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.foreground} />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Đăng ký ngay</Text>
                    <ArrowRight size={20} color={COLORS.foreground} style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Đã có tài khoản?</Text>
                <Pressable onPress={() => router.push('/login')}>
                  <Text style={styles.loginLink}> Đăng nhập</Text>
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
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.foreground,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: -SPACING.xs,
  },
  formContainer: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl * 1.5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
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
  row: {
    flexDirection: 'row',
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
  registerButton: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  registerButtonText: {
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
  loginLink: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
});

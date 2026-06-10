// mobile/app/holland-test.tsx
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, Rocket } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassView } from '../src/components/GlassView';
import { api } from '../src/services/api';
import { COLORS, RADIUS, SPACING } from '../src/theme';

const { width } = Dimensions.get('window');

interface Question {
  _id: string;
  id?: string; // 🟢 ĐÃ FIX: Bổ sung trường id tùy chọn do cơ chế Serialization của NestJS
  questionText: string;
  dimension: string;
  options: {
    value: 'A' | 'B' | 'C' | 'D';
    label: string;
  }[];
}

export default function HollandTestScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const fadeAnim = useState(new Animated.Value(1))[0];
  const progressAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    startSession();
    fetchQuestions();
  }, []);

  const startSession = async () => {
    try {
      const response = await api.post('/assessment-sessions');
      const session = response.data.data;
      setSessionId(session.id || session._id);
    } catch (error) {
      console.error('Start session error:', error);
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 1) / questions.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentIndex, questions]);

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/assessment-questions', {
        params: { limit: 100 },
      });
      setQuestions(response.data.data.questions);
    } catch (error) {
      console.error('Fetch questions error:', error);
      Alert.alert('Lỗi', 'Không thể tải câu hỏi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedOption) return;

    const newAnswers = [...answers];
    // 🟢 ĐÃ FIX: Trích xuất ID an toàn (fallback) để chống chuỗi lạc danh undefined
    const qId = questions[currentIndex].id || questions[currentIndex]._id;

    newAnswers[currentIndex] = {
      questionId: String(qId),
      answer: String(selectedOption),
    };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      // Transition to next question
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(newAnswers[currentIndex + 1]?.answer || null);
      }, 200);
    } else {
      submitTest(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(answers[currentIndex - 1]?.answer || null);
    } else {
      router.back();
    }
  };

  const submitTest = async (finalAnswers: any[]) => {
    if (!sessionId) {
      Alert.alert('Lỗi', 'Không tìm thấy phiên làm việc.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 🟢 ĐÃ FIX: Chuẩn hóa payload khớp khít 100% với BulkAnswerDto[] phía NestJS Backend
      const answersForSession = finalAnswers.map((item) => ({
        sessionId: String(sessionId),
        questionId: String(item.questionId),
        answer: String(item.answer),
      }));

      // In thử cấu trúc Json ra Terminal của Expo để giám sát dữ liệu thô bắn đi
      console.log(
        '📦 PAYLOAD HOLLAND TEST MOBILE GỬI LÊN BE:',
        JSON.stringify(answersForSession, null, 2),
      );

      await api.post('/assessment-answers/bulk', answersForSession);
      await api.post('/career-fit-results/generate-my-analysis');
      await api.post(`/assessment-sessions/${sessionId}/finish`);

      // Đồng bộ cờ Onboarding mở khóa tài khoản tương tự luồng xử lý trên bản Web
      await api.patch('/users/me', { onboarding_completed: true });

      router.replace('/test-result');
    } catch (error: any) {
      console.error('Submit test error:', error);

      // 🟢 THÊM LOG: In tường minh chi tiết bắt lỗi từ Class-validator trả về từ server
      if (error.response?.data) {
        console.log(
          '❌ CHI TIẾT PHẢN HỒI LỖI TỪ SERVER BE:',
          JSON.stringify(error.response.data, null, 2),
        );
      }

      const serverMessage =
        error.response?.data?.message || 'Gửi bài làm thất bại. Vui lòng thử lại.';
      Alert.alert(
        'Lỗi nộp bài',
        Array.isArray(serverMessage) ? serverMessage.join('\n') : String(serverMessage),
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị câu hỏi...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <GlassView style={styles.questionCard}>
          <Text style={styles.dimensionTag}>{currentQuestion?.dimension}</Text>
          <Text style={styles.questionText}>{currentQuestion?.questionText}</Text>
        </GlassView>

        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setSelectedOption(option.value)}
              style={[
                styles.optionButton,
                selectedOption === option.value && styles.optionButtonSelected,
              ]}
            >
              <View
                style={[
                  styles.radioButton,
                  selectedOption === option.value && styles.radioButtonSelected,
                ]}
              >
                {selectedOption === option.value && <Check size={12} color="#fff" />}
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  selectedOption === option.value && styles.optionLabelSelected,
                ]}
              >
                {option.value}. {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          disabled={!selectedOption}
          style={[styles.nextButton, !selectedOption && styles.nextButtonDisabled]}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === questions.length - 1 ? 'Xem kết quả' : 'Tiếp theo'}
          </Text>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {isSubmitting && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text style={styles.overlayText}>AI đang phân tích kết quả...</Text>
            <Rocket size={40} color={COLORS.primary} style={styles.rocketIcon} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  questionCard: {
    padding: SPACING.xxl,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  dimensionTag: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  questionText: {
    color: COLORS.foreground,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  optionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: COLORS.foreground,
    fontWeight: '600',
  },
  nextButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    gap: SPACING.sm,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayContent: {
    alignItems: 'center',
  },
  overlayText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.xl,
  },
  rocketIcon: {
    marginTop: SPACING.xxl,
  },
});

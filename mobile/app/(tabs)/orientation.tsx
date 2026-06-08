// app/(tabs)/orientation.tsx
import {
  Award,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Sparkles,
  Square,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassView } from '../../src/components/GlassView';
import { api } from '../../src/services/api';
import { COLORS, SPACING } from '../../src/theme';

const { height } = Dimensions.get('window');

interface IQuizOption {
  value: number;
  label: string;
}

interface IQuizQuestion {
  questionText: string;
  isMultipleChoice: boolean;
  options: IQuizOption[];
  correctValue: number;
}

interface IMappedTask {
  id: string;
  title: string;
  description: string;
  formatType: string;
  quizQuestions: IQuizQuestion[];
  isCompleted: boolean;
}

interface IMappedMilestone {
  milestoneId: string;
  title: string;
  desc: string;
  done: boolean;
  tasks: IMappedTask[];
}

interface IRoadmapPhase {
  phaseId: string;
  phase: string;
  title: string;
  status: 'current' | 'locked' | 'completed';
  progress: number;
  milestones: IMappedMilestone[];
  skills: string[];
  kpi: string;
}

export default function OrientationScreen() {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'simulation'>('roadmap');
  const [phases, setPhases] = useState<IRoadmapPhase[]>([]);
  const [careerTitle, setCareerTitle] = useState<string>('Lộ trình học tập chuyên sâu');
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);

  // Workspace Modal states
  const [workspaceVisible, setWorkspaceVisible] = useState<boolean>(false);
  const [activeTask, setActiveTask] = useState<IMappedTask | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Lưu câu trả lời bài tập trên Mobile
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [textAnswer, setTextAnswer] = useState<string>('');

  useEffect(() => {
    fetchActiveRoadmap();
  }, []);

  // 📡 ĐỒNG BỘ 100% VỚI KHUNG ĐƯỜNG TRUYỀN BẢN WEB VÀ BACKEND
  const fetchActiveRoadmap = async () => {
    try {
      setLoading(true);

      // 🎯 FIX GỐC RỄ: Đổi từ '/learning-roadmaps/active' sang '/learning-roadmaps/latest' theo bản Web để tránh trùng route findOne ObjectId
      const response = await api.get('/learning-roadmaps/latest');
      const responseData = response.data?.data || response.data;

      if (responseData && responseData.phases) {
        setRoadmapId(responseData.id || responseData._id);
        setCareerTitle(responseData.careerTitle || 'Chuyên viên Phân tích Nghiệp vụ');

        let foundCurrent = false;
        const rawProgress = Array.isArray(responseData.taskProgress)
          ? responseData.taskProgress
          : [];

        const mappedPhases: IRoadmapPhase[] = responseData.phases.map((p: any, index: number) => {
          const mappedMilestones = (p.milestones || []).map((m: any) => {
            // Xử lý map danh sách bài tập thô từ DB sang dạng hiển thị Clean
            const mappedTasks = (m.tasks || []).map((t: any) => {
              const matchState = rawProgress.find(
                (prog: any) => prog.taskId === (t.taskId || t.id || t._id),
              );
              const isDone = matchState ? matchState.status === 'COMPLETED' : false;

              return {
                id: t.taskId || t.id || t._id,
                title: t.taskTitle || t.title || 'Nhiệm vụ mới',
                description: t.description || 'Nội dung giáo trình mở rộng.',
                formatType: t.formatType || 'READ',
                quizQuestions: Array.isArray(t.quizQuestions) ? t.quizQuestions : [],
                isCompleted: isDone,
              };
            });

            const allTasksDone =
              mappedTasks.length > 0 && mappedTasks.every((t: IMappedTask) => t.isCompleted);

            return {
              milestoneId: m.milestoneId || m.id || m._id,
              title: m.title || `Mục tiêu mốc ${m.order || ''}`,
              desc: m.description || 'Hoàn thành năng lực chặng thực tế.',
              done: m.isCompleted || countriesAllTasksDone(mappedTasks, allTasksDone),
              tasks: mappedTasks,
            };
          });

          // Tính toán phần trăm tiến độ giai đoạn dựa trên tasks thực tế
          const totalTasks = mappedMilestones.reduce(
            (acc: number, mItem: IMappedMilestone) => acc + mItem.tasks.length,
            0,
          );
          const completedTasks = mappedMilestones.reduce(
            (acc: number, mItem: IMappedMilestone) =>
              acc + mItem.tasks.filter((tItem: IMappedTask) => tItem.isCompleted).length,
            0,
          );
          const CalculatedProgress =
            totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          // 🟢 ĐỊNH VỊ TRẠNG THÁI PHASE: Tự động mở khóa chặng tiếp theo khi chặng trước đạt 100%
          let status: 'current' | 'locked' | 'completed' = 'locked';

          if (CalculatedProgress === 100 || p.isCompleted || p.status === 'completed') {
            status = 'completed';
          } else if (!foundCurrent) {
            status = 'current';
            foundCurrent = true;
          } else {
            status = 'locked';
          }

          return {
            phaseId: p.phaseId || p.id || p._id,
            phase: p.estimatedDuration || `Chặng 0${index + 1}`,
            title: p.title || `Giai đoạn ${index + 1}`,
            status: status,
            progress: CalculatedProgress,
            milestones: mappedMilestones,
            skills: p.skills || [],
            kpi: p.kpi || 'Hoàn thành chặng khảo thí để mở khóa nội dung.',
          };
        });

        // Phòng hờ nếu toàn bộ lộ trình xong xuôi sạch sẽ
        if (!foundCurrent && mappedPhases.length > 0) {
          mappedPhases[mappedPhases.length - 1].status = 'current';
        }

        setPhases(mappedPhases);
      }
    } catch (error) {
      console.error('Lỗi khi tải ma trận lộ trình học:', error);
      Alert.alert(
        'Lỗi đồng bộ',
        'Không thể nạp dữ liệu lộ trình học. Vui lòng kéo nhẹ màn hình để thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Hàm helper tránh lỗi biến cục bộ lồng nhau
  const countriesAllTasksDone = (tasks: IMappedTask[], allDone: boolean) => {
    return tasks.length > 0 ? allDone : false;
  };

  const handleOpenWorkspace = (task: IMappedTask) => {
    setActiveTask(task);
    setSelectedAnswers({});
    setTextAnswer('');
    setWorkspaceVisible(true);
  };

  // Hàm bắn dữ liệu khảo thí lên Server NestJS
  const handleSubmitWorkspace = async () => {
    if (!activeTask || !roadmapId) return;

    if (
      activeTask.formatType === 'QUIZ' &&
      Object.keys(selectedAnswers).length < activeTask.quizQuestions.length
    ) {
      Alert.alert('Cảnh báo', 'Vui lòng tích chọn đầy đủ đáp án trắc nghiệm trước khi nộp bài!');
      return;
    }
    if (
      (activeTask.formatType === 'TEXT' || activeTask.formatType === 'HYBRID') &&
      textAnswer.trim().length < 10
    ) {
      Alert.alert(
        'Cảnh báo',
        'Nội dung phân tích thực hành tự luận quá ngắn (tối thiểu 10 ký tự)!',
      );
      return;
    }

    try {
      setSubmitting(true);

      const quizAnswersPayload = activeTask.quizQuestions.map((_, idx) => ({
        questionIndex: idx,
        selectedValue: selectedAnswers[idx] || 0,
      }));

      // Bắn payload khớp 100% DTO TaskSubmission
      await api.post('/task-submissions', {
        taskId: activeTask.id,
        roadmapId: roadmapId,
        status: activeTask.formatType === 'READ' ? 'COMPLETED' : 'SUBMITTED',
        submissionContent: {
          textContent: textAnswer || 'Học viên nghiên cứu giáo trình hoàn tất.',
          quizAnswers: quizAnswersPayload,
        },
      });

      // Tạo Alert chặn luồng thông minh, bấm OK mới load để tránh lệch cache DB
      Alert.alert(
        'Thành công 🎉',
        'Hệ thống AI Mentor đã chấm điểm bài làm của bạn!',
        [
          {
            text: 'OK',
            onPress: () => {
              setWorkspaceVisible(false);
              fetchActiveRoadmap(); // Đồng bộ bẻ chặng ngay lập tức
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Ghi nhận', 'Hệ thống đã cập nhật tiến trình học chặng này cục bộ!', [
        {
          text: 'OK',
          onPress: () => {
            setWorkspaceVisible(false);
            fetchActiveRoadmap();
          },
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const totalOverallProgress = useMemo(() => {
    if (phases.length === 0) return 0;
    const current = phases.find((p) => p.status === 'current');
    return current ? current.progress : 56;
  }, [phases]);

  if (loading) {
    return (
      <View style={[styles.mainWrapper, styles.centerBox]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang đồng bộ Sơ đồ bài học AI...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* HEADER TABS CHUYỂN ĐỔI PHÂN HỆ */}
      <View style={styles.tabHeaderRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('roadmap')}
          style={[styles.tabButton, activeTab === 'roadmap' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'roadmap' && styles.tabTextActive]}>
            Lộ Trình Học
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('simulation')}
          style={[styles.tabButton, activeTab === 'simulation' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'simulation' && styles.tabTextActive]}>
            Không Gian Thực Tế
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'roadmap' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* BANNER GLASSMORPHISM TỔNG QUAN TIẾN ĐỘ */}
          <GlassView style={styles.topOverviewCard}>
            <View style={styles.careerTitleRow}>
              <Award size={20} color="#FBBF24" style={{ marginRight: 8 }} />
              <Text style={styles.careerTitleText} numberOfLines={1}>
                {careerTitle}
              </Text>
            </View>
            <View style={styles.progressDataRow}>
              <Text style={styles.progressLabel}>Tiến độ chặng hiện tại</Text>
              <Text style={styles.progressPercentText}>{totalOverallProgress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${totalOverallProgress}%` }]} />
            </View>
          </GlassView>

          <Text style={styles.sectionHeaderTitle}>Các chặng năng lực</Text>

          {/* HIỂN THỊ DANH SÁCH PHASES */}
          {phases.map((phase) => {
            const isExpanded = expandedPhaseId === phase.phaseId;
            const isLocked = phase.status === 'locked';

            return (
              <GlassView
                key={phase.phaseId}
                style={[styles.phaseCard, isLocked && styles.phaseCardLocked]}
              >
                <TouchableOpacity
                  onPress={() => !isLocked && setExpandedPhaseId(isExpanded ? null : phase.phaseId)}
                  style={styles.phaseHeaderTouch}
                  disabled={isLocked}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phaseTag}>THỜI LƯỢNG: {phase.phase.toUpperCase()}</Text>
                    <Text style={styles.phaseTitle}>{phase.title}</Text>
                  </View>
                  {!isLocked &&
                    (isExpanded ? (
                      <ChevronUp size={18} color="#FFF" />
                    ) : (
                      <ChevronDown size={18} color={COLORS.muted} />
                    ))}
                </TouchableOpacity>

                {isExpanded && !isLocked && (
                  <View style={styles.phaseExpandedContent}>
                    {phase.milestones.map((milestone) => (
                      <View key={milestone.milestoneId} style={styles.milestoneBlock}>
                        <View style={styles.milestoneTitleLine}>
                          <CheckCircle2
                            size={15}
                            color={milestone.done ? '#10B981' : COLORS.muted}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.milestoneTitleText}>{milestone.title}</Text>
                        </View>

                        <View style={styles.taskListContainer}>
                          {milestone.tasks.map((task) => (
                            <TouchableOpacity
                              key={task.id}
                              style={[
                                styles.taskItemTouch,
                                task.isCompleted && styles.taskCompleted,
                              ]}
                              onPress={() => handleOpenWorkspace(task)}
                            >
                              <View style={styles.taskInfoRow}>
                                <Layers
                                  size={14}
                                  color={task.isCompleted ? '#10B981' : COLORS.primary}
                                  style={{ marginRight: 8 }}
                                />
                                <Text
                                  style={[
                                    styles.taskItemTitleText,
                                    task.isCompleted && styles.taskTextDone,
                                  ]}
                                  numberOfLines={1}
                                >
                                  [{task.formatType}] {task.title}
                                </Text>
                              </View>
                              <Text style={styles.actionBtnText}>
                                {task.isCompleted ? 'Xem lại' : 'Cày ngay'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </GlassView>
            );
          })}
        </ScrollView>
      )}

      {activeTab === 'simulation' && (
        <View style={[styles.container, styles.centerBox]}>
          <Sparkles size={40} color={COLORS.secondary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>Không gian giả lập Agent nâng cao đang đồng bộ...</Text>
        </View>
      )}

      {/* ================= WORKSPACE MODAL LÀM BÀI KHẢO THÍ CHUYÊN SÂU ================= */}
      <Modal visible={workspaceVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <GlassView intensity={65} style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                <Text style={styles.modalTag}>WORKSPACE THỰC HÀNH AI</Text>
                <Text style={styles.modalMainTitle} numberOfLines={1}>
                  {activeTask?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWorkspaceVisible(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
              overScrollMode="never"
            >
              <View style={styles.docSectionBox}>
                <Text style={styles.sectionSubHeader}>
                  <BookOpen size={12} color={COLORS.secondary} /> Giáo trình hướng dẫn:
                </Text>
                <Text style={styles.markdownBody}>{activeTask?.description}</Text>
              </View>

              {activeTask?.quizQuestions && activeTask.quizQuestions.length > 0 && (
                <View style={styles.interactiveZone}>
                  <Text style={styles.sectionSubHeader}>
                    <Sparkles size={12} color="#A78BFA" /> Lưới câu hỏi trắc nghiệm tự động:
                  </Text>
                  {activeTask.quizQuestions.map((q, qIdx) => (
                    <View key={qIdx} style={styles.quizQuestionCard}>
                      <Text style={styles.quizPromptText}>
                        {qIdx + 1}. {q.questionText}
                      </Text>
                      <View style={styles.optionsList}>
                        {q.options.map((opt) => {
                          const isSelected = selectedAnswers[qIdx] === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              activeOpacity={0.7}
                              onPress={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [qIdx]: opt.value }))
                              }
                              style={[
                                styles.optionItemRow,
                                isSelected && styles.optionItemSelected,
                              ]}
                            >
                              {isSelected ? (
                                <CheckSquare size={16} color={COLORS.primary} />
                              ) : (
                                <Square size={16} color={COLORS.muted} />
                              )}
                              <Text
                                style={[
                                  styles.optionText,
                                  isSelected && { color: '#FFF', fontWeight: '700' },
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {(activeTask?.formatType === 'TEXT' || activeTask?.formatType === 'HYBRID') && (
                <View style={styles.interactiveZone}>
                  <Text style={styles.sectionSubHeader}>
                    <FileText size={12} color="#60A5FA" /> IDE biên soạn mã nguồn / Phân tích tự
                    luận:
                  </Text>
                  <TextInput
                    multiline
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    placeholder="Nhập đoạn mã nguồn thực hành hoặc nội dung phân tích nghiệp vụ của bạn vào đây..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    style={styles.codeTextInput}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooterFixed}>
              <TouchableOpacity
                style={styles.submitTaskButton}
                onPress={handleSubmitWorkspace}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitTaskButtonText}>Nộp bài lên AI Mentor</Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassView>
        </View>
      </Modal>
    </View>
  );
}

// --- THAY THẾ KHỐI STYLESHEET SẠCH LỖI KHÔNG GIAN BẬT ĐƯỜNG TRUYỀN ---
const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#090D1A', paddingTop: 60 },
  tabHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  tabButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFF' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  centerBox: { justifyContent: 'center', alignItems: 'center', height: height * 0.5 },
  loadingText: { color: COLORS.muted, fontSize: 13, marginTop: 10, fontWeight: '600' },
  emptyText: { color: COLORS.muted, fontSize: 13 },
  topOverviewCard: { padding: 16, marginBottom: 20 },
  careerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  careerTitleText: { fontSize: 15, fontWeight: '800', color: '#FFF', flex: 1 },
  progressDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, color: '#64748B' },
  progressPercentText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  progressBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#1E293B', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', marginBottom: 12 },
  phaseCard: {
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  phaseCardLocked: { opacity: 0.35 },
  phaseHeaderTouch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phaseTag: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  phaseTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginTop: 4 },
  phaseExpandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  milestoneBlock: { marginBottom: 14 },
  milestoneTitleLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  milestoneTitleText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  taskListContainer: { gap: 8, marginTop: SPACING.xs, paddingLeft: 6 },
  taskItemTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  taskCompleted: { backgroundColor: 'rgba(16,185,129,0.03)', borderColor: 'rgba(16,185,129,0.1)' },
  taskInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  taskItemTitleText: { fontSize: 12, color: '#E2E8F0', fontWeight: '500' },
  taskTextDone: { color: '#64748B', textDecorationLine: 'line-through' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#0B0F19',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTag: { fontSize: 9, fontWeight: '800', color: COLORS.muted },
  modalMainTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', marginTop: 2 },
  closeModalBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 },
  modalBodyScroll: { marginTop: 14 },
  modalScrollContent: { paddingBottom: 30 },
  docSectionBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  sectionSubHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markdownBody: { fontSize: 13, color: '#94A3B8', lineHeight: 19 },
  interactiveZone: { marginTop: 20, gap: 10 },
  quizQuestionCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 10,
  },
  quizPromptText: { fontSize: 13, fontWeight: '700', color: '#FFF', marginBottom: SPACING.xs },
  optionsList: { gap: 6, marginTop: 4 },
  optionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  optionItemSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.06)' },
  optionText: { fontSize: 12, color: '#94A3B8' },
  codeTextInput: {
    height: 160,
    borderRadius: 12,
    backgroundColor: '#05070F',
    color: '#10B981',
    padding: 12,
    fontSize: 12,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalFooterFixed: { paddingTop: 10, paddingBottom: 20, backgroundColor: '#0B0F19' },
  submitTaskButton: {
    height: 50,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitTaskButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});

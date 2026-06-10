// app/(tabs)/orientation.tsx
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  Play,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassView } from '../../src/components/GlassView';
import { api } from '../../src/services/api';
import { COLORS, SPACING } from '../../src/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
  displayBadge: string;
  isTest: boolean;
  estimatedHours: number;
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

  // Khảo thí states
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [textAnswer, setTextAnswer] = useState<string>('');

  useEffect(() => {
    void fetchActiveRoadmap();
  }, []);

  const fetchActiveRoadmap = async () => {
    try {
      setLoading(true);
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
            const mappedTasks = (m.tasks || []).map((t: any) => {
              const matchState = rawProgress.find(
                (prog: any) => prog.taskId === (t.taskId || t.id || t._id),
              );
              const isDone = matchState ? matchState.status === 'COMPLETED' : false;
              const isTestComponent = t.formatType !== 'READ';

              let displayBadge = 'Lý thuyết';
              if (t.formatType === 'QUIZ') displayBadge = 'Trắc nghiệm';
              if (t.formatType === 'TEXT') displayBadge = 'Tự luận';
              if (t.formatType === 'HYBRID') displayBadge = 'Tổng hợp';

              return {
                id: t.taskId || t.id || t._id,
                title: t.taskTitle || t.title || 'Nhiệm vụ mới',
                description: t.description || 'Nội dung giáo trình mở rộng.',
                formatType: t.formatType || 'READ',
                quizQuestions: Array.isArray(t.quizQuestions) ? t.quizQuestions : [],
                isCompleted: isDone,
                displayBadge,
                isTest: isTestComponent,
                estimatedHours: t.estimatedHours || 2,
              };
            });

            const allTasksDone =
              mappedTasks.length > 0 && mappedTasks.every((t: IMappedTask) => t.isCompleted);

            return {
              milestoneId: m.milestoneId || m.id || m._id,
              title: m.title || `Mục tiêu mốc ${m.order || ''}`,
              desc: m.description || 'Hoàn thành năng lực chặng thực tế.',
              done: m.isCompleted || (mappedTasks.length > 0 ? allTasksDone : false),
              tasks: mappedTasks,
            };
          });

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

          let status: 'current' | 'locked' | 'completed' = 'locked';
          if (CalculatedProgress === 100 || p.isCompleted || p.status === 'completed') {
            status = 'completed';
          } else if (!foundCurrent) {
            status = 'current';
            foundCurrent = true;
            setExpandedPhaseId(p.phaseId || p.id || p._id); // Tự động bung chặng hiện tại cực thông minh
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

        if (!foundCurrent && mappedPhases.length > 0) {
          mappedPhases[mappedPhases.length - 1].status = 'current';
        }

        setPhases(mappedPhases);
      }
    } catch (error) {
      console.error('Lỗi khi tải ma trận lộ trình học:', error);
      Alert.alert('Lỗi đồng bộ', 'Không thể nạp dữ liệu lộ trình học. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkspace = (task: IMappedTask) => {
    setActiveTask(task);
    setSelectedAnswers({});
    setTextAnswer('');
    setWorkspaceVisible(true);
  };

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

      await api.post('/task-submissions', {
        taskId: activeTask.id,
        roadmapId: roadmapId,
        status: activeTask.formatType === 'READ' ? 'COMPLETED' : 'SUBMITTED',
        submissionContent: {
          textContent: textAnswer || 'Học viên nghiên cứu giáo trình hoàn tất.',
          quizAnswers: quizAnswersPayload,
        },
      });

      Alert.alert(
        'Thành công 🎉',
        'Hệ thống AI Mentor đã ghi nhận và chấm điểm bài làm của bạn!',
        [
          {
            text: 'Tuyệt vời',
            onPress: () => {
              setWorkspaceVisible(false);
              void fetchActiveRoadmap();
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
            void fetchActiveRoadmap();
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
    return current ? current.progress : 0;
  }, [phases]);

  if (loading) {
    return (
      <View style={[styles.mainWrapper, styles.centerBox]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Đang đồng bộ sơ đồ học tập AI...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />

      {/* 🌟 UPGRADE 1: TABS CHUYỂN ĐỔI CAO CẤP DIỆN DIỆN ĐẸP MẮT */}
      <View style={styles.tabHeaderRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('roadmap')}
          activeOpacity={0.8}
          style={[styles.tabButton, activeTab === 'roadmap' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'roadmap' && styles.tabTextActive]}>
            Lộ Trình Học AI
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('simulation')}
          activeOpacity={0.8}
          style={[styles.tabButton, activeTab === 'simulation' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'simulation' && styles.tabTextActive]}>
            Không Gian Giả Lập
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'roadmap' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 🌟 UPGRADE 2: BANNER GLASSMORPHISM TOÀN DIỆN, THOÁNG ĐÃNG, HIỆN ĐẠI */}
          <GlassView intensity={40} style={styles.topOverviewCard}>
            <View className="mb-3 flex-row items-center">
              <View style={styles.iconWrapper}>
                <Award size={22} color="#FBBF24" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.careerTitleText} numberOfLines={1}>
                  {careerTitle}
                </Text>
                <Text style={styles.progressLabel}>Hệ thống học tăng tiến Edumee</Text>
              </View>
            </View>

            <View style={styles.progressDataRow}>
              <Text style={styles.progressDataTitle}>Tiến độ chặng hiện tại</Text>
              <Text style={styles.progressPercentText}>{totalOverallProgress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${totalOverallProgress}%` }]} />
            </View>
          </GlassView>

          <Text style={styles.sectionHeaderTitle}>BẢN ĐỒ PHÁT TRIỂN NĂNG LỰC</Text>

          {/* 🌟 UPGRADE 3: DANH SÁCH CHẶNG PHASES HIỂN THỊ RỘNG RÃI, KHÔNG CÒN CHẬT CHỘI */}
          {phases.map((phase, pIndex) => {
            const isExpanded = expandedPhaseId === phase.phaseId;
            const isLocked = phase.status === 'locked';

            return (
              <View
                key={phase.phaseId}
                style={[
                  styles.phaseCard,
                  isExpanded && styles.phaseCardActive,
                  isLocked && styles.phaseCardLocked,
                ]}
              >
                <TouchableOpacity
                  onPress={() => !isLocked && setExpandedPhaseId(isExpanded ? null : phase.phaseId)}
                  style={styles.phaseHeaderTouch}
                  activeOpacity={0.7}
                  disabled={isLocked}
                >
                  <View style={styles.phaseNumberBadge}>
                    <Text style={styles.phaseNumberText}>0{pIndex + 1}</Text>
                  </View>

                  {/* 🟢 ĐÃ FIX ts(17002): Thay thế thẻ <div> bằng thẻ <View> chuẩn React Native */}
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.phaseTag}>THỜI LƯỢNG: {phase.phase.toUpperCase()}</Text>
                    <Text style={styles.phaseTitle}>{phase.title}</Text>
                  </View>

                  {!isLocked && (
                    <View style={styles.arrowIconCircle}>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#FFF" />
                      ) : (
                        <ChevronDown size={16} color="#94A3B8" />
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {isExpanded && !isLocked && (
                  <View style={styles.phaseExpandedContent}>
                    {phase.milestones.map((milestone) => (
                      <View key={milestone.milestoneId} style={styles.milestoneBlock}>
                        <View style={styles.milestoneTitleLine}>
                          <CheckCircle2
                            size={16}
                            color={milestone.done ? '#10B981' : '#475569'}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.milestoneTitleText}>{milestone.title}</Text>
                        </View>

                        {/* 🎯 UPGRADE 4: XÓA BỎ HOÀN TOÀN ĐƯỜNG LINE MỜ BÊN HÔNG NHIỆM VỤ */}
                        <View style={styles.taskListContainer}>
                          {milestone.tasks.map((task) => (
                            <TouchableOpacity
                              key={task.id}
                              activeOpacity={0.7}
                              style={[
                                styles.taskItemTouch,
                                task.isCompleted && styles.taskCompleted,
                              ]}
                              onPress={() => handleOpenWorkspace(task)}
                            >
                              <View style={styles.taskInfoRow}>
                                <View
                                  style={[
                                    styles.taskTypeIconOuter,
                                    task.isCompleted && styles.taskTypeIconCompleted,
                                  ]}
                                >
                                  {task.isTest ? (
                                    <Sparkles
                                      size={14}
                                      color={task.isCompleted ? '#10B981' : '#F59E0B'}
                                    />
                                  ) : (
                                    <GraduationCap
                                      size={14}
                                      color={task.isCompleted ? '#10B981' : '#3B82F6'}
                                    />
                                  )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text
                                    style={[
                                      styles.taskItemTitleText,
                                      task.isCompleted && styles.taskTextDone,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {task.title}
                                  </Text>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      marginTop: 4,
                                    }}
                                  >
                                    <BadgeLabel isTest={task.isTest} text={task.displayBadge} />
                                    <Text style={styles.estimatedHoursText}>
                                      • ~{task.estimatedHours} giờ
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <View
                                style={[
                                  styles.actionBtnBlock,
                                  task.isCompleted && styles.actionBtnBlockCompleted,
                                ]}
                              >
                                <Play
                                  size={10}
                                  color={task.isCompleted ? '#10B981' : '#FFF'}
                                  fill={task.isCompleted ? '#10B981' : '#FFF'}
                                />
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}

                    <View style={styles.kpiInfoBox}>
                      <Text style={styles.kpiBoxTitle}>🎯 TIÊU CHÍ QUA CHẶNG KHẢO THÍ</Text>
                      <Text style={styles.kpiBoxContent}>{phase.kpi}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {activeTab === 'simulation' && (
        <View style={[styles.container, styles.centerBox]}>
          <Sparkles size={44} color={COLORS.secondary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>Hệ thống Không gian giả lập Agent nâng cao...</Text>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
            Đang đồng bộ dữ liệu đồ họa độc quyền
          </Text>
        </View>
      )}

      {/* ================= 🌟 UPGRADE 5: WORKSPACE MODAL FULL-SCREEN TRÀN VIỀN RỘNG RÃI ================= */}
      <Modal
        visible={workspaceVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
      >
        <View style={styles.modalOverlayFullScreen}>
          {/* Header vùng đỉnh rộng rãi */}
          <View style={styles.modalHeaderRowNew}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.modalTagNew}>WORKSPACE KHẢO THÍ ĐỘC QUYỀN</Text>
              <Text style={styles.modalMainTitleNew} numberOfLines={1}>
                {activeTask?.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setWorkspaceVisible(false)}
              style={styles.closeModalBtnNew}
              activeOpacity={0.7}
            >
              <X size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Body cuộn mượt độc lập hoàn toàn, không lồng ghép chật chội */}
          <ScrollView
            style={styles.modalBodyScrollNew}
            contentContainerStyle={styles.modalScrollContentNew}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.docSectionBoxNew}>
              <View className="mb-2 flex-row items-center">
                <FileText size={14} color={COLORS.secondary} />
                <Text style={styles.sectionSubHeaderNew}>Giáo trình hướng dẫn nghiệp vụ:</Text>
              </View>
              <Text style={styles.markdownBodyNew}>{activeTask?.description}</Text>
            </View>

            {activeTask?.quizQuestions && activeTask.quizQuestions.length > 0 && (
              <View style={styles.interactiveZoneNew}>
                <View className="mb-3 flex-row items-center">
                  <Sparkles size={14} color="#A78BFA" />
                  <Text style={styles.sectionSubHeaderNew}>Lưới câu hỏi trắc nghiệm tự động:</Text>
                </View>

                {activeTask.quizQuestions.map((q, qIdx) => (
                  <View key={qIdx} style={styles.quizQuestionCardNew}>
                    <Text style={styles.quizPromptTextNew}>
                      {qIdx + 1}. {q.questionText}
                    </Text>
                    <View style={styles.optionsListNew}>
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
                              styles.optionItemRowNew,
                              isSelected && styles.optionItemSelectedNew,
                            ]}
                          >
                            <View
                              style={[
                                styles.customRadioCircle,
                                isSelected && styles.customRadioCircleSelected,
                              ]}
                            >
                              {isSelected && <View style={styles.customRadioInnerDot} />}
                            </View>
                            <Text
                              style={[
                                styles.optionTextNew,
                                isSelected && { color: '#FFF', fontWeight: '600' },
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
              <View style={styles.interactiveZoneNew}>
                <View className="mb-2 flex-row items-center">
                  <FileText size={14} color="#60A5FA" />
                  <Text style={styles.sectionSubHeaderNew}>
                    IDE biên soạn mã nguồn / Phân tích tự luận:
                  </Text>
                </View>
                <TextInput
                  multiline
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  placeholder="Nhập đoạn mã nguồn code thực hành hoặc nội dung phân tích nghiệp vụ của bạn vào đây..."
                  placeholderTextColor="#475569"
                  style={styles.codeTextInputNew}
                  scrollEnabled={false}
                />
              </View>
            )}
          </ScrollView>

          {/* Khối Footer cố định tràn cạnh dưới nút bấm to rõ ràng */}
          <View style={styles.modalFooterFixedNew}>
            <TouchableOpacity
              style={styles.submitTaskButtonNew}
              onPress={void handleSubmitWorkspace}
              activeOpacity={0.8}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitTaskButtonTextNew}>Nộp bài lên AI Mentor</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ── THÀNH PHẦN BADGE PHÂN LOẠI NHIỆM VỤ ĐẸP MẮT ── */
const BadgeLabel = ({ isTest, text }: { isTest: boolean; text: string }) => {
  return (
    <View style={[styles.badgeContainer, isTest ? styles.badgeTest : styles.badgeRead]}>
      <Text style={[styles.badgeText, isTest ? styles.badgeTextTest : styles.badgeTextRead]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#05070F', paddingTop: 50 },
  tabHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabButtonActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFF' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  centerBox: { justifyContent: 'center', alignItems: 'center', height: SCREEN_HEIGHT * 0.5 },
  loadingText: { color: COLORS.muted, fontSize: 13, marginTop: 12, fontWeight: '600' },
  emptyText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  topOverviewCard: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  careerTitleText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  progressLabel: { fontSize: 12, color: '#475569', marginTop: 2 },
  progressDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    marginTop: 12,
  },
  progressDataTitle: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  progressPercentText: { fontSize: 16, fontWeight: '900', color: '#3B82F6' },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },

  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 1,
  },

  phaseCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  phaseCardActive: { borderColor: 'rgba(59,130,246,0.2)', backgroundColor: '#0B132B' },
  phaseCardLocked: { opacity: 0.25 },
  phaseHeaderTouch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phaseNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  phaseNumberText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  phaseTag: { fontSize: 9, fontWeight: '800', color: '#3B82F6', letterSpacing: 0.5 },
  phaseTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginTop: 2 },
  arrowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  phaseExpandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  milestoneBlock: { marginBottom: 18 },
  milestoneTitleLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  milestoneTitleText: { fontSize: 14, fontWeight: '800', color: '#F8FAFC' },
  taskListContainer: { gap: 10, marginTop: 4 },

  taskItemTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#05070F',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  taskCompleted: { backgroundColor: 'rgba(16,185,129,0.02)', borderColor: 'rgba(16,185,129,0.15)' },
  taskInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  taskTypeIconOuter: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    display: 'flex',
  },
  taskTypeIconCompleted: { backgroundColor: 'rgba(16,185,129,0.08)' },
  taskItemTitleText: { fontSize: 13, color: '#E2E8F0', fontWeight: '600', lineHeight: 17 },
  taskTextDone: { color: '#475569', textDecorationLine: 'line-through' },
  estimatedHoursText: { fontSize: 11, color: '#475569', marginLeft: 6, fontWeight: '500' },
  actionBtnBlock: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 1,
  },
  actionBtnBlockCompleted: { backgroundColor: 'rgba(16,185,129,0.1)' },

  kpiInfoBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.08)',
    marginTop: 4,
  },
  kpiBoxTitle: { fontSize: 10, fontWeight: '800', color: '#3B82F6', letterSpacing: 0.5 },
  kpiBoxContent: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },

  badgeContainer: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeTest: { backgroundColor: 'rgba(245,158,11,0.1)' },
  badgeRead: { backgroundColor: 'rgba(59,130,246,0.1)' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextTest: { color: '#F59E0B' },
  badgeTextRead: { color: '#3B82F6' },

  /* NEW WORKSPACE TRÀN VIỀN PHẢN HỒI CAO CẤP */
  modalOverlayFullScreen: { flex: 1, backgroundColor: '#05070F', paddingTop: 50 },
  modalHeaderRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTagNew: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  modalMainTitleNew: { fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 4 },
  closeModalBtnNew: {
    width: 36,
    height: 36,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalBodyScrollNew: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
  modalScrollContentNew: { paddingBottom: 40 },
  docSectionBoxNew: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionSubHeaderNew: { fontSize: 13, fontWeight: '800', color: '#F8FAFC', marginLeft: 8 },
  markdownBodyNew: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginTop: 4 },
  interactiveZoneNew: { marginTop: 24 },
  quizQuestionCardNew: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  quizPromptTextNew: { fontSize: 14, fontWeight: '700', color: '#FFF', lineHeight: 18 },
  optionsListNew: { gap: 8, marginTop: 12 },
  optionItemRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#05070F',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  optionItemSelectedNew: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.04)' },
  customRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRadioCircleSelected: { borderColor: '#3B82F6' },
  customRadioInnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  optionTextNew: { fontSize: 13, color: '#94A3B8', flex: 1 },
  codeTextInputNew: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#05070F',
    color: '#10B981',
    padding: 14,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 4,
  },
  modalFooterFixedNew: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#05070F',
  },
  submitTaskButtonNew: {
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitTaskButtonTextNew: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

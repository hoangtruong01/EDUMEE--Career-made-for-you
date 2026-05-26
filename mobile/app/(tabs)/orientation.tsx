import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { 
  Map, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Award, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Lock, 
  Briefcase, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  Lightbulb,
  Trophy
} from 'lucide-react-native';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

export default function OrientationScreen() {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'simulation'>('roadmap');
  
  // Roadmap states
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [topMatches, setTopMatches] = useState<any[]>([]);

  // Simulation states
  const [simulations, setSimulations] = useState<any[]>([]);
  const [activeSimCareer, setActiveSimCareer] = useState<string | null>(null);
  const [activeSimLevelIdx, setActiveSimLevelIdx] = useState<number>(0);
  const [simData, setSimData] = useState<any>(null);
  const [loadingSim, setLoadingSim] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadingRoadmap(true);
      // Fetch latest learning roadmap
      const roadmapRes = await api.get('/learning-roadmaps/latest');
      if (roadmapRes.data?.data) {
        setRoadmap(roadmapRes.data.data);
      } else if (roadmapRes.data) {
        setRoadmap(roadmapRes.data);
      }

      // Fetch top matches to help generate roadmap if none exists
      const matchesRes = await api.get('/career-fit-results/top-matches');
      const matchesArr = matchesRes.data?.data || matchesRes.data || [];
      setTopMatches(Array.isArray(matchesArr) ? matchesArr : []);

      // Fetch simulation top careers
      const simCareersRes = await api.get('/career-simulation/top-careers');
      const careersArr = simCareersRes.data?.data || simCareersRes.data || [];
      setSimSimulationsData(careersArr);
    } catch (e) {
      console.log('Orientation fetch error:', e);
      // Fallback top matches if API is not fully deployed
      setTopMatches([{ careerTitle: 'Kỹ sư Phần mềm (AI)' }, { careerTitle: 'Product Designer' }]);
    } finally {
      setLoadingRoadmap(false);
    }
  }, []);

  const setSimSimulationsData = async (careersArr: any[]) => {
    const list = Array.isArray(careersArr) ? careersArr : [];
    setSimulations(list);
    if (list.length > 0) {
      const activeTitle = list[0].title || list[0].careerTitle;
      setActiveSimCareer(activeTitle);
      fetchSimulationDetails(activeTitle);
    } else {
      // Fallback if no simulation career results are found
      setActiveSimCareer('Kỹ sư Phần mềm (AI)');
      fetchSimulationDetails('Kỹ sư Phần mềm (AI)');
    }
  };

  const fetchSimulationDetails = async (careerTitle: string) => {
    setLoadingSim(true);
    try {
      const simRes = await api.get(`/career-simulation/${encodeURIComponent(careerTitle)}`);
      const details = simRes.data?.data || simRes.data;
      setSimData(details);
      setActiveSimLevelIdx(0);
    } catch (e) {
      console.log('Failed to fetch simulation details:', e);
      // Fallback premium mock
      generateFallbackSimulation(careerTitle);
    } finally {
      setLoadingSim(false);
    }
  };

  const generateFallbackSimulation = (title: string) => {
    setSimData({
      label: title,
      levels: [
        {
          id: '1',
          label: 'Intern / Junior Developer',
          emoji: '👶',
          salaryRange: '8M - 15M VND',
          yearRange: '0 - 2 năm kinh nghiệm',
          nextLevel: 'Senior Developer',
          skills: [{ name: 'React Native', color: '#8B5CF6' }, { name: 'JavaScript', color: '#10B981' }, { name: 'Git / GitHub', color: '#3B82F6' }],
          dailyTasks: ['Sửa lỗi giao diện CSS/UI', 'Viết unit test cho các service chính', 'Học hỏi code reviews từ các anh Senior'],
          typicalSchedule: [
            { time: '09:00', activity: 'Daily standup meeting & báo cáo task' },
            { time: '10:00', activity: 'Coding sửa lỗi UI & hoàn thiện layout' },
            { time: '14:00', activity: 'Làm việc nhóm bàn luận giải pháp' },
            { time: '16:00', activity: 'Nghiên cứu tài liệu công nghệ mới' }
          ],
          challenge: 'Môi trường làm việc thực chiến tốc độ cao, yêu cầu đọc hiểu nhanh codebase có sẵn.',
          tip: 'Chủ động đặt câu hỏi đúng trọng tâm, viết tài liệu chỉn chu và kiên trì rèn luyện kỹ năng giải quyết vấn đề.'
        },
        {
          id: '2',
          label: 'Senior Developer',
          emoji: '👨‍💻',
          salaryRange: '25M - 45M VND',
          yearRange: '3 - 5 năm kinh nghiệm',
          nextLevel: 'Technical Architect',
          skills: [{ name: 'System Design', color: '#EC4899' }, { name: 'NodeJS NestJS', color: '#8B5CF6' }, { name: 'Docker / AWS', color: '#F59E0B' }],
          dailyTasks: ['Thiết kế cấu trúc API & database', 'Dẫn dắt các bạn Intern/Junior', 'Đánh giá tối ưu hiệu năng ứng dụng'],
          typicalSchedule: [
            { time: '09:30', activity: 'Duyệt Merge Requests và Code Reviews' },
            { time: '11:00', activity: 'Họp kiến trúc hệ thống với CTO' },
            { time: '14:00', activity: 'Coding các tính năng cốt lõi phức tạp' },
            { time: '16:30', activity: 'Mentor 1-1 hỗ trợ thành viên team' }
          ],
          challenge: 'Đảm bảo tính ổn định của hệ thống chịu tải cao và cân bằng tiến độ dự án.',
          tip: 'Tập trung rèn luyện tư duy hệ thống rộng lớn, trau dồi soft skills và kỹ năng quản lý thời gian.'
        }
      ]
    });
    setActiveSimLevelIdx(0);
  };

  const handleGenerateRoadmap = async (careerTitle: string) => {
    setGeneratingRoadmap(true);
    try {
      const response = await api.post('/learning-roadmaps/generate-ai', { careerTitle });
      const created = response.data?.data || response.data;
      setRoadmap(created);
      Alert.alert('Thành công', `AI đã thiết lập xong Lộ trình học ngành ${careerTitle} cho bạn!`);
    } catch (err: any) {
      console.log('Generate roadmap error:', err);
      // Premium Mock fallback
      setRoadmap({
        title: `Lộ trình học tập AI: ${careerTitle}`,
        description: 'Lộ trình phát triển tối ưu thiết kế riêng theo tố chất năng lực RIASEC của bạn.',
        phases: [
          {
            phaseId: 'p1',
            title: 'Nền tảng căn bản và Công cụ',
            estimatedDuration: 'Tháng 1 - Tháng 2',
            objectives: ['Nắm vững cú pháp cơ bản', 'Thực hành các bài tập thuật toán đơn giản', 'Làm quen Git'],
            milestones: [
              {
                milestoneId: 'm1',
                title: 'Lập trình căn bản',
                description: 'Hiểu sâu về cấu trúc dữ liệu cơ bản, biến, vòng lặp và hàm.',
                tasks: [
                  { taskTitle: 'Hoàn thành khóa học Basic Syntax', isRequired: true },
                  { taskTitle: 'Giải 30 bài tập thuật toán cơ bản trên LeetCode', isRequired: false }
                ],
                skills: [{ skillName: 'Logic lập trình', targetLevel: 3 }]
              }
            ]
          },
          {
            phaseId: 'p2',
            title: 'Xây dựng Dự án Thực chiến',
            estimatedDuration: 'Tháng 3 - Tháng 5',
            objectives: ['Xây dựng ứng dụng hoàn chỉnh', 'Tích hợp Database', 'Deploy sản phẩm'],
            milestones: [
              {
                milestoneId: 'm2',
                title: 'Fullstack App Deployment',
                description: 'Kết nối frontend, backend và đưa sản phẩm lên môi trường cloud.',
                tasks: [
                  { taskTitle: 'Xây dựng Portfolio Web cá nhân', isRequired: true },
                  { taskTitle: 'Cấu hình Docker container cơ bản', isRequired: true }
                ],
                skills: [{ skillName: 'Fullstack Development', targetLevel: 4 }]
              }
            ]
          }
        ]
      });
      Alert.alert('Thành công', 'Lộ trình học AI đã được thiết lập giả lập thành công!');
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mapApiRoadmap = (roadmapObj: any) => {
    if (!roadmapObj?.phases) return [];
    return roadmapObj.phases.map((phase: any, i: number) => ({
      phase: phase.estimatedDuration || `Giai đoạn ${i + 1}`,
      title: phase.title,
      status: i === 0 ? 'current' : 'locked',
      milestones: phase.milestones?.map((m: any) => ({
        title: m.title,
        desc: m.description,
        done: m.done || false,
        tasks: m.tasks?.map((t: any) => t.taskTitle) || [],
      })) || [],
      skills: phase.milestones?.flatMap((m: any) => m.skills?.map((s: any) => s.skillName) || [])?.slice(0, 3) || [],
      kpi: phase.objectives?.join(' • ') || 'Hoàn thành giai đoạn',
    }));
  };

  const roadmapData = mapApiRoadmap(roadmap);

  return (
    <View style={styles.container}>
      {/* Tab Segment Header */}
      <View style={styles.segmentHeader}>
        <View style={styles.segmentWrapper}>
          <TouchableOpacity 
            onPress={() => setActiveTab('roadmap')}
            style={[styles.segmentBtn, activeTab === 'roadmap' && styles.segmentBtnActive]}
          >
            <BookOpen size={16} color={activeTab === 'roadmap' ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'roadmap' && styles.segmentBtnTextActive]}>Lộ trình học AI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('simulation')}
            style={[styles.segmentBtn, activeTab === 'simulation' && styles.segmentBtnActive]}
          >
            <Briefcase size={16} color={activeTab === 'simulation' ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'simulation' && styles.segmentBtnTextActive]}>Mô phỏng nghề</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingRoadmap && activeTab === 'roadmap'}
            onRefresh={fetchData}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {activeTab === 'roadmap' ? (
          /* 🚀 ROADMAP SCREEN CONTENT */
          <View>
            {!roadmap ? (
              <GlassView style={styles.emptyCard}>
                <Target size={44} color={COLORS.primary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Chưa có Lộ trình học AI</Text>
                <Text style={styles.emptyDesc}>
                  Chọn ngành nghề định hướng dưới đây để AI (Gemini) thiết lập lộ trình học cá nhân hóa cho riêng bạn.
                </Text>

                {generatingRoadmap ? (
                  <View style={styles.generatingBox}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.generatingText}>AI đang biên soạn lộ trình chi tiết...</Text>
                  </View>
                ) : (
                  <View style={styles.generateSelectContainer}>
                    {topMatches.map((match, idx) => {
                      const title = match.careerTitle || match.careerId?.title || 'Nghề nghiệp';
                      return (
                        <TouchableOpacity 
                          key={idx}
                          onPress={() => handleGenerateRoadmap(title)}
                          style={styles.generateBtn}
                        >
                          <Sparkles size={14} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.generateBtnText}>Tạo lộ trình: {title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </GlassView>
            ) : (
              <View>
                {/* Roadmap Header info */}
                <GlassView style={styles.roadmapInfoCard}>
                  <View style={styles.flexRow}>
                    <Sparkles size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.roadmapInfoTitle}>{roadmap.title}</Text>
                  </View>
                  <Text style={styles.roadmapInfoDesc}>{roadmap.description}</Text>
                </GlassView>

                {/* Vertical Timeline Steps */}
                <Text style={styles.sectionTitle}>Các giai đoạn phát triển ({roadmapData.length})</Text>
                
                <View style={styles.webTimelineContainer}>
                  {roadmapData.map((phase: any, index: number) => {
                    const isExpanded = expandedPhase === index;
                    const isCurrent = phase.status === 'current';
                    const isLocked = phase.status === 'locked';

                    return (
                      <GlassView
                        key={index}
                        style={[
                          styles.webPhaseCard,
                          isLocked && { opacity: 0.6 }
                        ]}
                      >
                        <TouchableOpacity 
                          onPress={() => setExpandedPhase(isLocked ? null : (isExpanded ? null : index))}
                          disabled={isLocked}
                          style={styles.webPhaseHeader}
                        >
                          {/* Square Icon box like web */}
                          <View
                            style={[
                              styles.webIconBox,
                              isCurrent ? styles.webIconBoxCurrent : isLocked ? styles.webIconBoxLocked : styles.webIconBoxCompleted
                            ]}
                          >
                            {isCurrent ? (
                              <Clock size={20} color="#fff" />
                            ) : isLocked ? (
                              <Target size={20} color={COLORS.muted} />
                            ) : (
                              <Trophy size={20} color="#fff" />
                            )}
                          </View>

                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.webPhaseDuration}>{phase.phase}</Text>
                            <View style={styles.flexRow}>
                              <Text style={styles.webPhaseTitle}>{phase.title}</Text>
                              {isLocked && <Lock size={12} color={COLORS.muted} style={{ marginLeft: 6 }} />}
                            </View>

                            {/* Progress bar under current phase title */}
                            {isCurrent && (
                              <View style={styles.webProgressBarBg}>
                                <View style={[styles.webProgressBarFill, { width: 35 }]} />
                              </View>
                            )}
                          </View>

                          {/* Right badges */}
                          {isCurrent && (
                            <View style={styles.webBadgeCurrent}>
                              <Text style={styles.webBadgeCurrentText}>Đang học</Text>
                            </View>
                          )}
                          {isLocked && (
                            <View style={styles.webBadgeLocked}>
                              <Lock size={10} color={COLORS.muted} style={{ marginRight: 4 }} />
                              <Text style={styles.webBadgeLockedText}>Chưa mở</Text>
                            </View>
                          )}

                          {!isLocked && (
                            isExpanded ? (
                              <ChevronUp size={18} color={COLORS.muted} style={{ marginLeft: 8 }} />
                            ) : (
                              <ChevronDown size={18} color={COLORS.muted} style={{ marginLeft: 8 }} />
                            )
                          )}
                        </TouchableOpacity>

                        {isExpanded && !isLocked && (
                          <View style={styles.webPhaseContent}>
                            {/* Checklist Milestones */}
                            <View style={styles.webMilestonesList}>
                              {phase.milestones.map((m: any, mIdx: number) => {
                                const isMilestoneDone = m.done || (isCurrent && mIdx === 0);
                                return (
                                  <View key={mIdx} style={styles.webMilestoneItem}>
                                    <CheckCircle2 
                                      size={18} 
                                      color={isMilestoneDone ? '#10B981' : COLORS.muted} 
                                      style={{ marginRight: 10, marginTop: 2 }} 
                                    />
                                    <View style={{ flex: 1 }}>
                                      <Text 
                                        style={[
                                          styles.webMilestoneTitle,
                                          isMilestoneDone && styles.webMilestoneTitleDone
                                        ]}
                                      >
                                        {m.title}
                                      </Text>
                                      <Text style={styles.webMilestoneDesc}>{m.desc}</Text>

                                      {m.tasks && m.tasks.length > 0 && (
                                        <View style={styles.webTaskList}>
                                          {m.tasks.map((t: string, tIdx: number) => (
                                            <Text key={tIdx} style={styles.webTaskItem}>• {t}</Text>
                                          ))}
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>

                            {/* Skills block */}
                            {phase.skills && phase.skills.length > 0 && (
                              <View style={styles.webSectionBlock}>
                                <Text style={styles.webBlockTitle}>Kỹ năng cần đạt:</Text>
                                <View style={styles.webSkillsRow}>
                                  {phase.skills.map((s: string, sIdx: number) => (
                                    <View key={sIdx} style={styles.webSkillBadge}>
                                      <Text style={styles.webSkillBadgeText}>{s}</Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            )}

                            {/* KPI Block */}
                            <View style={styles.webKpiBlock}>
                              <Text style={styles.webKpiBlockTitle}>🎯 KPI giai đoạn</Text>
                              <Text style={styles.webKpiBlockValue}>{phase.kpi}</Text>
                            </View>
                          </View>
                        )}
                      </GlassView>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : (
          /* 🤖 SIMULATION SCREEN CONTENT */
          <View>
            {/* Career choice horizontal pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.simScroll}>
              {simulations.map((sim, idx) => {
                const title = sim.title || sim.careerTitle;
                const isSelected = activeSimCareer === title;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setActiveSimCareer(title);
                      fetchSimulationDetails(title);
                    }}
                    style={[styles.simPill, isSelected && styles.simPillActive]}
                  >
                    <Text style={[styles.simPillText, isSelected && styles.simPillTextActive]}>{title}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingSim ? (
              <View style={styles.loadingAnalysisBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingAnalysisText}>AI đang biên soạn ngày làm việc thực tế...</Text>
              </View>
            ) : simData ? (
              <View>
                {/* Level selectors */}
                <View style={styles.levelsRow}>
                  {simData.levels?.map((lvl: any, idx: number) => {
                    const isSelected = activeSimLevelIdx === idx;
                    return (
                      <TouchableOpacity
                        key={lvl.id}
                        onPress={() => setActiveSimLevelIdx(idx)}
                        style={[styles.levelBtn, isSelected && styles.levelBtnActive]}
                      >
                        <Text style={styles.levelEmoji}>{lvl.emoji || '💼'}</Text>
                        <Text style={[styles.levelBtnLabel, isSelected && styles.levelBtnLabelActive]} numberOfLines={1}>
                          {lvl.label?.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Level Detail Hero Box */}
                {simData.levels?.[activeSimLevelIdx] && (
                  <View style={styles.levelDetailContainer}>
                    {/* Hero Gradient Box */}
                    <GlassView style={[styles.levelHeroCard, { borderColor: COLORS.primary }]}>
                      <View style={styles.flexRowBetween}>
                        <Text style={styles.levelHeroTitle}>{simData.levels[activeSimLevelIdx].label}</Text>
                        <Text style={styles.levelHeroEmoji}>{simData.levels[activeSimLevelIdx].emoji}</Text>
                      </View>
                      
                      <View style={styles.levelMetaRow}>
                        <View style={styles.flexRow}>
                          <Clock size={14} color={COLORS.muted} style={{ marginRight: 4 }} />
                          <Text style={styles.levelMetaText}>{simData.levels[activeSimLevelIdx].yearRange}</Text>
                        </View>
                        <View style={styles.flexRow}>
                          <Award size={14} color={COLORS.secondary} style={{ marginRight: 4 }} />
                          <Text style={styles.levelMetaText}>{simData.levels[activeSimLevelIdx].salaryRange}</Text>
                        </View>
                      </View>

                      {/* Required skills */}
                      <View style={styles.skillsTagRowSmall}>
                        {simData.levels[activeSimLevelIdx].skills?.map((s: any, idx: number) => (
                          <View key={idx} style={[styles.smallSkillTag, { backgroundColor: (s.color || COLORS.primary) + '15', borderColor: s.color || COLORS.primary }]}>
                            <Text style={[styles.smallSkillTagText, { color: s.color || COLORS.primary }]}>{s.name}</Text>
                          </View>
                        ))}
                      </View>
                    </GlassView>

                    {/* Simulation Daily Schedule timeline */}
                    <GlassView style={styles.simTasksCard}>
                      <Text style={styles.simCardTitle}>📅 Lịch trình một ngày điển hình</Text>
                      <View style={styles.scheduleTimeline}>
                        {simData.levels[activeSimLevelIdx].typicalSchedule?.map((item: any, idx: number) => (
                          <View key={idx} style={styles.scheduleItem}>
                            <View style={styles.scheduleLeft}>
                              <Text style={styles.scheduleTime}>{item.time}</Text>
                              <View style={styles.scheduleDot} />
                            </View>
                            <View style={styles.scheduleRight}>
                              <Text style={styles.scheduleActivity}>{item.activity}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </GlassView>

                    {/* Challenge and Expert Tips */}
                    <View style={styles.feedbackGrid}>
                      <GlassView style={styles.challengeBox}>
                        <View style={styles.flexRow}>
                          <AlertTriangle size={16} color="#EF4444" style={{ marginRight: 6 }} />
                          <Text style={styles.challengeTitle}>Thách thức lớn nhất</Text>
                        </View>
                        <Text style={styles.challengeDesc}>
                          {simData.levels[activeSimLevelIdx].challenge}
                        </Text>
                      </GlassView>

                      <GlassView style={styles.tipBox}>
                        <View style={styles.flexRow}>
                          <Lightbulb size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                          <Text style={styles.tipTitle}>Lời khuyên từ AI Chuyên gia</Text>
                        </View>
                        <Text style={styles.tipDesc}>
                          {simData.levels[activeSimLevelIdx].tip}
                        </Text>
                      </GlassView>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <GlassView style={styles.emptyCard}>
                <Briefcase size={44} color={COLORS.muted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Chưa có mô phỏng nghề nghiệp</Text>
                <Text style={styles.emptyDesc}>Hãy làm trắc nghiệm Holland trước để mở khóa.</Text>
              </GlassView>
            )}
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  segmentHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  segmentBtnTextActive: {
    color: COLORS.foreground,
  },
  content: {
    padding: SPACING.lg,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  generatingText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  generateSelectContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  generateBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  roadmapInfoCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    borderColor: 'rgba(139, 92, 246, 0.12)',
    marginBottom: SPACING.md,
  },
  roadmapInfoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  roadmapInfoDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    marginVertical: SPACING.md,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    position: 'absolute',
    top: 24,
    bottom: -10,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.primary,
  },
  timelineDotLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timelineRight: {
    flex: 1,
    paddingLeft: SPACING.md,
    paddingBottom: SPACING.md,
  },
  phaseCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  phaseDuration: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  phaseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: 2,
  },
  phaseContent: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  phaseSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  kpiText: {
    fontSize: 12,
    color: COLORS.foreground,
    lineHeight: 18,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  skillTagText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  milestoneBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  milestoneDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
    marginVertical: 4,
  },
  taskText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.md,
  },
  footerSpace: {
    height: 100,
  },

  /* 🤖 SIMULATION SPECIFIC STYLES */
  simScroll: {
    marginVertical: SPACING.md,
  },
  simPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  simPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  simPillText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  simPillTextActive: {
    color: COLORS.foreground,
  },
  loadingAnalysisBox: {
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnalysisText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
    fontSize: 13,
  },
  levelsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  levelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: COLORS.primary,
  },
  levelEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  levelBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  levelBtnLabelActive: {
    color: COLORS.foreground,
  },
  levelDetailContainer: {
    gap: SPACING.md,
  },
  levelHeroCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  levelHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  levelHeroEmoji: {
    fontSize: 24,
  },
  levelMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 6,
    marginBottom: SPACING.md,
  },
  levelMetaText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  skillsTagRowSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  smallSkillTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  smallSkillTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  simTasksCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  simCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  scheduleTimeline: {
    paddingLeft: 6,
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  scheduleLeft: {
    width: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SPACING.sm,
  },
  scheduleTime: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  scheduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  scheduleRight: {
    flex: 1,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.05)',
  },
  scheduleActivity: {
    fontSize: 12,
    color: COLORS.foreground,
    lineHeight: 18,
  },
  feedbackGrid: {
    gap: SPACING.sm,
  },
  challengeBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  challengeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  challengeDesc: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginTop: 6,
  },
  tipBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FDE047',
  },
  tipDesc: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginTop: 6,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webTimelineContainer: {
    gap: SPACING.md,
  },
  webPhaseCard: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  webPhaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  webIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webIconBoxCurrent: {
    backgroundColor: COLORS.primary,
  },
  webIconBoxLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  webIconBoxCompleted: {
    backgroundColor: '#10B981',
  },
  webPhaseDuration: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  webPhaseTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: 2,
  },
  webProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginTop: 6,
    maxWidth: 150,
  },
  webProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  webBadgeCurrent: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  webBadgeCurrentText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  webBadgeLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  webBadgeLockedText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  webPhaseContent: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  webMilestonesList: {
    gap: SPACING.sm,
  },
  webMilestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  webMilestoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  webMilestoneTitleDone: {
    color: COLORS.muted,
    textDecorationLine: 'line-through',
  },
  webMilestoneDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  webTaskList: {
    marginTop: 8,
    paddingLeft: 4,
  },
  webTaskItem: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
    marginBottom: 2,
  },
  webSectionBlock: {
    marginTop: SPACING.md,
  },
  webBlockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: 6,
  },
  webSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  webSkillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  webSkillBadgeText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  webKpiBlock: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  webKpiBlockTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  webKpiBlockValue: {
    fontSize: 13,
    color: COLORS.foreground,
    lineHeight: 18,
  },
});

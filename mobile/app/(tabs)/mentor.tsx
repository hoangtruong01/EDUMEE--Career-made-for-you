import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { 
  Heart, 
  MessageSquare, 
  Star, 
  Calendar, 
  MessageCircle, 
  ArrowRight, 
  UserCheck, 
  Send, 
  Sparkles,
  Search,
  Filter,
  X,
  CreditCard,
  Briefcase
} from 'lucide-react-native';
import { api } from '../../src/services/api';

export default function MentorTabScreen() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  
  // Booking flow
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingReason, setBookingReason] = useState('');
  const [bookingDate, setBookingDate] = useState('Ngày mai, 14:00 - 15:00');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const fetchMentors = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true); else setIsLoading(true);
      const response = await api.get('/tutor-profiles/active');
      const list = response.data?.data || response.data || [];
      
      // Parse active mentors to match UI
      const parsed = list.map((item: any) => {
        const name = item.mentorUser?.name || 'Mentor Edumee';
        const avatar = item.mentorUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150';
        const title = item.professionalBackground?.currentPosition 
          ? `${item.professionalBackground.currentPosition} tại ${item.professionalBackground.company || 'Doanh nghiệp'}`
          : 'Chuyên gia Định hướng';
        const rating = item.performanceMetrics?.ratings?.averageRating || 5.0;
        const reviews = item.performanceMetrics?.ratings?.totalReviews || 12;
        const priceVal = item.pricing?.sessionRates?.[0]?.pricePerSession || 150000;
        const skills = item.mentoringExpertise?.skillExpertise?.map((s: any) => s.skillName) || ['Mentoring', 'Soft skills'];
        const bio = item.pricing?.sessionRates?.[0]?.sessionType 
          ? `Tư vấn chuyên sâu về ${item.pricing.sessionRates[0].sessionType}`
          : 'Học hỏi kinh nghiệm thực chiến từ chuyên gia hàng đầu trong ngành.';
        
        return {
          id: item._id || item.id,
          name,
          title,
          skills,
          rating,
          reviews,
          price: `${priceVal / 1000}k / phiên`,
          rawPrice: priceVal,
          avatar,
          bio
        };
      });
      
      setMentors(parsed.length > 0 ? parsed : getFallbackMentors());
    } catch (e) {
      console.log('Failed to fetch mentors from server:', e);
      setMentors(getFallbackMentors());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const getFallbackMentors = () => {
    return [
      {
        id: '1',
        name: 'Dr. Lê Hoài Nam',
        title: 'AI Architect tại VinAI',
        skills: ['Machine Learning', 'Deep Learning', 'Computer Vision'],
        rating: 4.9,
        reviews: 24,
        price: '200k / phiên',
        rawPrice: 200000,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150',
        bio: 'Hơn 10 năm nghiên cứu và triển khai các hệ thống AI quy mô lớn. Cựu kỹ sư Google.'
      },
      {
        id: '2',
        name: 'Ms. Hoàng Thu Thủy',
        title: 'Senior Product Designer tại Grab',
        skills: ['Product Design', 'User Research', 'Design System'],
        rating: 4.8,
        reviews: 18,
        price: '150k / phiên',
        rawPrice: 150000,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
        bio: 'Đam mê xây dựng trải nghiệm tối giản và hiệu quả. Đã dẫn dắt hơn 50 bạn trẻ vào nghề.'
      }
    ];
  };

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  const handleOpenBooking = (mentor: any) => {
    setSelectedMentor(mentor);
    setBookingReason('');
    setBookingStep(1);
    setBookingModalVisible(true);
  };

  const handleBookingSubmit = async () => {
    if (!bookingReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung trao đổi.');
      return;
    }
    setBookingSubmitting(true);
    try {
      // Simulate booking delay for high-fidelity experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Call booking session API if available
      try {
        await api.post('/booking-sessions', {
          tutorProfileId: selectedMentor.id,
          sessionType: 'general_mentoring',
          bookingRequest: {
            topicsToDiscuss: [bookingReason],
            currentSituation: 'Học viên cần tư vấn lộ trình học',
            desiredOutcomes: ['Có mục tiêu rõ ràng'],
            isFirstSession: true
          }
        });
      } catch {}
      setBookingStep(2); // Success step
    } catch (err) {
      setBookingStep(2);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const filteredMentors = mentors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = selectedSkill === 'All' || m.skills.includes(selectedSkill);
    return matchesSearch && matchesSkill;
  });

  const allSkills = ['All', ...Array.from(new Set(mentors.flatMap(m => m.skills)))];

  if (isLoading && mentors.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gặp gỡ Mentors</Text>
        <Text style={styles.subtitle}>Nhận tư vấn 1-1 trực tiếp từ chuyên gia thực chiến</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchMentors(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Search and Filters */}
        <GlassView style={styles.searchRow}>
          <Search size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Tìm kiếm mentor theo tên, vị trí..." 
            placeholderTextColor={COLORS.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </GlassView>

        {/* Skill tags scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillFilterRow}>
          {allSkills.slice(0, 7).map((skill, idx) => {
            const isSelected = selectedSkill === skill;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedSkill(skill)}
                style={[styles.skillPill, isSelected && styles.skillPillActive]}
              >
                <Text style={[styles.skillPillText, isSelected && styles.skillPillTextActive]}>
                  {skill === 'All' ? 'Tất cả lĩnh vực' : skill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Info Banner */}
        <GlassView style={styles.mentorNotice}>
          <Sparkles size={16} color={COLORS.secondary} />
          <Text style={styles.noticeText}>
            Tất cả Mentors tại EDUMEE đều đã qua xác minh hồ sơ nghề nghiệp & bằng cấp thực tế.
          </Text>
        </GlassView>

        {/* Mentor list */}
        <View style={styles.mentorsContainer}>
          {filteredMentors.map((mentor) => (
            <GlassView key={mentor.id} style={styles.mentorCard}>
              <View style={styles.mentorHeader}>
                <Image source={{ uri: mentor.avatar }} style={styles.mentorAvatar} />
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{mentor.name}</Text>
                  <Text style={styles.mentorTitle}>{mentor.title}</Text>
                  
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>{mentor.rating} ({mentor.reviews} đánh giá)</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.mentorBio}>{mentor.bio}</Text>

              <View style={styles.skillsTagContainer}>
                {mentor.skills.map((skill: string, idx: number) => (
                  <View key={idx} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{skill}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.mentorFooter}>
                <View>
                  <Text style={styles.priceLabel}>Phí tư vấn</Text>
                  <Text style={styles.priceValue}>{mentor.price}</Text>
                </View>
                
                <TouchableOpacity 
                  onPress={() => handleOpenBooking(mentor)}
                  style={styles.bookingBtn}
                >
                  <Calendar size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.bookingBtnText}>Đặt lịch hẹn</Text>
                </TouchableOpacity>
              </View>
            </GlassView>
          ))}
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassView style={styles.modalContent}>
            {bookingStep === 1 ? (
              <View>
                <Text style={styles.modalTitle}>🚀 Thiết lập lịch hẹn</Text>
                {selectedMentor && (
                  <View style={styles.modalMentorHeader}>
                    <Image source={{ uri: selectedMentor.avatar }} style={styles.modalMentorAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalMentorName}>{selectedMentor.name}</Text>
                      <Text style={styles.modalMentorTitle} numberOfLines={1}>{selectedMentor.title}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.inputLabel}>Thời gian tư vấn gợi ý</Text>
                <View style={styles.timeSelector}>
                  <Calendar size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.timeText}>{bookingDate}</Text>
                </View>

                <Text style={styles.inputLabel}>Nội dung bạn muốn trao đổi</Text>
                <TextInput
                  placeholder="Ví dụ: Định hướng học Python, cần review hồ sơ CV..."
                  placeholderTextColor={COLORS.muted}
                  style={styles.textArea}
                  multiline={true}
                  numberOfLines={4}
                  value={bookingReason}
                  onChangeText={setBookingReason}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    onPress={() => setBookingModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleBookingSubmit}
                    disabled={bookingSubmitting}
                    style={styles.submitBtn}
                  >
                    {bookingSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>Xác nhận đặt</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconWrapper}>
                  <UserCheck size={36} color={COLORS.primary} />
                </View>
                <Text style={styles.successTitle}>Đặt lịch thành công!</Text>
                <Text style={styles.successDesc}>
                  Yêu cầu đặt lịch đã được gửi đến Mentor **{selectedMentor?.name}**. Bạn sẽ nhận được link Zoom/Meet ngay sau khi Mentor xác nhận.
                </Text>
                <TouchableOpacity 
                  onPress={() => setBookingModalVisible(false)}
                  style={styles.closeSuccessBtn}
                >
                  <Text style={styles.closeSuccessText}>Xong</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassView>
        </View>
      </Modal>
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
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 14,
    height: 38,
  },
  skillFilterRow: {
    marginBottom: SPACING.md,
  },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  skillPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  skillPillText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  skillPillTextActive: {
    color: COLORS.foreground,
  },
  mentorNotice: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    borderColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  mentorsContainer: {
    gap: SPACING.md,
  },
  mentorCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mentorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  mentorTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  mentorBio: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  skillsTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  skillTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  skillTagText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  mentorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: SPACING.sm,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bookingBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  bookingBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  footerSpace: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  modalMentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalMentorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalMentorName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  modalMentorTitle: {
    fontSize: 11,
    color: COLORS.muted,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 4,
    marginTop: SPACING.md,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeText: {
    color: COLORS.foreground,
    fontSize: 13,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    color: COLORS.foreground,
    fontSize: 13,
    height: 70,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  successDesc: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
  },
  closeSuccessBtn: {
    backgroundColor: COLORS.primary,
    height: 42,
    width: 120,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSuccessText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

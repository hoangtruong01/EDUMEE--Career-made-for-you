import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput,
  Modal
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { Heart, MessageSquare, Star, Calendar, MessageCircle, ArrowRight, UserCheck, Send, Sparkles } from 'lucide-react-native';

const MOCK_POSTS = [
  {
    id: '1',
    author: 'Nguyễn Minh Anh',
    title: 'Làm thế nào để bắt đầu với AI/Machine Learning?',
    content: 'Mình đang là sinh viên năm 2 ngành CNTT. Muốn theo đuổi hướng AI thì nên bắt đầu học toán rời rạc, xác suất thống kê hay nhảy thẳng vào Python/PyTorch luôn ạ?',
    category: 'Định hướng',
    hashtags: ['#ai', '#learning', '#roadmap'],
    likes: 24,
    comments: 8,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
    time: '2 giờ trước'
  },
  {
    id: '2',
    author: 'Trần Hoàng Nam',
    title: 'Chia sẻ kinh nghiệm phỏng vấn UI/UX tại Edumee',
    content: 'Một buổi phỏng vấn cực kỳ open và thú vị. Trọng tâm là portfolio và cách bạn giải thích tư duy giải quyết vấn đề của sản phẩm thực tế...',
    category: 'Kinh nghiệm',
    hashtags: ['#uiux', '#interview', '#designer'],
    likes: 42,
    comments: 15,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
    time: '5 giờ trước'
  }
];

const MOCK_MENTORS = [
  {
    id: '1',
    name: 'Dr. Lê Hoài Nam',
    title: 'AI Architect tại VinAI',
    skills: ['Machine Learning', 'Deep Learning', 'Computer Vision'],
    rating: 4.9,
    reviews: 24,
    price: '200k / phiên',
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
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
    bio: 'Đam mê xây dựng trải nghiệm tối giản và hiệu quả. Đã dẫn dắt hơn 50 bạn trẻ vào nghề.'
  }
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'feed' | 'mentors'>('feed');
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingReason, setBookingReason] = useState('');
  const [bookingDate, setBookingDate] = useState('Ngày mai, 14:00 - 15:00');

  const toggleLike = (postId: string) => {
    if (likedPosts.includes(postId)) {
      setLikedPosts(likedPosts.filter(id => id !== postId));
    } else {
      setLikedPosts([...likedPosts, postId]);
    }
  };

  const handleOpenBooking = (mentor: any) => {
    setSelectedMentor(mentor);
    setBookingStep(1);
    setBookingModalVisible(true);
  };

  const handleBookingSubmit = () => {
    setBookingStep(2); // Success step
  };

  return (
    <View style={styles.container}>
      {/* Header with Custom Tabs */}
      <View style={styles.header}>
        <Text style={styles.title}>Cộng đồng</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('feed')}
            style={[styles.tabBtn, activeTab === 'feed' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Bảng tin</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('mentors')}
            style={[styles.tabBtn, activeTab === 'mentors' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === 'mentors' && styles.tabTextActive]}>Mentors</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'feed' ? (
          /* Bảng tin Feed */
          <View style={styles.feedContainer}>
            {MOCK_POSTS.map((post) => {
              const isLiked = likedPosts.includes(post.id);
              return (
                <GlassView key={post.id} style={styles.postCard}>
                  <View style={styles.postAuthor}>
                    <Image source={{ uri: post.avatar }} style={styles.authorAvatar} />
                    <View style={styles.authorInfo}>
                      <Text style={styles.authorName}>{post.author}</Text>
                      <Text style={styles.postTime}>{post.time} • <Text style={styles.categoryText}>{post.category}</Text></Text>
                    </View>
                  </View>

                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postContent}>{post.content}</Text>

                  <View style={styles.hashtagsContainer}>
                    {post.hashtags.map((tag, idx) => (
                      <Text key={idx} style={styles.hashtag}>{tag}</Text>
                    ))}
                  </View>

                  <View style={styles.postActions}>
                    <TouchableOpacity onPress={() => toggleLike(post.id)} style={styles.actionBtn}>
                      <Heart size={18} color={isLiked ? '#EF4444' : COLORS.muted} fill={isLiked ? '#EF4444' : 'transparent'} />
                      <Text style={[styles.actionText, isLiked && { color: '#EF4444' }]}>
                        {post.likes + (isLiked ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn}>
                      <MessageSquare size={18} color={COLORS.muted} />
                      <Text style={styles.actionText}>{post.comments}</Text>
                    </TouchableOpacity>
                  </View>
                </GlassView>
              );
            })}
          </View>
        ) : (
          /* Danh sách Mentors */
          <View style={styles.mentorsContainer}>
            <GlassView style={styles.mentorNotice}>
              <Sparkles size={16} color={COLORS.primary} />
              <Text style={styles.noticeText}>
                Tất cả Mentors của EDUMEE đều đã qua thẩm định chuyên môn bởi chuyên gia tuyển dụng.
              </Text>
            </GlassView>

            {MOCK_MENTORS.map((mentor) => (
              <GlassView key={mentor.id} style={styles.mentorCard}>
                <View style={styles.mentorHeader}>
                  <Image source={{ uri: mentor.avatar }} style={styles.mentorAvatar} />
                  <View style={styles.mentorInfo}>
                    <Text style={styles.mentorName}>{mentor.name}</Text>
                    <Text style={styles.mentorTitle}>{mentor.title}</Text>
                    
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>{mentor.rating} ({mentor.reviews} reviews)</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.mentorBio}>{mentor.bio}</Text>

                <View style={styles.skillsTagContainer}>
                  {mentor.skills.map((skill, idx) => (
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
                    <Text style={styles.bookingBtnText}>Đặt lịch</Text>
                  </TouchableOpacity>
                </View>
              </GlassView>
            ))}
          </View>
        )}

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
                <Text style={styles.modalTitle}>Đặt lịch với Mentor</Text>
                {selectedMentor && (
                  <View style={styles.modalMentorHeader}>
                    <Image source={{ uri: selectedMentor.avatar }} style={styles.modalMentorAvatar} />
                    <View>
                      <Text style={styles.modalMentorName}>{selectedMentor.name}</Text>
                      <Text style={styles.modalMentorTitle}>{selectedMentor.title}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.inputLabel}>Chọn thời gian tư vấn</Text>
                <View style={styles.timeSelector}>
                  <Calendar size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.timeText}>{bookingDate}</Text>
                </View>

                <Text style={styles.inputLabel}>Nội dung bạn muốn trao đổi</Text>
                <TextInput
                  placeholder="Ví dụ: Lộ trình học AI, sửa CV, chuẩn bị phỏng vấn..."
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
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitText}>Đặt lịch & Thanh toán</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconWrapper}>
                  <UserCheck size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.successTitle}>Đặt lịch thành công!</Text>
                <Text style={styles.successDesc}>
                  Yêu cầu đặt lịch đã được gửi đến Mentor **{selectedMentor?.name}**. Bạn sẽ nhận được thông báo khi Mentor đồng ý xác nhận.
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
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  feedContainer: {
    gap: SPACING.md,
  },
  postCard: {
    padding: SPACING.md,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  postTime: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  categoryText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  postContent: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  hashtag: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  postActions: {
    flexDirection: 'row',
    gap: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  mentorsContainer: {
    gap: SPACING.md,
  },
  mentorNotice: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  mentorCard: {
    padding: SPACING.md,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mentorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  mentorTitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  mentorBio: {
    fontSize: 13,
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  skillTagText: {
    fontSize: 11,
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
    fontSize: 11,
    color: COLORS.muted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  bookingBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  bookingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  footerSpace: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  modalMentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  modalMentorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalMentorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  modalMentorTitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.foreground,
    marginBottom: 6,
    marginTop: SPACING.md,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeText: {
    color: COLORS.foreground,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.md,
    color: COLORS.foreground,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.muted,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  successDesc: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  closeSuccessBtn: {
    backgroundColor: COLORS.primary,
    height: 46,
    width: 140,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSuccessText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 14,
  },
});

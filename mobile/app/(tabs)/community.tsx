import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput,
  Modal,
  Platform,
  Alert
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { Heart, MessageSquare, Send, Sparkles, Plus, Image as ImageIcon, X } from 'lucide-react-native';

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

export default function CommunityScreen() {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [newPostModalVisible, setNewPostModalVisible] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('Định hướng');

  const toggleLike = (postId: string) => {
    if (likedPosts.includes(postId)) {
      setLikedPosts(likedPosts.filter(id => id !== postId));
    } else {
      setLikedPosts([...likedPosts, postId]);
    }
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    const newPost = {
      id: String(posts.length + 1),
      author: 'Học viên EDUMEE',
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory,
      hashtags: ['#edumee', '#newbie'],
      likes: 0,
      comments: 0,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
      time: 'Vừa xong'
    };

    setPosts([newPost, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostModalVisible(false);
    Alert.alert('Thành công', 'Bài viết của bạn đã được đăng lên bảng tin!');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flexRowBetween}>
          <View>
            <Text style={styles.title}>Cộng đồng</Text>
            <Text style={styles.subtitle}>Kết nối và chia sẻ kinh nghiệm cùng học viên khác</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setNewPostModalVisible(true)}
            style={styles.addPostBtn}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Share Banner */}
        <GlassView style={styles.shareBanner}>
          <Sparkles size={16} color={COLORS.secondary} />
          <Text style={styles.shareText}>
            Bạn vừa học thêm kỹ năng mới? Hãy chia sẻ cùng mọi người ngay nhé!
          </Text>
        </GlassView>

        {/* Bảng tin Feed */}
        <View style={styles.feedContainer}>
          {posts.map((post) => {
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

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* New Post Modal */}
      <Modal
        visible={newPostModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewPostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassView style={styles.modalContent}>
            <View style={styles.flexRowBetween}>
              <Text style={styles.modalTitle}>📝 Đăng bài thảo luận</Text>
              <TouchableOpacity onPress={() => setNewPostModalVisible(false)}>
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tiêu đề bài đăng</Text>
            <TextInput
              placeholder="Nhập tiêu đề thu hút sự chú ý..."
              placeholderTextColor={COLORS.muted}
              style={styles.textInput}
              value={newPostTitle}
              onChangeText={setNewPostTitle}
            />

            <Text style={styles.inputLabel}>Nội dung thảo luận</Text>
            <TextInput
              placeholder="Chia sẻ câu hỏi hoặc kiến thức của bạn tại đây..."
              placeholderTextColor={COLORS.muted}
              style={styles.textArea}
              multiline={true}
              numberOfLines={6}
              value={newPostContent}
              onChangeText={setNewPostContent}
            />

            <Text style={styles.inputLabel}>Chuyên mục</Text>
            <View style={styles.categorySelectRow}>
              {['Định hướng', 'Kinh nghiệm', 'Học tập'].map((cat) => {
                const isSelected = newPostCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewPostCategory(cat)}
                    style={[styles.catPill, isSelected && styles.catPillActive]}
                  >
                    <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={handleCreatePost}
                style={styles.submitBtn}
              >
                <Send size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitText}>Đăng bài</Text>
              </TouchableOpacity>
            </View>
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
  addPostBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  shareBanner: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    borderColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  shareText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  feedContainer: {
    gap: SPACING.md,
  },
  postCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  postTime: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  categoryText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: 4,
  },
  postContent: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
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
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  postActions: {
    flexDirection: 'row',
    gap: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.muted,
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
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 6,
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: SPACING.md,
    height: 44,
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
    height: 100,
    textAlignVertical: 'top',
  },
  categorySelectRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  catPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPillText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  catPillTextActive: {
    color: '#fff',
  },
  modalActions: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  submitBtn: {
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

import React, { useState, useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { Heart, MessageSquare, Send, Sparkles, Plus, Image as ImageIcon, X } from 'lucide-react-native';
import { api } from '../../src/services/api';

export default function CommunityScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // New Post form states
  const [newPostModalVisible, setNewPostModalVisible] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('Định hướng');

  // Comments states
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    fetchPosts();
    fetchProfile();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/community-posts?limit=100');
      const postsData = res.data?.data || res.data || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (e) {
      console.error('Fetch community posts error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setUserData(res.data?.data || res.data);
    } catch (e) {
      console.error('Fetch profile in community error:', e);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    if (!userData) return;
    const currentUserId = userData.id || userData._id;
    try {
      // Toggle locally first (optimistic update)
      setPosts(prev => prev.map(p => {
        const id = p.id || p._id;
        if (id === postId) {
          const likedUserIds = p.likedUserIds || [];
          const isLiked = likedUserIds.includes(currentUserId);
          return {
            ...p,
            likeCount: isLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
            likedUserIds: isLiked 
              ? likedUserIds.filter((uid: string) => uid !== currentUserId) 
              : [...likedUserIds, currentUserId]
          };
        }
        return p;
      }));

      // Call API
      await api.post(`/community-posts/${postId}/like`);
    } catch (e) {
      console.error('Toggle like error:', e);
      // Revert if API fails
      fetchPosts();
    }
  };

  const handleOpenComments = async (post: any) => {
    const postId = post.id || post._id;
    setSelectedPost(post);
    setCommentsModalVisible(true);
    setIsLoadingComments(true);
    setComments([]);
    try {
      const res = await api.get(`/community-posts/${postId}/comments`);
      setComments(res.data || []);
    } catch (e) {
      console.error('Fetch comments error:', e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedPost) return;
    const postId = selectedPost.id || selectedPost._id;
    try {
      const payload = {
        content: newCommentText.trim(),
        authorName: userData?.fullName || userData?.name || 'Học viên EDUMEE',
        authorTitle: userData?.title || 'Thành viên',
        authorAvatar: userData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
      };
      
      const res = await api.post(`/community-posts/${postId}/comments`, payload);
      
      // Update local comment list
      const updatedPost = res.data?.data || res.data;
      if (updatedPost?.comments) {
        setComments(updatedPost.comments);
      } else {
        // Fallback refresh comments
        const commentsRes = await api.get(`/community-posts/${postId}/comments`);
        setComments(commentsRes.data || []);
      }
      
      setNewCommentText('');
      
      // Increment comment count locally on the main post
      setPosts(prev => prev.map(p => {
        const id = p.id || p._id;
        if (id === postId) {
          return { ...p, commentCount: (p.commentCount || 0) + 1 };
        }
        return p;
      }));
    } catch (e) {
      console.error('Add comment error:', e);
      Alert.alert('Lỗi', 'Không thể đăng bình luận lúc này.');
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    try {
      const payload = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        category: newPostCategory,
        authorName: userData?.fullName || userData?.name || 'Học viên EDUMEE',
        authorTitle: userData?.title || 'Thành viên',
        authorAvatar: userData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
        hashtags: ['#edumee', '#sharing']
      };

      await api.post('/community-posts', payload);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostModalVisible(false);
      Alert.alert('Thành công', 'Bài viết của bạn đã được đăng lên bảng tin!');
      
      // Reload posts
      fetchPosts();
    } catch (e: any) {
      console.error('Create post error:', e);
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể đăng bài. Vui lòng thử lại sau.');
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Vừa xong';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} giờ trước`;
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
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

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bảng tin từ EDUMEE...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Quick Share Banner */}
          <GlassView style={styles.shareBanner}>
            <Sparkles size={16} color={COLORS.secondary} />
            <Text style={styles.shareText}>
              Bạn vừa học thêm kỹ năng mới? Hãy chia sẻ cùng mọi người ngay nhé!
            </Text>
          </GlassView>

          {/* Bảng tin Feed */}
          <View style={styles.feedContainer}>
            {posts.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Sparkles size={36} color={COLORS.muted} style={{ marginBottom: SPACING.md }} />
                <Text style={styles.emptyFeedText}>Chưa có bài đăng nào trên cộng đồng.</Text>
                <TouchableOpacity style={styles.emptyFeedBtn} onPress={() => setNewPostModalVisible(true)}>
                  <Text style={styles.emptyFeedBtnText}>Đăng bài viết đầu tiên</Text>
                </TouchableOpacity>
              </View>
            ) : (
              posts.map((post) => {
                const postId = post.id || post._id;
                const isLiked = post.likedUserIds?.includes(userData?.id || userData?._id);
                return (
                  <GlassView key={postId} style={styles.postCard}>
                    <View style={styles.postAuthor}>
                      <Image 
                        source={{ uri: post.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' }} 
                        style={styles.authorAvatar} 
                      />
                      <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>{post.authorName || 'Học viên EDUMEE'}</Text>
                        <Text style={styles.postTime}>
                          {formatTime(post.createdAt)} • <Text style={styles.categoryText}>{post.category}</Text>
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postContent}>{post.content}</Text>

                    {post.hashtags && post.hashtags.length > 0 && (
                      <View style={styles.hashtagsContainer}>
                        {post.hashtags.map((tag: string, idx: number) => (
                          <Text key={idx} style={styles.hashtag}>{tag.startsWith('#') ? tag : `#${tag}`}</Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.postActions}>
                      <TouchableOpacity onPress={() => handleLike(postId)} style={styles.actionBtn}>
                        <Heart 
                          size={18} 
                          color={isLiked ? '#EF4444' : COLORS.muted} 
                          fill={isLiked ? '#EF4444' : 'transparent'} 
                        />
                        <Text style={[styles.actionText, isLiked && { color: '#EF4444' }]}>
                          {post.likeCount || 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleOpenComments(post)} style={styles.actionBtn}>
                        <MessageSquare size={18} color={COLORS.muted} />
                        <Text style={styles.actionText}>{post.commentCount || 0}</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassView>
                );
              })
            )}
          </View>

          <View style={styles.footerSpace} />
        </ScrollView>
      )}

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

      {/* Premium Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassView style={styles.commentsModalContent}>
            <View style={[styles.flexRowBetween, { marginBottom: SPACING.md }]}>
              <View>
                <Text style={styles.modalTitle}>💬 Bình luận ({selectedPost?.commentCount || 0})</Text>
                <Text style={[styles.subtitle, { maxWidth: 220 }]} numberOfLines={1}>
                  Bài đăng: {selectedPost?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {isLoadingComments ? (
              <View style={styles.commentsLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.commentsLoadingText}>Đang tải bình luận...</Text>
              </View>
            ) : (
              <ScrollView style={styles.commentsScrollView} showsVerticalScrollIndicator={false}>
                {comments.length === 0 ? (
                  <View style={styles.emptyCommentsContainer}>
                    <MessageSquare size={32} color={COLORS.muted} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyCommentsText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
                  </View>
                ) : (
                  comments.map((comment, index) => (
                    <View key={comment.id || comment._id || index} style={styles.commentItem}>
                      <Image 
                        source={{ uri: comment.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' }} 
                        style={styles.commentAvatar} 
                      />
                      <View style={styles.commentDetails}>
                        <View style={styles.flexRowBetween}>
                          <Text style={styles.commentAuthorName}>{comment.authorName}</Text>
                          <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentAuthorTitle}>{comment.authorTitle || 'Thành viên'}</Text>
                        <Text style={styles.commentTextContent}>{comment.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Comment Input Bar */}
            <View style={styles.commentInputRow}>
              <TextInput
                placeholder="Viết phản hồi của bạn..."
                placeholderTextColor={COLORS.muted}
                value={newCommentText}
                onChangeText={setNewCommentText}
                style={styles.commentTextInput}
              />
              <TouchableOpacity 
                style={[
                  styles.commentSendBtn, 
                  !newCommentText.trim() && { opacity: 0.5 }
                ]} 
                onPress={handleAddComment}
                disabled={!newCommentText.trim()}
              >
                <Send size={16} color="#fff" />
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
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyFeedText: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  emptyFeedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  emptyFeedBtnText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 13,
  },
  commentsModalContent: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    height: '75%',
    justifyContent: 'space-between',
  },
  commentsLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsLoadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
  },
  commentsScrollView: {
    flex: 1,
    marginVertical: SPACING.md,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  commentDetails: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  commentAuthorName: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  commentTime: {
    color: COLORS.muted,
    fontSize: 10,
  },
  commentAuthorTitle: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentTextContent: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 17,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: SPACING.md,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: SPACING.md,
    height: 40,
    color: COLORS.foreground,
    fontSize: 13,
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

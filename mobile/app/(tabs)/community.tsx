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
  RefreshControl,
  Switch
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { 
  Heart, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Plus, 
  X, 
  Trash2, 
  AlertTriangle, 
  Search,
  EyeOff,
  Eye,
  MoreVertical
} from 'lucide-react-native';
import { api } from '../../src/services/api';

const CATEGORIES = ['Tất cả', 'Review ngành', 'Hỏi đáp', 'Chia sẻ kinh nghiệm', 'Tài nguyên', 'Tuyển dụng'];
const POST_CATEGORIES = ['Review ngành', 'Hỏi đáp', 'Chia sẻ kinh nghiệm', 'Tài nguyên', 'Tuyển dụng'];

const CATEGORY_COLORS: Record<string, string> = {
  'Review ngành': '#3B82F6', // Blue
  'Hỏi đáp': '#F59E0B', // Warning Yellow
  'Chia sẻ kinh nghiệm': '#10B981', // Success Green
  'Tài nguyên': '#8B5CF6', // Purple
  'Tuyển dụng': '#EC4899', // Pink
};

const unpackResponseData = (res: any): any => {
  if (!res || !res.data) return null;
  
  // If wrapped by TransformInterceptor: { success: true, data: ..., timestamp: ... }
  if (res.data.hasOwnProperty('success') && res.data.hasOwnProperty('data')) {
    const innerData = res.data.data;
    // If double wrapped (e.g. paginated result: { data: [...], total: ... })
    if (innerData && typeof innerData === 'object' && innerData.hasOwnProperty('data')) {
      return innerData.data;
    }
    return innerData;
  }
  
  // If not wrapped, or direct Axios response payload
  if (res.data.hasOwnProperty('data')) {
    return res.data.data;
  }
  return res.data;
};

export default function CommunityScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // New Post form states
  const [newPostModalVisible, setNewPostModalVisible] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('Review ngành');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Comments states
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommentAnonymous, setIsCommentAnonymous] = useState(false);

  // Report Modal states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'comment' } | null>(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const reportReasons = [
    'Spam',
    'Nội dung nhạy cảm',
    'Ngôn từ thù ghét',
    'Lừa đảo/Độc hại',
    'Thông tin sai lệch',
    'Khác',
  ];

  // Fetch posts when category or search changes (with debounced search check)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPosts(activeCategory, searchQuery);
    }, 350);
    return () => clearTimeout(delayDebounce);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchPosts = async (cat = activeCategory, q = searchQuery) => {
    try {
      const categoryParam = cat && cat !== 'Tất cả' ? `&category=${encodeURIComponent(cat)}` : '';
      const searchParam = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
      const res = await api.get(`/community-posts?limit=100${categoryParam}${searchParam}`);
      const postsData = unpackResponseData(res);
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
      const res = await api.get('/users/me');
      const profileData = unpackResponseData(res);
      setUserData(profileData);
    } catch (e) {
      console.error('Fetch profile in community error:', e);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts(activeCategory, searchQuery);
    fetchProfile();
  };

  const handleLike = async (postId: string) => {
    if (!userData) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để tương tác bài viết.');
      return;
    }
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
      fetchPosts(activeCategory, searchQuery);
    }
  };

  const handleOpenComments = async (post: any) => {
    const postId = post.id || post._id;
    setSelectedPost(post);
    setCommentsModalVisible(true);
    setIsLoadingComments(true);
    setComments([]);
    setIsCommentAnonymous(false);
    try {
      const res = await api.get(`/community-posts/${postId}/comments`);
      const commentsList = unpackResponseData(res);
      setComments(Array.isArray(commentsList) ? commentsList : []);
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
      const displayName = isCommentAnonymous ? 'Ẩn danh' : (userData?.fullName || userData?.name || 'Học viên EDUMEE');
      const authorTitle = isCommentAnonymous ? undefined : (userData?.title || 'Thành viên');
      const authorAvatar = isCommentAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' : (userData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150');

      const payload = {
        content: newCommentText.trim(),
        authorName: displayName,
        authorTitle,
        authorAvatar,
      };
      
      const res = await api.post(`/community-posts/${postId}/comments`, payload);
      
      // Update local comment list
      const updatedPost = unpackResponseData(res);
      if (updatedPost?.comments) {
        setComments(updatedPost.comments);
      } else {
        const commentsRes = await api.get(`/community-posts/${postId}/comments`);
        const commentsList = unpackResponseData(commentsRes);
        setComments(Array.isArray(commentsList) ? commentsList : []);
      }
      
      setNewCommentText('');
      setIsCommentAnonymous(false);
      
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
      const displayName = isAnonymous ? 'Ẩn danh' : (userData?.fullName || userData?.name || 'Học viên EDUMEE');
      const authorTitle = isAnonymous ? undefined : (userData?.title || 'Thành viên');
      const authorAvatar = isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' : (userData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150');

      const payload = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        category: newPostCategory,
        authorName: displayName,
        authorTitle,
        authorAvatar,
        hashtags: ['#edumee', '#sharing']
      };

      await api.post('/community-posts', payload);
      setNewPostTitle('');
      setNewPostContent('');
      setIsAnonymous(false);
      setNewPostModalVisible(false);
      Alert.alert('Thành công', 'Bài viết của bạn đã được đăng lên bảng tin!');
      
      // Reload posts
      fetchPosts(activeCategory, searchQuery);
    } catch (e: any) {
      console.error('Create post error:', e);
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể đăng bài. Vui lòng thử lại sau.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc chắn muốn xóa bài viết này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/community-posts/${postId}`);
              setPosts(prev => prev.filter(p => (p.id || p._id) !== postId));
              Alert.alert('Thành công', 'Bài viết đã được xóa.');
            } catch (e) {
              console.error('Delete post error:', e);
              Alert.alert('Lỗi', 'Không thể xóa bài viết này.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Xóa bình luận',
      'Bạn có chắc chắn muốn xóa bình luận này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const postId = selectedPost.id || selectedPost._id;
              await api.delete(`/community-posts/${postId}/comments/${commentId}`);
              
              // Update local comments list
              setComments(prev => prev.filter(c => (c.id || c._id) !== commentId));
              
              // Decrement comment count on main feed
              setPosts(prev => prev.map(p => {
                const id = p.id || p._id;
                if (id === postId) {
                  return { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) };
                }
                return p;
              }));
            } catch (e) {
              console.error('Delete comment error:', e);
              Alert.alert('Lỗi', 'Không thể xóa bình luận này.');
            }
          }
        }
      ]
    );
  };

  const handleOpenReport = (targetId: string, type: 'post' | 'comment') => {
    setReportTarget({ id: targetId, type });
    setReportReason('Spam');
    setReportDetails('');
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    setIsSubmittingReport(true);
    try {
      const postId = reportTarget.type === 'comment' ? (selectedPost?.id || selectedPost?._id) : reportTarget.id;
      const payload = {
        targetId: reportTarget.id,
        targetType: reportTarget.type,
        reason: reportReason,
        details: reportDetails.trim(),
        postId
      };
      
      await api.post('/community/reports', payload);
      setReportModalVisible(false);
      Alert.alert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ sớm xem xét nội dung này.');
    } catch (e) {
      console.error('Report content error:', e);
      Alert.alert('Lỗi', 'Không thể gửi báo cáo lúc này.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const showPostOptions = (post: any) => {
    const postId = post.id || post._id;
    const currentUserId = userData?.id || userData?._id;
    const isOwner = post.authorId && String(post.authorId) === String(currentUserId);
    const isAdmin = userData?.role === 'admin';

    const options = ['Báo cáo vi phạm'];
    if (isOwner || isAdmin) {
      options.push('Xóa bài viết');
    }
    options.push('Hủy');

    Alert.alert(
      'Tùy chọn bài viết',
      'Chọn hành động của bạn:',
      options.map(opt => ({
        text: opt,
        style: opt === 'Xóa bài viết' ? 'destructive' : (opt === 'Hủy' ? 'cancel' : 'default'),
        onPress: () => {
          if (opt === 'Xóa bài viết') {
            handleDeletePost(postId);
          } else if (opt === 'Báo cáo vi phạm') {
            handleOpenReport(postId, 'post');
          }
        }
      }))
    );
  };

  const showCommentOptions = (comment: any) => {
    const commentId = comment.id || comment._id;
    const currentUserId = userData?.id || userData?._id;
    const isCommentOwner = comment.authorId && String(comment.authorId) === String(currentUserId);
    const isPostOwner = selectedPost?.authorId && String(selectedPost.authorId) === String(currentUserId);
    const isAdmin = userData?.role === 'admin';

    const options = ['Báo cáo bình luận'];
    if (isCommentOwner || isPostOwner || isAdmin) {
      options.push('Xóa bình luận');
    }
    options.push('Hủy');

    Alert.alert(
      'Tùy chọn bình luận',
      'Chọn hành động của bạn:',
      options.map(opt => ({
        text: opt,
        style: opt === 'Xóa bình luận' ? 'destructive' : (opt === 'Hủy' ? 'cancel' : 'default'),
        onPress: () => {
          if (opt === 'Xóa bình luận') {
            handleDeleteComment(commentId);
          } else if (opt === 'Báo cáo bình luận') {
            handleOpenReport(commentId, 'comment');
          }
        }
      }))
    );
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
            <Text style={styles.subtitle}>Chia sẻ và định hướng cùng học viên EDUMEE</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setNewPostModalVisible(true)}
            style={styles.addPostBtn}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Search Bar & Category Filters */}
      <View style={styles.searchAndFilterContainer}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm kiếm bài viết..."
            placeholderTextColor={COLORS.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Category scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat;
            const customColor = CATEGORY_COLORS[cat] || COLORS.primary;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setIsLoading(true);
                  setActiveCategory(cat);
                }}
                style={[
                  styles.categoryFilterBadge, 
                  isSelected && { backgroundColor: customColor, borderColor: customColor }
                ]}
              >
                <Text style={[styles.categoryFilterText, isSelected && { color: '#fff', fontWeight: '800' }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bảng tin...</Text>
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
              Bạn có thắc mắc về lựa chọn ngành nghề? Đăng bài để nhận giải đáp nhé!
            </Text>
          </GlassView>

          {/* Bảng tin Feed */}
          <View style={styles.feedContainer}>
            {posts.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Sparkles size={36} color={COLORS.muted} style={{ marginBottom: SPACING.md }} />
                <Text style={styles.emptyFeedText}>Không tìm thấy bài viết nào phù hợp.</Text>
                <TouchableOpacity style={styles.emptyFeedBtn} onPress={() => setNewPostModalVisible(true)}>
                  <Text style={styles.emptyFeedBtnText}>Đăng bài viết mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              posts.map((post) => {
                const postId = post.id || post._id;
                const isLiked = post.likedUserIds?.includes(userData?.id || userData?._id);
                const categoryColor = CATEGORY_COLORS[post.category] || COLORS.primary;

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
                          {formatTime(post.createdAt)} • <Text style={{ color: categoryColor, fontWeight: '800' }}>{post.category}</Text>
                        </Text>
                      </View>
                      
                      {/* Action Menu Ellipsis Button */}
                      <TouchableOpacity 
                        onPress={() => showPostOptions(post)} 
                        style={styles.ellipsisBtn}
                      >
                        <MoreVertical size={18} color={COLORS.muted} />
                      </TouchableOpacity>
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
            <View style={[styles.flexRowBetween, { marginBottom: SPACING.md }]}>
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
              placeholder="Chia sẻ câu hỏi hoặc kiến thức của bạn..."
              placeholderTextColor={COLORS.muted}
              style={styles.textArea}
              multiline={true}
              numberOfLines={6}
              value={newPostContent}
              onChangeText={setNewPostContent}
            />

            <Text style={styles.inputLabel}>Chuyên mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categorySelectRow}>
              {POST_CATEGORIES.map((cat) => {
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
            </ScrollView>

            {/* Anonymous Toggle Switch */}
            <View style={styles.anonymousToggleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <EyeOff size={16} color={COLORS.muted} />
                <Text style={styles.anonymousToggleText}>Đăng bài ẩn danh</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: 'rgba(255,255,255,0.08)', true: COLORS.primary }}
                thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
              />
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

      {/* Comments Modal */}
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
                <Text style={styles.modalTitle}>💬 Thảo luận ({selectedPost?.commentCount || 0})</Text>
                <Text style={[styles.subtitle, { maxWidth: 220 }]} numberOfLines={1}>
                  {selectedPost?.title}
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
                    <Text style={styles.emptyCommentsText}>Chưa có bình luận nào. Hãy bắt đầu cuộc thảo luận!</Text>
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
                          
                          {/* Ellipsis menu button for comments */}
                          <TouchableOpacity onPress={() => showCommentOptions(comment)}>
                            <MoreVertical size={14} color={COLORS.muted} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.commentMetaRow}>
                          <Text style={styles.commentAuthorTitle}>{comment.authorTitle || 'Thành viên'}</Text>
                          <Text style={styles.commentTime}> • {formatTime(comment.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentTextContent}>{comment.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Comment Input Bar */}
            <View style={styles.commentInputSection}>
              {/* Anonymous Comment Toggle */}
              <View style={styles.commentAnonymousBar}>
                <Text style={styles.commentAnonymousLabel}>Bình luận ẩn danh</Text>
                <Switch
                  value={isCommentAnonymous}
                  onValueChange={setIsCommentAnonymous}
                  trackColor={{ false: 'rgba(255,255,255,0.08)', true: COLORS.primary }}
                  thumbColor={isCommentAnonymous ? '#fff' : '#f4f3f4'}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>

              <View style={styles.commentInputRow}>
                <TextInput
                  placeholder="Viết câu trả lời của bạn..."
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
            </View>
          </GlassView>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.reportModalOverlay}>
          <GlassView style={styles.reportModalContent}>
            <View style={[styles.flexRowBetween, { marginBottom: SPACING.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={styles.reportTitle}>Báo cáo vi phạm</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reportSub}>Lý do báo cáo:</Text>
            <View style={styles.reasonsGrid}>
              {reportReasons.map(r => {
                const isSelected = reportReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setReportReason(r)}
                    style={[
                      styles.reasonCard,
                      isSelected && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                    ]}
                  >
                    <Text style={[styles.reasonText, isSelected && { color: '#EF4444', fontWeight: '800' }]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.reportSub}>Chi tiết bổ sung (tùy chọn):</Text>
            <TextInput
              placeholder="Cung cấp thêm chi tiết giúp ban quản trị xử lý tốt hơn..."
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={3}
              value={reportDetails}
              onChangeText={setReportDetails}
              style={styles.reportDetailsInput}
            />

            <View style={styles.reportActionsRow}>
              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)}
                style={styles.reportCancelBtn}
              >
                <Text style={styles.reportCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
                style={styles.reportSubmitBtn}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.reportSubmitText}>Gửi báo cáo</Text>
                )}
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
  searchAndFilterContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 13,
  },
  categoryScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  categoryFilterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  categoryFilterText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
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
  ellipsisBtn: {
    padding: 8,
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
    paddingVertical: 4,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
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
  anonymousToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  anonymousToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
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
    height: '80%',
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
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  commentAuthorTitle: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  commentTime: {
    color: COLORS.muted,
    fontSize: 10,
  },
  commentTextContent: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 17,
  },
  commentInputSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: SPACING.sm,
  },
  commentAnonymousBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
    gap: 4,
  },
  commentAnonymousLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
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
  reportModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  reportModalContent: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  reportSub: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.foreground,
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  reasonCard: {
    width: '48%',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.foreground,
    fontWeight: '600',
  },
  reportDetailsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.sm,
    color: COLORS.foreground,
    fontSize: 12,
    height: 60,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
  },
  reportActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  reportCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  reportCancelText: {
    color: COLORS.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  reportSubmitBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  reportSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

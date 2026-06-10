import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Flag, Heart, MessageSquare, Plus, Search, Send, Trash2, X } from 'lucide-react-native';
import { communityService, type CommunityComment, type CommunityPost } from '../../services/community.service';
import { useMentorPortalData } from '../../hooks/useMentorPortalData';
import { RADIUS, SPACING } from '../../theme';
import { formatDateTime, getId, getMentorName, getMentorTitle } from './mentorUtils';
import {
  ActionButton,
  EmptyState,
  FormInput,
  InfoCard,
  LoadingState,
  MENTOR_COLORS as COLORS,
  MessageBanner,
  Pill,
  PortalScreen,
} from './MentorPortalUI';

const categories = ['Tất cả', 'Hỏi đáp', 'Chia sẻ kinh nghiệm', 'Review ngành', 'Tài nguyên', 'Tuyển dụng'];
const postCategories = categories.filter((category) => category !== 'Tất cả');

function getPostId(post: CommunityPost) {
  return post.id || post._id || '';
}

export default function MentorCommunityScreen() {
  const portalQuery = useMentorPortalData();
  const profile = portalQuery.data?.profile ?? null;
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentPost, setCommentPost] = useState<CommunityPost | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'comment'; postId?: string } | null>(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const postsQuery = useQuery({
    queryKey: ['mentorCommunityPosts', activeCategory, debouncedSearch],
    queryFn: () =>
      communityService.listPosts({
        limit: 50,
        category: activeCategory === 'Tất cả' ? undefined : activeCategory,
        q: debouncedSearch.trim() || undefined,
      }),
    enabled: Boolean(profile?.status === 'active'),
  });

  const posts = postsQuery.data?.data || [];
  const authorName = getMentorName(profile);
  const authorTitle = getMentorTitle(profile);
  const authorAvatar = profile?.mentorUser?.avatar;
  const userId = profile?.userId || '';

  const updatePost = (updated: CommunityPost) => {
    postsQuery.refetch();
    if (commentPost && getPostId(commentPost) === getPostId(updated)) setCommentPost(updated);
  };

  const handleLike = async (post: CommunityPost) => {
    const postId = getPostId(post);
    if (!postId) return;
    try {
      await communityService.likePost(postId);
      postsQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật lượt thích.');
    }
  };

  const handleDelete = (post: CommunityPost) => {
    const postId = getPostId(post);
    if (!postId) return;
    Alert.alert('Xóa bài viết', 'Bạn muốn xóa bài viết này?', [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await communityService.deletePost(postId);
            postsQuery.refetch();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể xóa bài viết.');
          }
        },
      },
    ]);
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    try {
      await communityService.report({
        targetId: reportTarget.id,
        targetType: reportTarget.type,
        postId: reportTarget.postId,
        reason: reportReason,
      });
      setReportTarget(null);
      setReportReason('Spam');
      setMessage('Đã gửi báo cáo cho đội ngũ quản trị.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi báo cáo.');
    }
  };

  if (portalQuery.isLoading) return <LoadingState label="Đang tải cộng đồng mentor..." />;

  if (!profile || profile.status !== 'active') {
    return (
      <PortalScreen title="Cộng đồng mentor">
        <EmptyState icon={MessageSquare} title="Portal chưa mở" description="Hồ sơ mentor cần active trước khi đăng bài với vai trò mentor." />
      </PortalScreen>
    );
  }

  return (
    <PortalScreen
      title="Cộng đồng mentor"
      subtitle="Chia sẻ kinh nghiệm, trả lời câu hỏi và xây dựng uy tín mentor trong EDUMEE."
      refreshing={postsQuery.isRefetching}
      onRefresh={() => postsQuery.refetch()}
      rightAction={
        <TouchableOpacity onPress={() => setComposerOpen(true)} style={styles.addButton}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      }
    >
      <InfoCard>
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm bài viết, câu hỏi, hashtag..."
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((category) => (
            <Pill
              key={category}
              label={category}
              active={activeCategory === category}
              onPress={() => setActiveCategory(category)}
            />
          ))}
        </ScrollView>
      </InfoCard>

      {message ? <MessageBanner message={message} tone={message.startsWith('Đã') ? 'success' : 'neutral'} /> : null}

      {postsQuery.isLoading ? (
        <LoadingState label="Đang tải bài viết..." />
      ) : posts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Chưa có bài viết phù hợp" description="Thử đổi bộ lọc hoặc tạo bài mentor đầu tiên." />
      ) : (
        <View style={styles.postList}>
          {posts.map((post) => (
            <PostCard
              key={getPostId(post)}
              post={post}
              userId={userId}
              onLike={() => handleLike(post)}
              onComment={() => setCommentPost(post)}
              onReport={() => setReportTarget({ id: getPostId(post), type: 'post', postId: getPostId(post) })}
              onDelete={() => handleDelete(post)}
            />
          ))}
        </View>
      )}

      <ComposerModal
        visible={composerOpen}
        authorName={authorName}
        authorTitle={authorTitle}
        authorAvatar={authorAvatar}
        onClose={() => setComposerOpen(false)}
        onCreated={() => {
          setComposerOpen(false);
          postsQuery.refetch();
          setMessage('Đã đăng bài lên cộng đồng.');
        }}
      />

      <CommentsModal
        post={commentPost}
        authorName={authorName}
        authorTitle={authorTitle}
        authorAvatar={authorAvatar}
        onClose={() => setCommentPost(null)}
        onPostUpdated={updatePost}
        onReport={(commentId) => setReportTarget({ id: commentId, type: 'comment', postId: commentPost ? getPostId(commentPost) : undefined })}
      />

      <ReportModal
        visible={!!reportTarget}
        reason={reportReason}
        onReasonChange={setReportReason}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />
    </PortalScreen>
  );
}

function PostCard({
  post,
  userId,
  onLike,
  onComment,
  onReport,
  onDelete,
}: {
  post: CommunityPost;
  userId: string;
  onLike: () => void;
  onComment: () => void;
  onReport: () => void;
  onDelete: () => void;
}) {
  const liked = post.likedUserIds?.some((id) => String(id) === String(userId));
  const canDelete = post.authorId && String(post.authorId) === String(userId);
  return (
    <InfoCard>
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(post.authorName || 'E').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.postAuthor}>
          <Text style={styles.authorName}>{post.authorName || 'Thành viên EDUMEE'}</Text>
          <Text style={styles.authorMeta} numberOfLines={1}>
            {post.authorTitle || 'Thành viên'}, {formatDateTime(post.createdAt)}
          </Text>
        </View>
      </View>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{post.category}</Text>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postContent}>{post.content}</Text>
      {post.hashtags?.length ? (
        <View style={styles.tagRow}>
          {post.hashtags.slice(0, 6).map((tag) => (
            <Text key={tag} style={styles.tagText}>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.postActions}>
        <TouchableOpacity onPress={onLike} style={[styles.actionPill, liked && styles.likedPill]}>
          <Heart size={16} color={liked ? '#FB7185' : COLORS.muted} fill={liked ? '#FB7185' : 'transparent'} />
          <Text style={styles.actionText}>{post.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onComment} style={styles.actionPill}>
          <MessageSquare size={16} color={COLORS.muted} />
          <Text style={styles.actionText}>{post.commentCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReport} style={styles.actionPill}>
          <Flag size={16} color={COLORS.muted} />
        </TouchableOpacity>
        {canDelete ? (
          <TouchableOpacity onPress={onDelete} style={styles.actionPill}>
            <Trash2 size={16} color={COLORS.danger} />
          </TouchableOpacity>
        ) : null}
      </View>
    </InfoCard>
  );
}

function ComposerModal({
  visible,
  authorName,
  authorTitle,
  authorAvatar,
  onClose,
  onCreated,
}: {
  visible: boolean;
  authorName: string;
  authorTitle: string;
  authorAvatar?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(postCategories[0]);
  const [tagInput, setTagInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const hashtags = useMemo(
    () =>
      tagInput
        .split(',')
        .map((tag) => tag.trim().replace(/^#+/, ''))
        .filter(Boolean)
        .slice(0, 8)
        .map((tag) => `#${tag}`),
    [tagInput],
  );

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề và nội dung.');
      return;
    }
    setBusy(true);
    try {
      await communityService.createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        hashtags,
        authorName: isAnonymous ? 'Ẩn danh' : authorName,
        authorTitle: isAnonymous ? undefined : authorTitle,
        authorAvatar: isAnonymous ? undefined : authorAvatar,
      });
      setTitle('');
      setContent('');
      setTagInput('');
      setIsAnonymous(false);
      onCreated();
    } catch (error) {
      Alert.alert('Thông báo', error instanceof Error ? error.message : 'Không thể đăng bài.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đăng bài với vai trò mentor</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TouchableOpacity onPress={() => setIsAnonymous((value) => !value)} style={[styles.anonymousToggle, isAnonymous && styles.anonymousActive]}>
              <Text style={[styles.anonymousText, isAnonymous && styles.anonymousTextActive]}>
                {isAnonymous ? 'Đang đăng ẩn danh' : `Hiển thị dưới tên ${authorName}`}
              </Text>
            </TouchableOpacity>
            <FormInput label="Tiêu đề" value={title} onChangeText={setTitle} placeholder="Ví dụ: Cách chuẩn bị portfolio phỏng vấn" />
            <View style={styles.categorySelector}>
              {postCategories.map((item) => (
                <Pill key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
              ))}
            </View>
            <FormInput label="Nội dung" value={content} onChangeText={setContent} multiline placeholder="Viết câu trả lời hoặc chia sẻ kinh nghiệm thực tế..." />
            <FormInput label="Hashtag, cách nhau bằng dấu phẩy" value={tagInput} onChangeText={setTagInput} placeholder="career, cv, interview" />
          </ScrollView>
          <ActionButton label="Đăng bài" onPress={submit} loading={busy} icon={Send} />
        </View>
      </View>
    </Modal>
  );
}

function CommentsModal({
  post,
  authorName,
  authorTitle,
  authorAvatar,
  onClose,
  onPostUpdated,
  onReport,
}: {
  post: CommunityPost | null;
  authorName: string;
  authorTitle: string;
  authorAvatar?: string;
  onClose: () => void;
  onPostUpdated: (post: CommunityPost) => void;
  onReport: (commentId: string) => void;
}) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!post) return;
    const postId = getPostId(post);
    communityService
      .listComments(postId)
      .then(setComments)
      .catch(() => setComments(post.comments || []));
  }, [post]);

  if (!post) return null;

  const postId = getPostId(post);
  const submit = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const updated = await communityService.addComment(postId, {
        content: draft.trim(),
        authorName,
        authorTitle,
        authorAvatar,
      });
      setDraft('');
      setComments(updated.comments || []);
      onPostUpdated(updated);
    } catch (error) {
      Alert.alert('Thông báo', error instanceof Error ? error.message : 'Không thể gửi bình luận.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, styles.commentsSheet]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bình luận</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.commentList}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postContent}>{post.content}</Text>
            {comments.length === 0 ? (
              <Text style={styles.emptyComments}>Chưa có bình luận.</Text>
            ) : (
              comments.map((comment, index) => {
                const commentId = comment.id || comment._id || `${comment.createdAt || 'comment'}-${index}`;
                return (
                  <View key={commentId} style={styles.commentItem}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                      <Text style={styles.authorMeta}>{formatDateTime(comment.createdAt)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onReport(commentId)} style={styles.commentReport}>
                      <Flag size={15} color={COLORS.muted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
          <View style={styles.commentInputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Viết bình luận với vai trò mentor..."
              placeholderTextColor={COLORS.muted}
              style={styles.commentInput}
            />
            <ActionButton label="" onPress={submit} loading={busy} disabled={!draft.trim()} icon={Send} style={styles.sendButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReportModal({
  visible,
  reason,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.reportBackdrop}>
        <View style={styles.reportBox}>
          <Text style={styles.modalTitle}>Báo cáo nội dung</Text>
          <TextInput value={reason} onChangeText={onReasonChange} style={styles.reportInput} placeholder="Lý do" placeholderTextColor={COLORS.muted} />
          <View style={styles.reportActions}>
            <ActionButton label="Đóng" onPress={onClose} variant="ghost" />
            <ActionButton label="Gửi báo cáo" onPress={onSubmit} variant="danger" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryRow: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  postList: {
    gap: SPACING.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  postAuthor: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  authorMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(59,130,246,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  postTitle: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '900',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  postContent: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  tagText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionPill: {
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likedPill: {
    backgroundColor: 'rgba(251,113,133,0.12)',
  },
  actionText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  modalSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  commentsSheet: {
    height: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  anonymousToggle: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
    backgroundColor: 'rgba(59,130,246,0.08)',
    padding: SPACING.md,
  },
  anonymousActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  anonymousText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  anonymousTextActive: {
    color: '#fff',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  commentList: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  emptyComments: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontSize: 13,
  },
  commentItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  commentBubble: {
    flex: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSubtle,
    padding: SPACING.md,
  },
  commentAuthor: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '900',
  },
  commentContent: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  commentReport: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.foreground,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendButton: {
    width: 44,
    paddingHorizontal: 0,
  },
  reportBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,6,23,0.72)',
    padding: SPACING.lg,
  },
  reportBox: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  reportInput: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.foreground,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '800',
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
});

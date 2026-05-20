import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl, TextInput, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { 
  Target, Sparkles, ChevronRight, RotateCcw, Brain, Award, Info,
  Plus, Pencil, Trash2, Save, X, Search
} from 'lucide-react-native';
import { api } from '../../src/services/api';

const RIASEC_DECORATIONS: Record<string, {label:string;color:string;emoji:string;desc:string}> = {
  realistic: { label: 'Thực tế', color: '#EF4444', emoji: '🛠️', desc: 'Thích làm việc với máy móc, dụng cụ.' },
  investigative: { label: 'Nghiên cứu', color: '#8B5CF6', emoji: '🔬', desc: 'Thích phân tích và giải quyết vấn đề.' },
  artistic: { label: 'Nghệ thuật', color: '#EC4899', emoji: '🎨', desc: 'Giàu trí tưởng tượng, sáng tạo.' },
  social: { label: 'Xã hội', color: '#10B981', emoji: '🤝', desc: 'Thích giúp đỡ và tư vấn mọi người.' },
  enterprising: { label: 'Kinh doanh', color: '#3B82F6', emoji: '📈', desc: 'Năng động, thuyết phục, lãnh đạo.' },
  conventional: { label: 'Nghiệp vụ', color: '#F59E0B', emoji: '📋', desc: 'Thích làm việc với hệ thống, sổ sách.' }
};
const RIASEC_ORDER = ['realistic','investigative','artistic','social','enterprising','conventional'];
const DIMENSION_OPTIONS = [
  ...RIASEC_ORDER,
  'openness','conscientiousness','extraversion','agreeableness','neuroticism'
];

export default function AssessmentTabScreen() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('user');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User state
  const [result, setResult] = useState<any>(null);

  // Admin state
  const [questions, setQuestions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [formText, setFormText] = useState('');
  const [formDimension, setFormDimension] = useState('realistic');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const fetchData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true); else setIsLoading(true);
      const profileRes = await api.get('/users/me');
      const profile = profileRes.data?.data || profileRes.data;
      const role = profile?.role || 'user';
      setUserRole(role);

      if (role === 'admin') {
        const qRes = await api.get('/assessment-questions?page=1&limit=200');
        const qData = qRes.data?.data?.questions || qRes.data?.data || qRes.data?.questions || [];
        setQuestions(Array.isArray(qData) ? qData : []);
      } else {
        try {
          const rRes = await api.get('/career-fit-results/my-results', { params: { limit: 1 } });
          const arr = rRes.data?.data || rRes.data || [];
          setResult(Array.isArray(arr) && arr.length > 0 ? arr[0] : null);
        } catch { setResult(null); }
      }
    } catch (e) { console.error('Assessment fetch error:', e); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setEditingId(null); setFormText(''); setFormDimension('realistic');
    setFormOptA(''); setFormOptB(''); setFormOptC(''); setFormOptD('');
    setShowForm(false);
  };

  const startEdit = (q: any) => {
    setEditingId(q._id || q.id);
    setFormText(q.questionText || '');
    setFormDimension(q.dimension || 'realistic');
    const optA = q.options?.find((o:any)=>o.value==='A')?.label || '';
    const optB = q.options?.find((o:any)=>o.value==='B')?.label || '';
    const optC = q.options?.find((o:any)=>o.value==='C')?.label || '';
    const optD = q.options?.find((o:any)=>o.value==='D')?.label || '';
    setFormOptA(optA); setFormOptB(optB); setFormOptC(optC); setFormOptD(optD);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formText.trim()) { flash('Vui lòng nhập nội dung câu hỏi'); return; }
    if (!formOptA.trim()||!formOptB.trim()||!formOptC.trim()||!formOptD.trim()) {
      flash('Vui lòng nhập đầy đủ 4 đáp án'); return;
    }
    const payload = {
      questionText: formText.trim(), questionType: 'multiple_choice', dimension: formDimension,
      options: [
        { value: 'A', label: formOptA.trim() }, { value: 'B', label: formOptB.trim() },
        { value: 'C', label: formOptC.trim() }, { value: 'D', label: formOptD.trim() },
      ]
    };
    setSubmitting(true);
    try {
      if (editingId) { await api.patch(`/assessment-questions/${editingId}`, payload); flash('Đã cập nhật câu hỏi'); }
      else { await api.post('/assessment-questions', payload); flash('Đã thêm câu hỏi mới'); }
      resetForm(); fetchData();
    } catch (e: any) { flash(e.response?.data?.message || 'Lưu thất bại'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (q: any) => {
    const id = q._id || q.id;
    const doDelete = async () => {
      try { await api.delete(`/assessment-questions/${id}`); flash('Đã xóa câu hỏi'); fetchData(); }
      catch { flash('Xóa thất bại'); }
    };
    if (Platform.OS === 'web') { if (confirm('Xóa câu hỏi này?')) doDelete(); }
    else { Alert.alert('Xác nhận', 'Xóa câu hỏi này?', [{ text: 'Hủy' }, { text: 'Xóa', style: 'destructive', onPress: doDelete }]); }
  };

  const filteredQ = questions.filter(q => {
    const s = searchQ.toLowerCase();
    return (q.questionText||'').toLowerCase().includes(s) || (q.dimension||'').toLowerCase().includes(s);
  });

  if (isLoading) return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Đang tải...</Text>
    </View>
  );

  // ──── ADMIN: QUESTION BANK MANAGEMENT ────
  if (userRole === 'admin') return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.header}>
          <Brain size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>NGÂN HÀNG CÂU HỎI</Text>
            <Text style={styles.headerTitle}>Quản lý bài test trắc nghiệm</Text>
          </View>
          <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }} style={styles.addBtn}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <GlassView style={styles.searchRow}>
          <Search size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput placeholder="Tìm câu hỏi..." placeholderTextColor={COLORS.muted}
            style={styles.searchInput} value={searchQ} onChangeText={setSearchQ} />
        </GlassView>

        <Text style={styles.countText}>Tổng: {filteredQ.length} câu hỏi</Text>

        {/* Form */}
        {showForm && (
          <GlassView style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? '✏️ Sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</Text>
            <Text style={styles.fieldLabel}>Nội dung câu hỏi</Text>
            <TextInput multiline style={styles.textArea} value={formText} onChangeText={setFormText}
              placeholder="Nhập câu hỏi..." placeholderTextColor={COLORS.muted} />
            <Text style={styles.fieldLabel}>Nhóm dimension</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {DIMENSION_OPTIONS.map(d => (
                <TouchableOpacity key={d} onPress={() => setFormDimension(d)}
                  style={[styles.dimPill, formDimension === d && styles.dimPillActive]}>
                  <Text style={[styles.dimPillText, formDimension === d && styles.dimPillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {(['A','B','C','D'] as const).map((v, i) => (
              <View key={v}>
                <Text style={styles.fieldLabel}>Đáp án {v}</Text>
                <TextInput style={styles.inputField}
                  value={[formOptA, formOptB, formOptC, formOptD][i]}
                  onChangeText={[setFormOptA, setFormOptB, setFormOptC, setFormOptD][i]}
                  placeholder={`Nội dung đáp án ${v}`} placeholderTextColor={COLORS.muted} />
              </View>
            ))}
            <View style={styles.formActions}>
              <TouchableOpacity onPress={handleSave} disabled={submitting} style={styles.saveBtn}>
                <Save size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>{submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetForm} style={styles.cancelBtn}>
                <X size={16} color={COLORS.muted} style={{ marginRight: 4 }} />
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </GlassView>
        )}

        {/* Question List */}
        {filteredQ.map((q, idx) => (
          <GlassView key={q._id || q.id || idx} style={styles.qCard}>
            <View style={styles.qHeader}>
              <View style={[styles.qDimBadge, { backgroundColor: (RIASEC_DECORATIONS[q.dimension]?.color || '#8B5CF6') + '20' }]}>
                <Text style={[styles.qDimText, { color: RIASEC_DECORATIONS[q.dimension]?.color || '#8B5CF6' }]}>{q.dimension}</Text>
              </View>
              <View style={styles.qActions}>
                <TouchableOpacity onPress={() => startEdit(q)} style={styles.qActionBtn}>
                  <Pencil size={14} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(q)} style={styles.qActionBtn}>
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.qText}>{q.questionText}</Text>
            {q.options?.map((o: any) => (
              <Text key={o.value} style={styles.qOpt}><Text style={{ fontWeight: '700', color: COLORS.foreground }}>{o.value}.</Text> {o.label}</Text>
            ))}
          </GlassView>
        ))}

        {message ? <View style={styles.toast}><Text style={styles.toastText}>{message}</Text></View> : null}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  // ──── USER: HOLLAND TEST RESULTS / INVITATION ────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.header}>
          <Brain size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.headerLabel}>ĐÁNH GIÁ NĂNG LỰC</Text>
            <Text style={styles.headerTitle}>Holland RIASEC Test</Text>
          </View>
        </View>

        {result ? (
          <>
            <GlassView style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Award size={28} color={COLORS.secondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.profileLabel}>HỒ SƠ NGHỀ NGHIỆP</Text>
                  <Text style={styles.profileTitle}>{result.careerTitle}</Text>
                </View>
                <View style={styles.fitBadge}><Text style={styles.fitText}>{Math.round(result.overallFitScore)}%</Text></View>
              </View>
              <Text style={styles.aiText}>{result.aiExplanation || 'AI đã phân tích kết quả trắc nghiệm của bạn.'}</Text>
              <View style={styles.cardBtns}>
                <TouchableOpacity onPress={() => router.push('/test-result')} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Xem báo cáo chi tiết</Text>
                  <ChevronRight size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/holland-test')} style={styles.secondaryBtn}>
                  <RotateCcw size={14} color={COLORS.muted} />
                  <Text style={styles.secondaryBtnText}> Làm lại</Text>
                </TouchableOpacity>
              </View>
            </GlassView>

            <Text style={styles.sectionTitle}>Phân tích 6 nhóm tính cách</Text>
            <GlassView style={styles.breakdownCard}>
              {RIASEC_ORDER.map(key => {
                const score = result.dimensionScores?.[key] || 0;
                const cfg = RIASEC_DECORATIONS[key];
                return (
                  <View key={key} style={{ marginBottom: 14 }}>
                    <View style={styles.barHeader}>
                      <Text style={styles.barLabel}>{cfg.emoji} {cfg.label}</Text>
                      <Text style={[styles.barScore, { color: cfg.color }]}>{Math.round(score)}%</Text>
                    </View>
                    <View style={styles.barBg}><View style={[styles.barFill, { width: `${Math.max(5,score)}%`, backgroundColor: cfg.color }]} /></View>
                  </View>
                );
              })}
            </GlassView>

            <View style={styles.noticeBox}>
              <Info size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.noticeText}>Kết quả giúp AI định hướng lộ trình học tập & đề xuất nghề nghiệp phù hợp.</Text>
            </View>
          </>
        ) : (
          <GlassView style={styles.introCard}>
            <View style={styles.introIcon}><Target size={44} color={COLORS.primary} /></View>
            <Text style={styles.introTitle}>Khám phá bản thân cùng Career AI</Text>
            <Text style={styles.introDesc}>Làm bài trắc nghiệm Holland Code (RIASEC) để xác định thế mạnh & nghề nghiệp lý tưởng.</Text>
            <TouchableOpacity onPress={() => router.push('/holland-test')} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Bắt đầu làm trắc nghiệm</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </GlassView>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 60 },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { color: COLORS.muted, marginTop: 12, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  headerLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.foreground, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.foreground, marginTop: SPACING.lg, marginBottom: SPACING.md },

  // Admin styles
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.foreground, fontSize: 14, height: 36, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  countText: { color: COLORS.muted, fontSize: 12, marginBottom: SPACING.md, fontWeight: '600' },
  formCard: { padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.lg },
  formTitle: { fontSize: 16, fontWeight: '700', color: COLORS.foreground, marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 4, marginTop: 8 },
  textArea: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: COLORS.foreground, padding: SPACING.sm, fontSize: 14, minHeight: 80, textAlignVertical: 'top', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  inputField: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: COLORS.foreground, paddingHorizontal: SPACING.sm, height: 42, fontSize: 14, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  dimPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dimPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dimPillText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  dimPillTextActive: { color: '#fff' },
  formActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { flex: 0.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cancelBtnText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  qCard: { padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.sm },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qDimBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  qDimText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  qActions: { flexDirection: 'row', gap: 6 },
  qActionBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  qText: { color: COLORS.foreground, fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 8 },
  qOpt: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  toast: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  toastText: { color: '#10B981', fontSize: 13, fontWeight: '600' },

  // User styles
  profileCard: { padding: SPACING.lg, borderRadius: RADIUS.xl, marginBottom: SPACING.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  profileLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '800', letterSpacing: 1.5 },
  profileTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  fitBadge: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  fitText: { color: '#10B981', fontSize: 12, fontWeight: '800' },
  aiText: { fontSize: 13, color: COLORS.muted, lineHeight: 20, marginBottom: SPACING.lg },
  cardBtns: { flexDirection: 'row', gap: SPACING.sm },
  primaryBtn: { flex: 1.2, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryBtn: { flex: 1, height: 44, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  breakdownCard: { padding: SPACING.md, borderRadius: RADIUS.lg },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 13, fontWeight: '700', color: COLORS.foreground },
  barScore: { fontSize: 13, fontWeight: '800' },
  barBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  noticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139,92,246,0.05)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.1)', borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.xl },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500', color: '#A78BFA' },
  introCard: { padding: SPACING.xl, borderRadius: RADIUS.xl, alignItems: 'center' },
  introIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(56,189,248,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  introTitle: { fontSize: 20, fontWeight: '800', color: COLORS.foreground, textAlign: 'center', marginBottom: SPACING.md },
  introDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  startBtn: { width: '100%', height: 56, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

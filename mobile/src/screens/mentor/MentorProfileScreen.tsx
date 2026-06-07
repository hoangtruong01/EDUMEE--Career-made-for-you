import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, LogOut, Send, UserCheck, X } from 'lucide-react-native';
import { careerTagsService, type CareerTag, type SkillTag } from '../../services/career-tags.service';
import { mentorService, type ApplyTutorProfilePayload, type TutorProfile } from '../../services/mentor.service';
import { setAuthToken } from '../../services/api';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { mentorPortalQueryKey, useMentorPortalData } from '../../hooks/useMentorPortalData';
import { getId, getMentorTitle, profileStatusLabel } from './mentorUtils';
import {
  ActionButton,
  EmptyState,
  FormInput,
  InfoCard,
  LoadingState,
  MessageBanner,
  Pill,
  PortalScreen,
  SectionTitle,
} from './MentorPortalUI';

type MentorFormState = {
  currentPosition: string;
  company: string;
  yearsOfExperience: string;
  industries: string;
  specializations: string;
  price: string;
};

const defaultForm: MentorFormState = {
  currentPosition: '',
  company: '',
  yearsOfExperience: '3',
  industries: '',
  specializations: '',
  price: '200000',
};

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createInitialForm(profile?: TutorProfile | null): MentorFormState {
  const rate = profile?.pricing?.sessionRates?.[0];
  return {
    currentPosition: profile?.professionalBackground?.currentPosition || '',
    company: profile?.professionalBackground?.company || '',
    yearsOfExperience: String(profile?.professionalBackground?.yearsOfExperience ?? 3),
    industries: profile?.professionalBackground?.industries?.join(', ') || '',
    specializations: profile?.mentoringExpertise?.specializations?.join(', ') || '',
    price: String(rate?.pricePerSession ?? 200000),
  };
}

function getCareerId(career: CareerTag) {
  return career.id || career._id || career.title;
}

function MultiSelectModal({
  title,
  trigger,
  options,
  selected,
  onToggle,
}: {
  title: string;
  trigger: string;
  options: { value: string; label: string; meta?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => `${option.label} ${option.meta || ''}`.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <View style={styles.selectGroup}>
      <Text style={styles.selectLabel}>{title}</Text>
      <TouchableOpacity style={styles.selectTrigger} onPress={() => setOpen(true)}>
        <Text style={[styles.selectTriggerText, selected.length === 0 && styles.placeholder]} numberOfLines={1}>
          {trigger}
        </Text>
        <ChevronDown size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalClose}>
                <X size={18} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm kiếm..."
              placeholderTextColor="rgba(226,232,240,0.45)"
              style={styles.searchInput}
            />
            <ScrollView contentContainerStyle={styles.optionList}>
              {visibleOptions.map((option) => {
                const active = selected.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => onToggle(option.value)}
                    style={[styles.optionItem, active && styles.optionItemActive]}
                  >
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {option.meta ? <Text style={styles.optionMeta}>{option.meta}</Text> : null}
                    </View>
                    {active ? <CheckCircle2 size={18} color={COLORS.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ActionButton label="Xong" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MentorApplicationForm({
  profile,
  onDone,
}: {
  profile?: TutorProfile | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => createInitialForm(profile));
  const [selectedCareerIds, setSelectedCareerIds] = useState<string[]>([]);
  const [selectedSkillSlugs, setSelectedSkillSlugs] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(profile && getId(profile));

  const careersQuery = useQuery({
    queryKey: ['mentorCareerCatalog'],
    queryFn: () => careerTagsService.getCareers(),
  });
  const skillsQuery = useQuery({
    queryKey: ['mentorSkillTags'],
    queryFn: () => careerTagsService.getSkillTags(),
  });

  const careerCatalog = careersQuery.data?.data || [];
  const skillTags = skillsQuery.data || [];

  useEffect(() => {
    if (!profile) return;
    setForm(createInitialForm(profile));

    const careerIds = (profile.mentoringExpertise?.careerExpertise || [])
      .map((item) => {
        const match = careerCatalog.find((career) => career.title === item.careerTitle);
        return item.careerId || (match ? getCareerId(match) : item.careerTitle);
      })
      .filter(Boolean);
    const skillSlugs = (profile.mentoringExpertise?.skillExpertise || [])
      .map((item) => skillTags.find((skill) => skill.name === item.skillName)?.slug)
      .filter(Boolean) as string[];

    setSelectedCareerIds(careerIds);
    setSelectedSkillSlugs(skillSlugs);
  }, [careerCatalog, profile, skillTags]);

  const selectedCareers = useMemo(
    () => careerCatalog.filter((career) => selectedCareerIds.includes(getCareerId(career))),
    [careerCatalog, selectedCareerIds],
  );
  const availableSkillTags = useMemo(() => {
    if (selectedCareerIds.length === 0) return skillTags;
    return skillTags.filter((skill) => skill.careerIds?.some((careerId) => selectedCareerIds.includes(careerId)));
  }, [selectedCareerIds, skillTags]);
  const selectedSkillTags = useMemo(
    () => skillTags.filter((skill) => selectedSkillSlugs.includes(skill.slug)),
    [selectedSkillSlugs, skillTags],
  );

  const selectedCareerLabel =
    selectedCareers.length === 0
      ? 'Chọn nghề có thể mentor'
      : selectedCareers.length <= 2
        ? selectedCareers.map((career) => career.title).join(', ')
        : `${selectedCareers.length} nghề đã chọn`;
  const selectedSkillLabel =
    selectedSkillTags.length === 0
      ? 'Chọn kỹ năng mentor'
      : selectedSkillTags.length <= 2
        ? selectedSkillTags.map((skill) => skill.name).join(', ')
        : `${selectedSkillTags.length} kỹ năng đã chọn`;

  const updateField = (key: keyof MentorFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleCareer = (value: string) => {
    setSelectedCareerIds((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleSkill = (value: string) => {
    setSelectedSkillSlugs((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const submit = async () => {
    if (!form.currentPosition.trim() || !form.company.trim() || selectedCareers.length === 0 || selectedSkillTags.length === 0) {
      setMessage('Vui lòng nhập vị trí, công ty, nghề và kỹ năng mentor.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const years = Number(form.yearsOfExperience) || 0;
      const price = Number(form.price) || 0;
      const payload: ApplyTutorProfilePayload = {
        professionalBackground: {
          currentPosition: form.currentPosition.trim(),
          company: form.company.trim(),
          yearsOfExperience: years,
          industries: splitList(form.industries),
          seniority: 'mid_level',
        },
        mentoringExpertise: {
          careerExpertise: selectedCareers.map((career) => ({
            careerId: getCareerId(career),
            careerTitle: career.title,
            experienceLevel: 'mid_level',
            yearsInField: years,
            confidenceLevel: 4,
          })),
          skillExpertise: selectedSkillTags.map((skill) => ({
            skillName: skill.name,
            skillCategory: skill.category,
            proficiencyLevel: 4,
            teachingExperience: 1,
          })),
          specializations: splitList(form.specializations),
          targetMenteeLevels: ['entry_level', 'mid_level'],
        },
        availability: {
          timeZone: 'Asia/Ho_Chi_Minh',
          weeklyAvailability: [
            {
              day: 'saturday',
              timeSlots: [{ startTime: '09:00', endTime: '17:00', available: true }],
            },
          ],
          sessionPreferences: {
            preferredDuration: [60, 90],
            sessionTypes: ['career_guidance', 'skill_coaching', 'interview_preparation'],
            communicationMethods: ['video'],
          },
        },
        pricing: {
          currency: 'VND',
          sessionRates: [
            { sessionType: 'career_guidance', duration: 60, pricePerSession: price },
            { sessionType: 'skill_coaching', duration: 60, pricePerSession: price },
          ],
          freeSessionOffered: false,
        },
      };

      const profileId = profile ? getId(profile) : '';
      if (profileId) {
        await mentorService.updateTutorProfile(profileId, payload);
      } else {
        await mentorService.applyTutorProfile(payload);
      }
      await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
      setMessage('Đã gửi hồ sơ mentor. Admin sẽ duyệt trước khi mở portal.');
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi hồ sơ mentor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formStack}>
      <InfoCard>
        <SectionTitle
          title={isEditing ? 'Cập nhật hồ sơ mentor' : 'Đăng ký làm mentor'}
          meta="Thông tin này dùng để admin duyệt và hiển thị với học viên."
        />
        <View style={styles.formInner}>
          <FormInput
            label="Vị trí hiện tại"
            value={form.currentPosition}
            placeholder="Ví dụ: Senior Frontend Engineer"
            onChangeText={(value) => updateField('currentPosition', value)}
          />
          <FormInput
            label="Công ty"
            value={form.company}
            placeholder="Ví dụ: EDUMEE"
            onChangeText={(value) => updateField('company', value)}
          />
          <FormInput
            label="Số năm kinh nghiệm"
            value={form.yearsOfExperience}
            keyboardType="numeric"
            onChangeText={(value) => updateField('yearsOfExperience', value)}
          />
          <FormInput
            label="Lĩnh vực, cách nhau bằng dấu phẩy"
            value={form.industries}
            placeholder="Công nghệ, giáo dục, sản phẩm"
            onChangeText={(value) => updateField('industries', value)}
          />

          <MultiSelectModal
            title="Nghề có thể mentor"
            trigger={selectedCareerLabel}
            options={careerCatalog.map((career) => ({
              value: getCareerId(career),
              label: career.title,
              meta: career.category,
            }))}
            selected={selectedCareerIds}
            onToggle={toggleCareer}
          />
          <MultiSelectModal
            title="Kỹ năng mentor"
            trigger={selectedSkillLabel}
            options={availableSkillTags.map((skill) => ({
              value: skill.slug,
              label: skill.name,
              meta: skill.careerTitles?.join(', '),
            }))}
            selected={selectedSkillSlugs}
            onToggle={toggleSkill}
          />
          <FormInput
            label="Chuyên đề mentor"
            value={form.specializations}
            placeholder="CV, portfolio, roadmap, mock interview"
            onChangeText={(value) => updateField('specializations', value)}
          />
          <FormInput
            label="Giá mỗi buổi 60 phút"
            value={form.price}
            keyboardType="numeric"
            onChangeText={(value) => updateField('price', value)}
          />
          {careersQuery.isLoading || skillsQuery.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.helperText}>Đang tải danh sách nghề và kỹ năng...</Text>
            </View>
          ) : null}
          {message ? <MessageBanner message={message} tone={message.startsWith('Đã') ? 'success' : 'danger'} /> : null}
          <ActionButton
            label={isEditing ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ cho admin duyệt'}
            onPress={submit}
            loading={isSubmitting}
            icon={Send}
          />
        </View>
      </InfoCard>
    </View>
  );
}

function ProfileSummary({ profile, onEdit }: { profile: TutorProfile; onEdit: () => void }) {
  const skills = profile.mentoringExpertise?.skillExpertise || [];
  return (
    <InfoCard>
      <View style={styles.summaryHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile.mentorUser?.name || 'M').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>{getMentorTitle(profile)}</Text>
          <Text style={styles.summaryMeta}>
            {profile.professionalBackground?.yearsOfExperience || 0} năm kinh nghiệm
          </Text>
          <View style={styles.pillRow}>
            <Pill label={profileStatusLabel[profile.status] || profile.status} active />
          </View>
        </View>
      </View>
      <View style={styles.skillWrap}>
        {skills.slice(0, 10).map((skill) => (
          <Pill key={skill.skillName} label={skill.skillName} active color="#38BDF8" />
        ))}
      </View>
      <ActionButton label="Chỉnh sửa hồ sơ" onPress={onEdit} variant="outline" />
    </InfoCard>
  );
}

export default function MentorProfileScreen() {
  const router = useRouter();
  const portalQuery = useMentorPortalData();
  const [showEdit, setShowEdit] = useState(false);
  const profile = portalQuery.data?.profile ?? null;

  const handleLogout = async () => {
    try {
      await setAuthToken(null);
      router.replace('/login');
    } catch (error) {
      console.error('Mentor logout error:', error);
    }
  };

  if (portalQuery.isLoading) return <LoadingState label="Đang tải hồ sơ mentor..." />;

  if (portalQuery.error) {
    return (
      <PortalScreen title="Hồ sơ mentor">
        <MessageBanner
          message={portalQuery.error instanceof Error ? portalQuery.error.message : 'Không thể tải hồ sơ mentor.'}
          tone="danger"
        />
        <ActionButton label="Đăng xuất" onPress={handleLogout} variant="danger" icon={LogOut} />
      </PortalScreen>
    );
  }

  if (!profile) {
    return (
      <PortalScreen title="Hoàn thiện hồ sơ" subtitle="Tạo hồ sơ mentor để admin xét duyệt trước khi nhận booking.">
        <EmptyState
          icon={UserCheck}
          title="Chưa có hồ sơ mentor"
          description="Điền thông tin chuyên môn, kỹ năng và giá phiên để bắt đầu quy trình duyệt."
        />
        <MentorApplicationForm onDone={() => setShowEdit(false)} />
        <ActionButton label="Đăng xuất" onPress={handleLogout} variant="danger" icon={LogOut} />
      </PortalScreen>
    );
  }

  const isRejected = profile.status === 'rejected';
  const canEdit = profile.status === 'active' || isRejected;

  return (
    <PortalScreen
      title="Hồ sơ mentor"
      subtitle="Thông tin làm việc, trạng thái duyệt và chuyên môn mentor."
      refreshing={portalQuery.isRefetching}
      onRefresh={() => portalQuery.refetch()}
    >
      {profile.status !== 'active' ? (
        <InfoCard>
          <SectionTitle title={profileStatusLabel[profile.status] || profile.status} meta="Portal đầy đủ sẽ mở sau khi hồ sơ được duyệt." />
          <Text style={styles.paragraph}>
            Hồ sơ của bạn đang ở trạng thái {profileStatusLabel[profile.status] || profile.status}. Admin cần duyệt trước khi bạn mở lịch và nhận booking.
          </Text>
          {profile.adminInfo?.rejectionReason ? (
            <MessageBanner message={`Lý do từ chối: ${profile.adminInfo.rejectionReason}`} tone="danger" />
          ) : null}
        </InfoCard>
      ) : (
        <ProfileSummary profile={profile} onEdit={() => setShowEdit((value) => !value)} />
      )}

      {canEdit && showEdit ? (
        <MentorApplicationForm profile={profile} onDone={() => setShowEdit(false)} />
      ) : null}

      {isRejected && !showEdit ? (
        <ActionButton label="Cập nhật và gửi lại hồ sơ" onPress={() => setShowEdit(true)} />
      ) : null}

      <ActionButton label="Đăng xuất" onPress={handleLogout} variant="danger" icon={LogOut} />
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: SPACING.md,
  },
  formInner: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  selectGroup: {
    gap: 7,
  },
  selectLabel: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '800',
  },
  selectTrigger: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  selectTriggerText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  placeholder: {
    color: COLORS.muted,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  modalSheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.lg,
    gap: SPACING.md,
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
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.foreground,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  optionList: {
    gap: SPACING.sm,
  },
  optionItem: {
    minHeight: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  optionItemActive: {
    borderColor: 'rgba(59,130,246,0.5)',
    backgroundColor: 'rgba(59,130,246,0.14)',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  optionMeta: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  skillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  paragraph: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
});

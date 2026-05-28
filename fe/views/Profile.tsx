'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PlanBenefitDetails } from '@/components/ai/PlanBenefitDetails';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notification-context';
import {
  aiBillingQueryKey,
  fetchAiBillingData,
  meQueryKey,
  myProfileQueryKey,
  useProfileData,
  type AiBillingData,
} from '@/hooks/useProfileData';
import { ApiError } from '@/lib/api-client';
import type { CareerFitResult } from '@/lib/assessment.service';
import {
  aiBillingService,
  type AiPlanCatalogItem,
  type BillingCycle,
  type MyAiSubscription,
  type PaymentRecord,
  type PaymentStatus,
  type QuotaView,
} from '@/lib/ai-billing.service';
import { getPlanFeatureLabels } from '@/lib/ai-plan-benefits';
import { normalizePaymentCheckoutRedirectUrl } from '@/lib/payment-redirect';
import { adminService, type AuditLogRecord, type DashboardStats } from '@/lib/admin.service';
import { getWalletAccount, type WalletSummary } from '@/lib/wallet.service';
import {
  mentorService,
  type ApplyTutorProfilePayload,
  type BookingSession,
  type ExperienceLevel,
  type MentorCommunicationMethod,
  type MentorSessionType,
  type MentorSkillCategory,
  type TutorProfile,
} from '@/lib/mentor.service';
import { profileService, UserProfile } from '@/lib/profile.service';
import { userService, type UserMe } from '@/lib/user.service';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  AlertCircle,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  History,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Palette,
  Phone,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  Upload,
  User,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Hàng tháng',
  three_months: '3 tháng',
  six_months: '6 tháng',
  five_months: '5 tháng',
  nine_months: '9 tháng',
  yearly: '1 năm',
};

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  three_months: 3,
  six_months: 6,
  five_months: 5,
  nine_months: 9,
  yearly: 12,
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Đang chờ',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  refund_pending: 'Chờ hoàn tiền',
};

const purchasablePlanNames = new Set(['plus', 'business']);
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const PROFILE_ROLE_LABELS: Record<string, string> = {
  user: 'Học viên',
  mentor: 'Mentor',
  admin: 'Quản trị viên',
  employer: 'Nhà tuyển dụng',
  hr: 'Nhân sự',
  recruiter: 'Tuyển dụng',
};

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  elementary: 'Tiểu học',
  middle_school: 'THCS',
  high_school: 'THPT',
  college: 'Cao đẳng',
  bachelor: 'Đại học',
  master: 'Thạc sĩ',
  phd: 'Tiến sĩ',
  vocational: 'Trung cấp nghề',
  certificate: 'Chứng chỉ',
  other: 'Khác',
};

type BillingBanner = {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
};

type RoleProfile = 'user' | 'mentor' | 'admin';

type MentorProfileSummary = {
  profile: TutorProfile | null;
  bookings: BookingSession[];
  error?: string;
};

type AdminProfileSummary = {
  stats: DashboardStats | null;
  auditLogs: AuditLogRecord[];
  error?: string;
};

type MentorProfileForm = {
  currentPosition: string;
  company: string;
  yearsOfExperience: string;
  industries: string;
  seniority: ExperienceLevel;
  careerTitles: string;
  careerExperienceLevel: ExperienceLevel;
  careerYearsInField: string;
  careerConfidenceLevel: string;
  skillNames: string;
  skillCategory: MentorSkillCategory;
  skillProficiencyLevel: string;
  skillTeachingExperience: string;
  specializations: string;
  targetMenteeLevels: ExperienceLevel[];
  preferredDurations: string;
  sessionTypes: MentorSessionType[];
  communicationMethods: MentorCommunicationMethod[];
  currency: string;
  sessionDuration: string;
  pricePerSession: string;
  freeSessionOffered: boolean;
};

const MENTOR_PROFILE_EDIT_MODAL = 'Chỉnh sửa hồ sơ mentor';
const MENTOR_PROFILE_CREATE_MODAL = 'Tạo hồ sơ mentor';

const EXPERIENCE_LEVEL_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'intern', label: 'Intern' },
  { value: 'entry_level', label: 'Entry level' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid_level', label: 'Mid level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'executive', label: 'Executive' },
];

const SKILL_CATEGORY_OPTIONS: Array<{ value: MentorSkillCategory; label: string }> = [
  { value: 'technical', label: 'Technical' },
  { value: 'soft', label: 'Soft skill' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'industry_specific', label: 'Theo ngành' },
];

const SESSION_TYPE_OPTIONS: Array<{ value: MentorSessionType; label: string }> = [
  { value: 'career_guidance', label: 'Định hướng nghề' },
  { value: 'skill_coaching', label: 'Coaching kỹ năng' },
  { value: 'interview_preparation', label: 'Luyện phỏng vấn' },
  { value: 'project_review', label: 'Review dự án' },
  { value: 'general_mentoring', label: 'Mentoring chung' },
];

const COMMUNICATION_METHOD_OPTIONS: Array<{ value: MentorCommunicationMethod; label: string }> = [
  { value: 'video', label: 'Video' },
  { value: 'voice', label: 'Voice' },
  { value: 'chat', label: 'Chat' },
  { value: 'screen_sharing', label: 'Share màn hình' },
];

const Profile = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, accessToken, role } = useAuth();
  const { realtimeAlertsEnabled, setRealtimeAlertsEnabled } = useNotifications();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();
  const {
    meQuery,
    myProfileQuery,
    careerFitResultsQuery,
    aiBillingQuery,
  } = useProfileData();

  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<CareerFitResult[]>([]);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [aiPlans, setAiPlans] = useState<AiPlanCatalogItem[]>([]);
  const [aiSubscription, setAiSubscription] = useState<MyAiSubscription | null>(null);
  const [aiPayments, setAiPayments] = useState<PaymentRecord[]>([]);
  const [selectedBillingCycles, setSelectedBillingCycles] = useState<Record<string, BillingCycle>>({});
  const [billingBanner, setBillingBanner] = useState<BillingBanner | null>(null);
  const [isBillingRefreshing, setIsBillingRefreshing] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [syncingPaymentId, setSyncingPaymentId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useEdumeeCredit, setUseEdumeeCredit] = useState(true);
  const [mentorSummary, setMentorSummary] = useState<MentorProfileSummary>({
    profile: null,
    bookings: [],
  });
  const [mentorProfileForm, setMentorProfileForm] = useState<MentorProfileForm>(() => createMentorProfileForm(null));
  const [isSavingMentorProfile, setIsSavingMentorProfile] = useState(false);
  const [adminSummary, setAdminSummary] = useState<AdminProfileSummary>({
    stats: null,
    auditLogs: [],
  });
  const [isRoleSummaryLoading, setIsRoleSummaryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: '',
    educationLevel: '',
    bio: '',
  });

  const [currentTheme, setCurrentTheme] = useState<string>('system');
  const reportRef = useRef<HTMLDivElement>(null);

  const applyAiBillingData = useCallback((data: AiBillingData | undefined) => {
    if (!data) {
      setAiPlans([]);
      setAiSubscription(null);
      setAiPayments([]);
      setWallet(null);
      return;
    }

    const visiblePlans = data.catalog.filter((plan) => {
      const normalizedName = normalizePlanCode(plan.name);
      return (
        purchasablePlanNames.has(normalizedName) &&
        plan.isActive !== false &&
        Number(plan.price || 0) > 0
      );
    });

    setAiPlans(visiblePlans);
    setAiSubscription(data.subscription);
    setAiPayments(data.payments.filter((payment) => payment.purpose === 'ai_plan').slice(0, 4));
    setWallet(data.wallet);
    setSelectedBillingCycles((current) =>
      visiblePlans.reduce<Record<string, BillingCycle>>((acc, plan) => {
        acc[plan.id] = current[plan.id] || getDefaultBillingCycle(plan);
        return acc;
      }, {}),
    );
  }, []);

  const refreshAiBilling = useCallback(async () => {
    if (!accessToken) return;
    if (getRoleProfile(role) !== 'user') return;

    try {
      setIsBillingRefreshing(true);
      setBillingError('');
      const data = await queryClient.fetchQuery({
        queryKey: aiBillingQueryKey(accessToken),
        queryFn: () => fetchAiBillingData(accessToken),
        staleTime: 0,
      });
      applyAiBillingData(data);
    } catch (error) {
      setBillingError(getErrorMessage(error, 'Không thể tải thông tin gói AI.'));
    } finally {
      setIsBillingRefreshing(false);
    }
  }, [accessToken, applyAiBillingData, queryClient, role]);

  const loadRoleSummary = useCallback(async (token: string, roleProfile: RoleProfile) => {
    setMentorSummary({ profile: null, bookings: [] });
    setAdminSummary({ stats: null, auditLogs: [] });

    if (roleProfile === 'user') {
      setIsRoleSummaryLoading(false);
      return;
    }

    setIsRoleSummaryLoading(true);
    try {
      if (roleProfile === 'mentor') {
        const [tutorProfile, bookings] = await Promise.all([
          mentorService.getMyTutorProfile(token).catch((error) => {
            if (error instanceof ApiError && error.statusCode === 404) return null;
            throw error;
          }),
          mentorService.getMyBookings(token).catch(() => ({ asMentee: [], asMentor: [] })),
        ]);

        setMentorSummary({
          profile: tutorProfile,
          bookings: bookings.asMentor || [],
        });
        return;
      }

      const [stats, auditLogs] = await Promise.all([
        adminService.getDashboardStats(token),
        adminService.getAuditLogs(token, { page: 1, limit: 4 }).catch(() => ({
          logs: [],
          total: 0,
          page: 1,
          limit: 4,
          totalPages: 0,
        })),
      ]);

      setAdminSummary({
        stats,
        auditLogs: auditLogs.logs || [],
      });
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể tải dữ liệu theo vai trò.');
      if (roleProfile === 'mentor') {
        setMentorSummary({ profile: null, bookings: [], error: message });
      } else {
        setAdminSummary({ stats: null, auditLogs: [], error: message });
      }
    } finally {
      setIsRoleSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'system';
    setCurrentTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (searchParams.get('upgrade') === 'ai') {
      setActiveModal('Upgrade AI');
    }
  }, [searchParams]);

  useEffect(() => {
    if (meQuery.data) setUserMe(meQuery.data);
  }, [meQuery.data]);

  useEffect(() => {
    if (myProfileQuery.data !== undefined) setProfile(myProfileQuery.data);
  }, [myProfileQuery.data]);

  useEffect(() => {
    const roleProfile = getRoleProfile(meQuery.data?.role || role);
    if (roleProfile === 'user') {
      setResults(careerFitResultsQuery.data || []);
      return;
    }
    setResults([]);
  }, [careerFitResultsQuery.data, meQuery.data?.role, role]);

  useEffect(() => {
    if (activeModal) return;
    if (!meQuery.data && myProfileQuery.data === undefined) return;

    const userData = meQuery.data;
    const profData = myProfileQuery.data ?? null;
    setFormData({
      fullName: userData?.name || profData?.userId?.name || '',
      phone: userData?.phone_number || profData?.phone || '',
      city: profData?.city || '',
      educationLevel: profData?.educationLevel || '',
      bio: profData?.bio || '',
    });
  }, [activeModal, meQuery.data, myProfileQuery.data]);

  useEffect(() => {
    if (!accessToken || !meQuery.data) return;
    void loadRoleSummary(accessToken, getRoleProfile(meQuery.data.role || role));
  }, [accessToken, loadRoleSummary, meQuery.data, role]);

  useEffect(() => {
    if (aiBillingQuery.data) {
      setBillingError('');
      applyAiBillingData(aiBillingQuery.data);
      return;
    }

    if (getRoleProfile(role) !== 'user') {
      applyAiBillingData(undefined);
    }
  }, [aiBillingQuery.data, applyAiBillingData, role]);

  useEffect(() => {
    if (!aiBillingQuery.error) return;
    setBillingError(getErrorMessage(aiBillingQuery.error, 'Không thể tải thông tin gói AI.'));
  }, [aiBillingQuery.error]);

  const profileRoleForLoading = getRoleProfile(meQuery.data?.role || role);
  const loading =
    !mounted ||
    meQuery.isLoading ||
    myProfileQuery.isLoading ||
    (profileRoleForLoading === 'user' && careerFitResultsQuery.isLoading);
  const isBillingLoading = isBillingRefreshing || aiBillingQuery.isLoading || aiBillingQuery.isFetching;

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarPreviewUrl, userMe?.avatar]);

  useEffect(() => {
    if (!accessToken || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    const paymentId = params.get('paymentId');
    if (!paymentResult || !['success', 'error', 'cancel'].includes(paymentResult)) return;

    let isMounted = true;
    const cleanUrl = () => {
      const nextUrl = `${window.location.pathname}${window.location.hash || ''}`;
      window.history.replaceState({}, '', nextUrl);
    };

    const handlePaymentReturn = async () => {
      let payment: PaymentRecord | null = null;

      if (paymentId) {
        setSyncingPaymentId(paymentId);
        try {
          const synced = await aiBillingService.syncPayment(accessToken, paymentId);
          payment = synced.payment;
        } catch {
          try {
            const detail = await aiBillingService.getPayment(accessToken, paymentId);
            payment = detail.payment;
          } catch {
            payment = null;
          }
        } finally {
          if (isMounted) {
            setSyncingPaymentId(null);
          }
        }
      }

      if (!isMounted) return;

      const toastId = `payment-return:${paymentId || paymentResult}`;
      const banner = buildPaymentReturnBanner(paymentResult, payment);
      setBillingBanner(banner);
      showPaymentToast(banner, toastId);
      cleanUrl();
      await refreshAiBilling();
    };

    void handlePaymentReturn();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAiBilling]);

  const openModal = (label: string) => {
    setActiveModal(label);
  };

  const openMentorProfileEditor = useCallback((targetProfile: TutorProfile | null) => {
    setMentorProfileForm(createMentorProfileForm(targetProfile));
    setActiveModal(targetProfile ? MENTOR_PROFILE_EDIT_MODAL : MENTOR_PROFILE_CREATE_MODAL);
  }, []);

  const handleSaveMentorProfile = async () => {
    if (!accessToken) {
      toast.error('Vui lòng đăng nhập để chỉnh sửa hồ sơ mentor.');
      return;
    }

    const validationMessage = validateMentorProfileForm(mentorProfileForm);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const currentProfile = mentorSummary.profile;
    const payload = buildMentorProfilePayload(mentorProfileForm, currentProfile);

    setIsSavingMentorProfile(true);
    try {
      let savedProfile: TutorProfile | null = null;
      if (currentProfile?.id) {
        savedProfile = await mentorService.updateTutorProfile(accessToken, currentProfile.id, payload);
      } else {
        savedProfile = await mentorService.applyTutorProfile(accessToken, payload);
      }

      const refreshedProfile = await mentorService.getMyTutorProfile(accessToken).catch(() => null);
      setMentorSummary((current) => ({
        ...current,
        profile: refreshedProfile || savedProfile || current.profile,
        error: undefined,
      }));
      setActiveModal(null);
      toast.success(currentProfile ? 'Đã cập nhật hồ sơ mentor.' : 'Đã tạo hồ sơ mentor. Admin sẽ duyệt trước khi hiển thị công khai.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể lưu hồ sơ mentor.'));
    } finally {
      setIsSavingMentorProfile(false);
    }
  };

  const activePaidPlanCode =
    aiSubscription?.subscriptionStatus === 'active' ? aiSubscription.currentPlan : 'free';
  const hasActivePaidPlan = activePaidPlanCode === 'plus' || activePaidPlanCode === 'business';
  const edumeeCreditAccount = getWalletAccount(wallet, 'edumee_credit');

  const currentQuotaSummary = useMemo(() => {
    if (!aiSubscription?.quotas) return [];
    return [
      { label: 'Assessment', quota: aiSubscription.quotas.assessment },
      { label: 'AI chat', quota: aiSubscription.quotas.aiChat },
      { label: 'Roadmap', quota: aiSubscription.quotas.roadmap },
    ].filter((item) => item.quota && item.quota.limit > 0);
  }, [aiSubscription]);

  const handleAiPlanPurchase = async (plan: AiPlanCatalogItem) => {
    if (!accessToken) {
      toast.error('Vui lòng đăng nhập để mua gói AI.');
      return;
    }

    const billingCycle = selectedBillingCycles[plan.id] || getDefaultBillingCycle(plan);

    try {
      setPurchasingPlanId(plan.id);
      const purchase = await aiBillingService.purchaseAiPlan(accessToken, {
        planId: plan.id,
        billingCycle,
        returnUrls: buildProfileReturnUrls(),
        useEdumeeCredit,
      });
      window.location.href = normalizePaymentCheckoutRedirectUrl(purchase.redirectUrl);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tạo phiên thanh toán.'));
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const handleRefreshBilling = async () => {
    await refreshAiBilling();
    toast.success('Đã làm mới thông tin gói AI.');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleThemeChange = (newTheme: string) => {
    setCurrentTheme(newTheme);
    if (setTheme) setTheme(newTheme);

    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (newTheme === 'light') {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        localStorage.removeItem('theme');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }
  };
  const resetAvatarDraft = () => {
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      toast.error('Avatar chỉ hỗ trợ PNG, JPG hoặc WEBP.');
      resetAvatarDraft();
      return;
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      toast.error('Kích thước ảnh không được vượt quá 5MB.');
      resetAvatarDraft();
      return;
    }

    if (!accessToken) {
      toast.error('Vui lòng đăng nhập để thay đổi avatar.');
      return;
    }

    setIsUploadingAvatar(true);
    const toastId = toast.loading('Đang tải ảnh đại diện lên...');
    setAvatarPreviewUrl(URL.createObjectURL(file));

    try {
      const response = await userService.updateAvatar(accessToken, file);
      setUserMe((prev) => (prev ? { ...prev, avatar: response.avatar } : prev));
      queryClient.setQueryData<UserMe | undefined>(meQueryKey(accessToken), (current) =>
        current ? { ...current, avatar: response.avatar } : current,
      );
      toast.success('Cập nhật ảnh đại diện thành công', { id: toastId });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Lỗi khi tải ảnh lên'), { id: toastId });
      console.error(error);
      setAvatarPreviewUrl('');
    } finally {
      setIsUploadingAvatar(false);
      resetAvatarDraft();
    }
  };

  const handleAvatarDraftUpload = async () => {
    // Deprecated: Avatar is now uploaded immediately upon selection
  };

  const handleUpdateProfile = async () => {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      const profilePayload = {
        phone: formData.phone,
        city: formData.city,
        educationLevel: formData.educationLevel,
        bio: formData.bio,
      };
      const saveProfile = async () => {
        if (!profile) return profileService.createMyProfile(accessToken, profilePayload);
        try {
          return await profileService.updateMyProfile(accessToken, profilePayload);
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 404) {
            return profileService.createMyProfile(accessToken, profilePayload);
          }
          throw error;
        }
      };

      const [updatedProfile, updatedUser] = await Promise.all([
        saveProfile(),
        userService.updateMe(accessToken, { phone_number: formData.phone }),
      ]);
      toast.success('Cập nhật hồ sơ thành công');
      setActiveModal(null);
      setProfile(updatedProfile);
      setUserMe(updatedUser);
      queryClient.setQueryData(myProfileQueryKey(accessToken), updatedProfile);
      queryClient.setQueryData(meQueryKey(accessToken), updatedUser);
      setFormData((prev) => ({
        ...prev,
        fullName: updatedUser?.name || prev.fullName,
        phone: updatedUser?.phone_number || prev.phone,
      }));
    } catch (err) {
      toast.error('Cập nhật thất bại');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Critical: Strip modern color functions before rendering
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            // Force basic colors for anything that might have oklch/lab from Tailwind 4
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.color.includes('lab') || computedStyle.color.includes('oklch')) {
              el.style.color = '#000000';
            }
            if (
              computedStyle.backgroundColor.includes('lab') ||
              computedStyle.backgroundColor.includes('oklch')
            ) {
              el.style.backgroundColor = 'transparent';
            }
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`EDUMEE_Report_${profile?.userId?.name?.replace(/\s+/g, '_') || 'User'}.pdf`);
      toast.success('Báo cáo đã được tải về');
      setActiveModal(null);
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Lỗi khi xuất PDF. Đang mở chế độ in an toàn...');
      // Fallback: Print current view if canvas fails
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'Upgrade AI':
        return (
          <div className="space-y-5 text-zinc-900 dark:text-white">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black tracking-wider text-violet-600 uppercase dark:text-violet-300">
                    Gói hiện tại
                  </p>
                  <h3 className="mt-1 text-xl font-black capitalize">
                    {aiSubscription?.currentPlan || 'free'}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {aiSubscription?.expiresAt
                      ? `Hết hạn ${formatDate(aiSubscription.expiresAt)}`
                      : 'Đang dùng quyền mặc định'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isBillingLoading}
                  onClick={handleRefreshBilling}
                >
                  {isBillingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Làm mới
                </Button>
              </div>
              <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <span>
                  <span className="block font-semibold text-emerald-800 dark:text-emerald-200">Dùng Số dư Edumee</span>
                  <span className="text-emerald-700/80 dark:text-emerald-200/80">
                    Khả dụng {formatCurrency(edumeeCreditAccount?.availableBalance || 0, wallet?.currency || 'VND')}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={useEdumeeCredit}
                  onChange={(event) => setUseEdumeeCredit(event.target.checked)}
                  className="h-5 w-5 accent-emerald-600"
                />
              </label>
            </div>

            {billingBanner ? <BillingReturnBanner banner={billingBanner} /> : null}
            {billingError ? (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{billingError}</span>
              </div>
            ) : null}

            {isBillingLoading && aiPlans.length === 0 ? (
              <div className="flex h-52 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {aiPlans.length > 0 ? (
                  aiPlans.map((plan) => {
                    const selectedCycle =
                      selectedBillingCycles[plan.id] || getDefaultBillingCycle(plan);
                    const pricing = getPricingForCycle(plan, selectedCycle);
                    const planCode = normalizePlanCode(plan.name);
                    const isCurrentPlan =
                      aiSubscription?.subscriptionStatus === 'active' &&
                      activePaidPlanCode === planCode;
                    const ctaLabel = !hasActivePaidPlan
                      ? 'Mua ngay'
                      : isCurrentPlan
                        ? 'Gia hạn'
                        : 'Nâng cấp';
                    const isPurchasing = purchasingPlanId === plan.id;

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          'rounded-2xl border bg-background/70 p-4 shadow-sm',
                          isCurrentPlan
                            ? 'border-violet-400 ring-4 ring-violet-500/10'
                            : 'border-border',
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display text-lg font-black">{plan.name}</h4>
                              {isCurrentPlan ? (
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                                  Đang dùng
                                </span>
                              ) : null}
                            </div>
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                              {plan.description ||
                                'Mở rộng quota và tính năng AI cho hành trình nghề nghiệp.'}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
                            <WalletCards className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-2xl font-black">
                            {formatCurrency(pricing.total, pricing.currency)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {pricing.discountPercentage > 0
                              ? `Tiết kiệm ${pricing.discountPercentage}%`
                              : `${formatCurrency(pricing.monthlyPrice, pricing.currency)} / tháng`}
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {getAllowedBillingCycles(plan).map((cycle) => (
                            <button
                              key={cycle}
                              type="button"
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                                selectedCycle === cycle
                                  ? 'border-violet-600 bg-violet-600 text-white'
                                  : 'border-border bg-background hover:bg-muted',
                              )}
                              onClick={() =>
                                setSelectedBillingCycles((current) => ({
                                  ...current,
                                  [plan.id]: cycle,
                                }))
                              }
                            >
                              {formatBillingCycle(cycle)}
                            </button>
                          ))}
                        </div>

                        <div className="mb-4 grid gap-2 rounded-xl bg-muted/60 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Tạm tính</span>
                            <span className="font-bold">
                              {formatCurrency(pricing.subtotal, pricing.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Giảm giá</span>
                            <span className="font-bold">
                              {formatCurrency(pricing.discountAmount, pricing.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-2">
                            <span className="font-black">Thanh toán</span>
                            <span className="font-black text-violet-600">
                              {formatCurrency(pricing.total, pricing.currency)}
                            </span>
                          </div>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {getPlanFeatureLabels(plan).map((feature) => (
                            <span
                              key={feature}
                              className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>

                        <PlanBenefitDetails plan={plan} className="mb-4" />

                        <Button
                          className="h-11 w-full gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                          disabled={isPurchasing || pricing.total <= 0}
                          onClick={() => {
                            void handleAiPlanPurchase(plan);
                          }}
                        >
                          {isPurchasing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {ctaLabel}
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-6 text-sm md:col-span-2">
                    Chưa có gói Plus hoặc Business khả dụng để mua.
                  </div>
                )}
              </div>
            )}

            {syncingPaymentId ? (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang đồng bộ thanh toán {syncingPaymentId}
              </div>
            ) : null}

            {aiPayments.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <h4 className="mb-3 text-sm font-black">Thanh toán gần đây</h4>
                <div className="space-y-2">
                  {aiPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-bold">
                          {payment.checkoutReference || payment.id}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDate(payment.createdAt)} · {formatBillingCycle(payment.billingCycle)}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="font-bold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[10px] font-black',
                            getPaymentStatusClassName(payment.status),
                          )}
                        >
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'Thông tin tài khoản':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Họ và tên</label>
              <input
                type="text"
                value={formData.fullName}
                readOnly
                className="border-input bg-muted text-muted-foreground w-full cursor-not-allowed rounded-xl border px-4 py-2 text-sm outline-none"
              />
              <p className="text-muted-foreground text-[10px] italic">
                * Tên được quản lý bởi hệ thống đăng ký
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Email</label>
              <input
                type="email"
                value={profile?.userId?.email || ''}
                readOnly
                className="border-input bg-muted text-muted-foreground w-full cursor-not-allowed rounded-xl border px-4 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Số điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="VD: 0987654321"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Thành phố</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="VD: Hà Nội"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Trình độ học vấn</label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                className="border-input bg-background text-foreground w-full appearance-none rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="">Chọn trình độ</option>
                <option value="elementary">Tiểu học</option>
                <option value="middle_school">THCS</option>
                <option value="high_school">THPT</option>
                <option value="college">Cao đẳng</option>
                <option value="bachelor">Đại học</option>
                <option value="master">Thạc sĩ</option>
                <option value="phd">Tiến sĩ</option>
                <option value="vocational">Trung cấp nghề</option>
                <option value="certificate">Chứng chỉ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Giới thiệu bản thân</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Chia sẻ một chút về đam mê của bạn..."
                className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isSaving}
              className="mt-4 h-11 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
            </Button>
          </div>
        );

      case 'Xuất báo cáo PDF':
        return (
          <div className="space-y-6 py-4 text-center text-zinc-900 dark:text-white">
            <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <FileText className="text-primary h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xuất báo cáo hướng nghiệp</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Hệ thống sẽ tổng hợp kết quả phân tích AI và thông tin lộ trình của bạn vào một file
                PDF chuyên nghiệp.
              </p>
            </div>

            <div className="border-border bg-muted/30 rounded-xl border p-4 text-left">
              <p className="text-muted-foreground mb-2 text-[11px] font-bold tracking-wider uppercase">
                Thông tin bao gồm:
              </p>
              <ul className="space-y-1.5">
                {[
                  'Hồ sơ năng lực cá nhân',
                  'Phân tích Top 3 ngành nghề phù hợp',
                  'Lộ trình học tập chi tiết từ AI',
                  'Dự báo xu hướng thị trường 2026',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={exportPDF}
              disabled={isExporting || results.length === 0}
              className="h-11 w-full gap-2 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang khởi tạo PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {results.length > 0 ? 'Tải xuống ngay' : 'Chưa có dữ liệu kết quả'}
                </>
              )}
            </Button>
            {results.length === 0 && (
              <p className="text-[10px] text-red-500 italic">
                Bạn cần thực hiện bài trắc nghiệm để có dữ liệu xuất báo cáo.
              </p>
            )}
          </div>
        );

      case 'Giao diện':
        if (!mounted) return null;
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="grid grid-cols-3 gap-3">
              {['light', 'dark', 'system'].map((t) => (
                <div
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all duration-200 ${currentTheme === t ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-zinc-200 hover:border-violet-400 dark:border-zinc-700'}`}
                >
                  <div
                    className={`mx-auto mb-2 h-8 w-8 rounded-full border shadow-sm ${
                      t === 'light'
                        ? 'bg-white'
                        : t === 'dark'
                          ? 'bg-zinc-800'
                          : 'bg-linear-to-tr from-zinc-200 to-zinc-700'
                    }`}
                  ></div>
                  <span
                    className={`text-sm font-medium capitalize ${currentTheme === t ? 'text-violet-600' : 'text-zinc-500'}`}
                  >
                    {t === 'light' ? 'Sáng' : t === 'dark' ? 'Tối' : 'Hệ thống'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Cài đặt':
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-base font-black">Thông báo realtime</h4>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-black uppercase',
                          realtimeAlertsEnabled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
                        )}
                      >
                        {realtimeAlertsEnabled ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Bật/tắt popup và âm thanh khi có thông báo mới. Chuông thông báo vẫn lưu đầy đủ booking,
                      thanh toán và nhắc lịch quan trọng.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={realtimeAlertsEnabled}
                  onCheckedChange={setRealtimeAlertsEnabled}
                  aria-label="Bật hoặc tắt thông báo realtime"
                />
              </div>
            </div>
          </div>
        );

      case MENTOR_PROFILE_EDIT_MODAL:
      case MENTOR_PROFILE_CREATE_MODAL:
        return (
          <MentorProfileEditorForm
            form={mentorProfileForm}
            isSaving={isSavingMentorProfile}
            mode={mentorSummary.profile ? 'edit' : 'create'}
            onChange={setMentorProfileForm}
            onCancel={() => setActiveModal(null)}
            onSubmit={handleSaveMentorProfile}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-900 dark:text-white">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
              <Settings className="h-10 w-10 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold">Chức năng đang phát triển</h3>
            <p className="mt-2 max-w-62.5 text-sm text-zinc-500 dark:text-zinc-400">
              Tính năng này sẽ sớm được cập nhật trong phiên bản tiếp theo.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const displayName = userMe?.name || profile?.userId?.name || 'Người dùng Edumee';
  const avatarSrc = avatarPreviewUrl || userMe?.avatar || '';
  const shouldRenderAvatarImage = Boolean(avatarSrc) && !avatarLoadFailed;
  const roleLabel = getProfileRoleLabel(userMe?.role || role);
  const educationLevelLabel = getEducationLevelLabel(profile?.educationLevel);
  const profileSubtitle = profile?.city?.trim() || '';
  const roleProfile = getRoleProfile(userMe?.role || role);
  const isLearnerProfile = roleProfile === 'user';
  const isMentorProfile = roleProfile === 'mentor';
  const isAdminProfile = roleProfile === 'admin';

  return (
    <div className="relative min-h-screen pb-20">
      {/* Hidden Report for PDF Export */}
      <div className="fixed top-0 -left-750 overflow-hidden">
        <div
          ref={reportRef}
          className="min-h-[297mm] w-[210mm] bg-white p-12 font-sans text-zinc-950"
          style={{ colorScheme: 'light', background: '#ffffff', color: '#000000' }}
        >
          <div
            className="mb-8 flex items-start justify-between pb-8"
            style={{ borderBottom: '2px solid #7c3aed' }}
          >
            <div>
              <h1 className="mb-2 text-4xl font-black" style={{ color: '#7c3aed' }}>
                EDUMEE
              </h1>
              <p
                className="text-sm font-bold tracking-widest uppercase"
                style={{ color: '#000000' }}
              >
                Career Guidance Analysis Report
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-500">
                DATE: {new Date().toLocaleDateString('vi-VN')}
              </p>
              <p className="text-xs font-bold text-zinc-500">
                ID: #{profile?.id?.slice(-8).toUpperCase() || 'N/A'}
              </p>
            </div>
          </div>

          <div className="mb-12 grid grid-cols-2 gap-8">
            <div
              className="rounded-2xl border border-zinc-200 p-6"
              style={{ background: '#f9fafb' }}
            >
              <h3 className="mb-4 text-lg font-bold" style={{ color: '#6d28d9' }}>
                Thông tin cá nhân
              </h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Họ tên:</strong> {profile?.userId?.name || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {profile?.userId?.email || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Thành phố:</strong> {profile?.city || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Trình độ:</strong> {educationLevelLabel || 'N/A'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl p-6 text-white shadow-xl" style={{ background: '#7c3aed' }}>
              <h3 className="mb-2 text-lg font-bold">Tổng kết sự nghiệp</h3>
              <p className="text-xs leading-relaxed italic opacity-90">
                &quot;
                {profile?.bio ||
                  'Hành trình khám phá tương lai bắt đầu từ những lựa chọn đúng đắn hôm nay.'}
                &quot;
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-black">
              <Target className="h-6 w-6" style={{ color: '#7c3aed' }} />
              TOP 3 NGÀNH NGHỀ PHÙ HỢP NHẤT
            </h3>
            <div className="space-y-6">
              {results.slice(0, 3).map((res, i) => (
                <div key={i} className="py-2 pl-6" style={{ borderLeft: '4px solid #7c3aed' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-lg font-bold">
                      {i + 1}. {res.careerTitle}
                    </h4>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-black"
                      style={{ background: '#ede9fe', color: '#6d28d9' }}
                    >
                      ĐỘ PHÙ HỢP: {Math.round(res.overallFitScore || 0)}%
                    </span>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-600">{res.aiExplanation}</p>
                  <div className="flex flex-wrap gap-2">
                    {res.strengths?.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-100 pt-12 text-center">
            <p className="text-[10px] font-medium text-zinc-400">
              Báo cáo được tạo tự động bởi Hệ thống Hướng nghiệp Thông minh Edumee AI
            </p>
            <p className="text-[10px] text-zinc-400 italic">
              © 2026 EDUMEE - Bản quyền thuộc về đội ngũ phát triển Edumee Team
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-card">
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="relative">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className="bg-gradient-hero shadow-primary/20 flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl text-3xl shadow-xl"
              >
                {shouldRenderAvatarImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt="Ảnh đại diện"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <span className="text-2xl font-black text-white">{getInitials(displayName)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow-md transition-transform hover:scale-110 dark:border-zinc-900"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarSelect}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-bold">
                {displayName}
              </h1>
              <p className="text-muted-foreground text-sm">
                {profileSubtitle || 'Hoàn thiện hồ sơ để Edumee cá nhân hóa tốt hơn'}
              </p>
              <div className="mt-1 flex gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black tracking-wider uppercase">
                  {roleLabel}
                </Badge>
                {educationLevelLabel ? (
                  <Badge className="border-emerald-400/20 bg-emerald-400/10 text-[10px] font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    {educationLevelLabel}
                  </Badge>
                ) : null}
              </div>
              {/* Avatar is uploaded immediately on select */}
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => openModal('Giao diện')}>
                <Palette className="h-4 w-4" />
                Giao diện
              </Button>
              {isLearnerProfile ? (
                <>
                  <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => openModal('Xuất báo cáo PDF')}>
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button type="button" variant="hero" className="gap-2 rounded-xl" onClick={() => openModal('Upgrade AI')}>
                    <Sparkles className="h-4 w-4" />
                    Upgrade AI
                  </Button>
                </>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-4">
        {isLearnerProfile ? (
          <>
            <CurrentAiPackageCard
              subscription={aiSubscription}
              quotaSummary={currentQuotaSummary}
              isLoading={isBillingLoading}
              error={billingError}
              onUpgrade={() => openModal('Upgrade AI')}
              onRefresh={handleRefreshBilling}
            />
            {billingBanner ? <BillingReturnBanner banner={billingBanner} /> : null}
          </>
        ) : null}

        {isLearnerProfile ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 sm:grid-cols-3"
          >
            {[
              { icon: Clock, label: 'Streak', value: '1' },
              { icon: Target, label: 'Lộ trình', value: results.length > 0 ? '1' : '0' },
              {
                icon: Award,
                label: 'Phù hợp',
                value: results.length > 0 ? `${Math.round(results[0]?.overallFitScore || 0)}%` : '0%',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass-card border-border/40 rounded-xl p-4 text-center"
              >
                <stat.icon className="text-primary mx-auto mb-1 h-5 w-5" />
                <div className="text-lg font-black tracking-tight">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        ) : null}

        {profile?.bio && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card text-muted-foreground border-primary rounded-2xl border-l-4 p-4 text-sm italic"
          >
            &quot;{profile.bio}&quot;
          </motion.div>
        )}

        {isMentorProfile ? (
          <MentorRoleSection
            summary={mentorSummary}
            isLoading={isRoleSummaryLoading}
            onNavigate={(href) => router.push(href)}
            onEdit={openMentorProfileEditor}
          />
        ) : null}

        {isAdminProfile ? (
          <AdminRoleSection
            summary={adminSummary}
            user={userMe}
            isLoading={isRoleSummaryLoading}
            onNavigate={(href) => router.push(href)}
          />
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <section className="glass-card border-border/40 rounded-2xl p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">Thông tin cá nhân</p>
                <h2 className="font-display mt-1 text-xl font-black">Chỉnh sửa nhanh hồ sơ</h2>
              </div>
              <Badge className="bg-mint/10 text-mint border-mint/20 w-fit text-[10px] font-black uppercase">
                Lưu thủ công
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ProfileField icon={User} label="Họ và tên">
                <input
                  type="text"
                  value={formData.fullName}
                  readOnly
                  className="border-input bg-muted text-muted-foreground w-full cursor-not-allowed rounded-xl border px-4 py-3 text-sm outline-none"
                />
              </ProfileField>
              <ProfileField icon={Mail} label="Email">
                <input
                  type="email"
                  value={profile?.userId?.email || userMe?.email || ''}
                  readOnly
                  className="border-input bg-muted text-muted-foreground w-full cursor-not-allowed rounded-xl border px-4 py-3 text-sm outline-none"
                />
              </ProfileField>
              <ProfileField icon={Phone} label="Số điện thoại">
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="VD: 0987654321"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-primary"
                />
              </ProfileField>
              <ProfileField icon={MapPin} label="Thành phố">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="VD: Hà Nội"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-primary"
                />
              </ProfileField>
              <ProfileField icon={Award} label="Trình độ" className="md:col-span-2">
                <select
                  value={formData.educationLevel}
                  onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                  className="border-input bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Chọn trình độ</option>
                  <option value="elementary">Tiểu học</option>
                  <option value="middle_school">THCS</option>
                  <option value="high_school">THPT</option>
                  <option value="college">Cao đẳng</option>
                  <option value="bachelor">Đại học</option>
                  <option value="master">Thạc sĩ</option>
                  <option value="phd">Tiến sĩ</option>
                  <option value="vocational">Trung cấp nghề</option>
                  <option value="certificate">Chứng chỉ</option>
                  <option value="other">Khác</option>
                </select>
              </ProfileField>
              <ProfileField icon={FileText} label="Giới thiệu bản thân" className="md:col-span-2">
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  placeholder="Chia sẻ mục tiêu, sở thích học tập hoặc điều bạn đang muốn khám phá..."
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2 focus:ring-primary"
                />
              </ProfileField>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">
                Tên và email đang lấy từ tài khoản đăng nhập. Các trường còn lại có thể chỉnh trực tiếp tại đây.
              </p>
              <Button
                type="button"
                onClick={handleUpdateProfile}
                disabled={isSaving}
                variant="hero"
                className="gap-2 rounded-xl"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu thay đổi
              </Button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="glass-card border-border/40 rounded-2xl p-5">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">Tác vụ nhanh</p>
              <div className="mt-4 grid gap-2">
                {isLearnerProfile ? (
                  <>
                    <QuickActionButton icon={WalletCards} label="Upgrade AI" onClick={() => openModal('Upgrade AI')} />
                    <QuickActionButton icon={FileText} label="Xuất báo cáo PDF" onClick={() => openModal('Xuất báo cáo PDF')} />
                  </>
                ) : null}
                {isMentorProfile ? (
                  <>
                    <QuickActionButton icon={CalendarDays} label="Lịch làm việc" onClick={() => router.push('/mentor-dashboard/availability')} />
                    <QuickActionButton icon={Users} label="Booking mentor" onClick={() => router.push('/mentor-dashboard/bookings')} />
                    <QuickActionButton icon={GraduationCap} label="Xem marketplace" onClick={() => router.push('/mentor-matching')} />
                  </>
                ) : null}
                {isAdminProfile ? (
                  <>
                    <QuickActionButton icon={Users} label="Quản lý người dùng" onClick={() => router.push('/admin/users')} />
                    <QuickActionButton icon={GraduationCap} label="Mentor & Booking" onClick={() => router.push('/admin/mentors')} />
                    <QuickActionButton icon={CreditCard} label="Giao dịch" onClick={() => router.push('/admin/finance')} />
                  </>
                ) : null}
                <QuickActionButton icon={Palette} label="Giao diện" onClick={() => openModal('Giao diện')} />
                <QuickActionButton icon={Shield} label="Bảo mật" onClick={() => openModal('Bảo mật')} />
                <QuickActionButton icon={Settings} label="Cài đặt" onClick={() => openModal('Cài đặt')} />
              </div>
            </section>
            <section className="glass-card border-border/40 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black">Hồ sơ Edumee</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Hoàn thiện thông tin giúp AI cá nhân hóa gợi ý nghề nghiệp và mentor tốt hơn.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </motion.div>

        <Button
          variant="outline"
          className="text-destructive border-destructive/20 hover:bg-destructive/5 w-full gap-2 rounded-xl py-6 font-bold shadow-sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất hệ thống
        </Button>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          ></motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              'border-border bg-card relative w-full overflow-hidden rounded-3xl border shadow-2xl',
              activeModal === 'Upgrade AI' ||
                activeModal === MENTOR_PROFILE_EDIT_MODAL ||
                activeModal === MENTOR_PROFILE_CREATE_MODAL
                ? 'max-w-4xl'
                : 'max-w-md',
            )}
          >
            <div className="border-border bg-muted/30 flex items-center justify-between border-b px-6 py-4">
              <h3 className="font-display text-lg font-black tracking-tight">{activeModal}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:bg-muted rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="custom-scrollbar max-h-[80vh] overflow-y-auto p-6">
              {renderModalContent()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

function ProfileField({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('space-y-2', className)}>
      <span className="text-muted-foreground flex items-center gap-2 text-xs font-black tracking-wider uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {children}
    </label>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-primary/5 group flex w-full items-center gap-3 rounded-xl border border-border/50 px-3 py-3 text-left transition-all"
    >
      <span className="bg-muted group-hover:bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg transition-colors">
        <Icon className="text-muted-foreground group-hover:text-primary h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-bold">{label}</span>
    </button>
  );
}

function MentorRoleSection({
  summary,
  isLoading,
  onNavigate,
  onEdit,
}: {
  summary: MentorProfileSummary;
  isLoading: boolean;
  onNavigate: (href: string) => void;
  onEdit: (profile: TutorProfile | null) => void;
}) {
  const profile = summary.profile;
  const activeBookings = summary.bookings.filter((booking) => isActiveMentorBooking(booking)).length;
  const rate = profile?.pricing?.sessionRates?.[0];
  const rating = profile?.performanceMetrics?.ratings?.averageRating;
  const reviewCount = profile?.performanceMetrics?.ratings?.totalReviews || 0;
  const careerExpertise = profile?.mentoringExpertise?.careerExpertise || [];
  const skillExpertise = profile?.mentoringExpertise?.skillExpertise || [];

  return (
    <motion.section
      id="mentor-profile"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border-border/40 scroll-mt-24 rounded-2xl p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">
              Hồ sơ mentor
            </p>
            <h2 className="font-display mt-1 text-xl font-black">
              {profile?.professionalBackground?.currentPosition || 'Thiết lập hồ sơ mentor'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {profile
                ? `${profile.professionalBackground?.company || 'Independent'} · ${profile.professionalBackground?.yearsOfExperience || 0} năm kinh nghiệm`
                : 'Hoàn thiện thông tin chuyên môn để xuất hiện trong marketplace.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile ? (
            <Badge className={cn('w-fit border text-[10px] font-black uppercase', getMentorStatusClassName(profile.status))}>
              {getMentorStatusLabel(profile.status)}
            </Badge>
          ) : null}
          <Button
            type="button"
            variant={profile ? 'outline' : 'hero'}
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => onEdit(profile || null)}
          >
            <Save className="h-4 w-4" />
            {profile ? 'Chỉnh sửa hồ sơ mentor' : 'Tạo hồ sơ mentor'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex h-28 items-center justify-center rounded-xl border border-dashed">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
        </div>
      ) : summary.error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{summary.error}</span>
        </div>
      ) : !profile ? (
        <div className="mt-5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Bạn chưa có hồ sơ mentor đang hoạt động.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Tạo hồ sơ chuyên môn, chờ admin duyệt rồi mở lịch tư vấn công khai.
          </p>
          <Button className="mt-4 gap-2 rounded-xl" variant="hero" onClick={() => onEdit(null)}>
            <Save className="h-4 w-4" />
            Tạo hồ sơ mentor
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RoleMetric icon={Briefcase} label="Kinh nghiệm" value={`${profile.professionalBackground?.yearsOfExperience || 0} năm`} />
            <RoleMetric icon={CalendarDays} label="Booking active" value={String(activeBookings)} />
            <RoleMetric icon={CreditCard} label="Giá phiên" value={rate ? formatCurrency(rate.pricePerSession, profile.pricing?.currency) : '--'} />
            <RoleMetric icon={Star} label="Đánh giá" value={rating ? `${rating.toFixed(1)} (${reviewCount})` : 'Chưa có'} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">Chuyên môn nghề</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {careerExpertise.length > 0 ? (
                  careerExpertise.slice(0, 6).map((item) => (
                    <Badge key={`${item.careerId}-${item.careerTitle}`} variant="secondary" className="rounded-full">
                      {item.careerTitle}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa khai báo nghề chuyên môn.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">Kỹ năng mentor</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {skillExpertise.length > 0 ? (
                  skillExpertise.slice(0, 8).map((item) => (
                    <Badge key={item.skillName} variant="outline" className="rounded-full">
                      {item.skillName}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa khai báo kỹ năng mentor.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="hero" className="gap-2 rounded-xl" onClick={() => onNavigate('/mentor-dashboard/availability')}>
              <CalendarDays className="h-4 w-4" />
              Quản lý lịch
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onNavigate('/mentor-dashboard/bookings')}>
              <Users className="h-4 w-4" />
              Xem booking
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onNavigate('/mentor-matching')}>
              <ExternalLink className="h-4 w-4" />
              Marketplace
            </Button>
          </div>
        </>
      )}
    </motion.section>
  );
}

function AdminRoleSection({
  summary,
  user,
  isLoading,
  onNavigate,
}: {
  summary: AdminProfileSummary;
  user: UserMe | null;
  isLoading: boolean;
  onNavigate: (href: string) => void;
}) {
  const stats = summary.stats?.stats || [];
  const recentActivities = summary.stats?.recentActivities || [];

  return (
    <motion.section
      id="admin-profile"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border-border/40 scroll-mt-24 rounded-2xl p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">
              Hồ sơ quản trị
            </p>
            <h2 className="font-display mt-1 text-xl font-black">{user?.name || 'Admin Edumee'}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {user?.email || 'Tài khoản quản trị'} · {user?.login_type || 'Password'}
            </p>
          </div>
        </div>
        <Badge className="w-fit border-violet-400/20 bg-violet-400/10 text-[10px] font-black text-violet-700 uppercase dark:text-violet-200">
          Quyền admin
        </Badge>
      </div>

      {isLoading ? (
        <div className="mt-6 flex h-28 items-center justify-center rounded-xl border border-dashed">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
        </div>
      ) : summary.error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{summary.error}</span>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.slice(0, 4).map((item) => (
              <RoleMetric key={item.title} icon={BarChart3} label={item.title} value={item.value} helper={item.delta} />
            ))}
            {stats.length === 0 ? (
              <>
                <RoleMetric icon={Shield} label="Vai trò" value="Admin" />
                <RoleMetric icon={CheckCircle2} label="Trạng thái" value="Hoạt động" />
              </>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">Hoạt động quản trị gần đây</p>
              <div className="mt-3 space-y-3">
                {summary.auditLogs.length > 0 ? (
                  summary.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                      <History className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{actionLabel(log.action)}</p>
                        <p className="text-muted-foreground text-xs">
                          {log.resource} · {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : recentActivities.length > 0 ? (
                  recentActivities.slice(0, 4).map((activity) => (
                    <div key={`${activity.title}-${activity.time}`} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                      <History className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold">{activity.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {activity.user} · {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa có hoạt động quản trị gần đây.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">Lối tắt quản trị</p>
              <div className="mt-3 grid gap-2">
                <QuickActionButton icon={Users} label="Người dùng" onClick={() => onNavigate('/admin/users')} />
                <QuickActionButton icon={GraduationCap} label="Mentor & Booking" onClick={() => onNavigate('/admin/mentors')} />
                <QuickActionButton icon={CreditCard} label="Giao dịch" onClick={() => onNavigate('/admin/finance')} />
                <QuickActionButton icon={Settings} label="Cài đặt hệ thống" onClick={() => onNavigate('/admin/settings')} />
              </div>
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}

function RoleMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-4">
      <Icon className="text-primary mb-2 h-4 w-4" />
      <p className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
      {helper ? <p className="text-muted-foreground mt-1 text-xs">{helper}</p> : null}
    </div>
  );
}

function CurrentAiPackageCard({
  subscription,
  quotaSummary,
  isLoading,
  error,
  onUpgrade,
  onRefresh,
}: {
  subscription: MyAiSubscription | null;
  quotaSummary: Array<{ label: string; quota: QuotaView }>;
  isLoading: boolean;
  error: string;
  onUpgrade: () => void;
  onRefresh: () => void;
}) {
  const currentPlan = subscription?.currentPlan || 'free';
  const isPaid = subscription?.subscriptionStatus === 'active' && currentPlan !== 'free';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border-border/40 rounded-2xl p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-black tracking-wider uppercase">
              AI package
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-black capitalize">{currentPlan}</h2>
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[10px] font-black uppercase',
                  isPaid
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
                )}
              >
                {isPaid ? 'Active' : 'Free'}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {subscription?.expiresAt
                ? `Hết hạn ${formatDate(subscription.expiresAt)} · ${formatBillingCycle(subscription.billingCycle)}`
                : 'Chưa có subscription trả phí'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled={isLoading} onClick={onRefresh}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </Button>
          <Button className="gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700" onClick={onUpgrade}>
            <CreditCard className="h-4 w-4" />
            Upgrade AI
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-primary/5 p-3">
          <p className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
            Trạng thái
          </p>
          <p className="mt-1 text-sm font-black">
            {subscription?.subscriptionStatus === 'active' ? 'Đang hoạt động' : 'Mặc định'}
          </p>
        </div>
        <div className="rounded-xl bg-secondary/5 p-3">
          <p className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
            Chu kỳ
          </p>
          <p className="mt-1 text-sm font-black">
            {formatBillingCycle(subscription?.billingCycle) || 'Free'}
          </p>
        </div>
        <div className="rounded-xl bg-mint/10 p-3">
          <p className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
            Quota gói AI
          </p>
          <div className="mt-1 space-y-1">
            {quotaSummary.length > 0 ? (
              quotaSummary.slice(0, 2).map((item) => (
                <div key={item.label} className="space-y-0.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate">{item.label}</span>
                    <span className="font-black">
                      {formatQuotaUsageLabel(item.quota)}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between gap-2 text-[10px]">
                    <span>{formatQuotaRemainingLabel(item.quota)}</span>
                    <span className="text-right">{formatQuotaResetLabel(item.quota)}</span>
                  </div>
                  {formatQuotaOverageLabel(item.quota) ? (
                    <div className="text-[10px] font-semibold text-amber-600">
                      {formatQuotaOverageLabel(item.quota)}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">Theo gói hiện tại</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MentorProfileEditorForm({
  form,
  mode,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: MentorProfileForm;
  mode: 'create' | 'edit';
  isSaving: boolean;
  onChange: (form: MentorProfileForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const updateField = <K extends keyof MentorProfileForm>(field: K, value: MentorProfileForm[K]) => {
    onChange({ ...form, [field]: value });
  };

  const toggleTargetLevel = (value: ExperienceLevel) => {
    const exists = form.targetMenteeLevels.includes(value);
    updateField(
      'targetMenteeLevels',
      exists ? form.targetMenteeLevels.filter((item) => item !== value) : [...form.targetMenteeLevels, value],
    );
  };

  const toggleSessionType = (value: MentorSessionType) => {
    const exists = form.sessionTypes.includes(value);
    updateField('sessionTypes', exists ? form.sessionTypes.filter((item) => item !== value) : [...form.sessionTypes, value]);
  };

  const toggleCommunicationMethod = (value: MentorCommunicationMethod) => {
    const exists = form.communicationMethods.includes(value);
    updateField(
      'communicationMethods',
      exists ? form.communicationMethods.filter((item) => item !== value) : [...form.communicationMethods, value],
    );
  };

  return (
    <div className="space-y-5 text-zinc-900 dark:text-white">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        {mode === 'edit'
          ? 'Bạn có thể chỉnh thông tin chuyên môn, kỹ năng, phiên tư vấn và giá hiển thị trên marketplace. Trạng thái duyệt, level mentor và đánh giá vẫn do hệ thống quản lý.'
          : 'Điền hồ sơ mentor tối thiểu để gửi admin duyệt. Sau khi được duyệt, hồ sơ sẽ xuất hiện công khai trên marketplace.'}
      </div>

      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Nền tảng nghề nghiệp</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <MentorEditorInput
            label="Chức danh"
            value={form.currentPosition}
            placeholder="Ví dụ: Prompt Engineer"
            onChange={(value) => updateField('currentPosition', value)}
          />
          <MentorEditorInput
            label="Công ty"
            value={form.company}
            placeholder="Ví dụ: Edumee"
            onChange={(value) => updateField('company', value)}
          />
          <MentorEditorInput
            label="Số năm kinh nghiệm"
            type="number"
            min={0}
            value={form.yearsOfExperience}
            onChange={(value) => updateField('yearsOfExperience', value)}
          />
          <MentorEditorSelect
            label="Seniority"
            value={form.seniority}
            options={EXPERIENCE_LEVEL_OPTIONS}
            onChange={(value) => updateField('seniority', value as ExperienceLevel)}
          />
        </div>
        <MentorEditorInput
          label="Ngành/lĩnh vực"
          value={form.industries}
          placeholder="AI, Education, Product"
          helper="Nhập nhiều mục, cách nhau bằng dấu phẩy."
          onChange={(value) => updateField('industries', value)}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Chuyên môn nghề</h4>
        <MentorEditorTextarea
          label="Nghề mentor hỗ trợ"
          value={form.careerTitles}
          placeholder="AI Engineer, Product Manager"
          helper="Nhập nhiều nghề, cách nhau bằng dấu phẩy."
          onChange={(value) => updateField('careerTitles', value)}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <MentorEditorSelect
            label="Mức kinh nghiệm"
            value={form.careerExperienceLevel}
            options={EXPERIENCE_LEVEL_OPTIONS}
            onChange={(value) => updateField('careerExperienceLevel', value as ExperienceLevel)}
          />
          <MentorEditorInput
            label="Năm trong lĩnh vực"
            type="number"
            min={0}
            value={form.careerYearsInField}
            onChange={(value) => updateField('careerYearsInField', value)}
          />
          <MentorEditorInput
            label="Độ tự tin (1-5)"
            type="number"
            min={1}
            max={5}
            value={form.careerConfidenceLevel}
            onChange={(value) => updateField('careerConfidenceLevel', value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Kỹ năng mentor</h4>
        <MentorEditorTextarea
          label="Kỹ năng"
          value={form.skillNames}
          placeholder="API for AI, A/B Testing, Product Strategy"
          helper="Nhập nhiều kỹ năng, cách nhau bằng dấu phẩy."
          onChange={(value) => updateField('skillNames', value)}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <MentorEditorSelect
            label="Nhóm kỹ năng"
            value={form.skillCategory}
            options={SKILL_CATEGORY_OPTIONS}
            onChange={(value) => updateField('skillCategory', value as MentorSkillCategory)}
          />
          <MentorEditorInput
            label="Proficiency (1-5)"
            type="number"
            min={1}
            max={5}
            value={form.skillProficiencyLevel}
            onChange={(value) => updateField('skillProficiencyLevel', value)}
          />
          <MentorEditorInput
            label="Năm hướng dẫn"
            type="number"
            min={0}
            value={form.skillTeachingExperience}
            onChange={(value) => updateField('skillTeachingExperience', value)}
          />
        </div>
        <MentorEditorInput
          label="Điểm mạnh"
          value={form.specializations}
          placeholder="Career transition, Interview preparation"
          helper="Nhập nhiều mục, cách nhau bằng dấu phẩy."
          onChange={(value) => updateField('specializations', value)}
        />
        <MentorCheckboxGroup
          label="Mentee phù hợp"
          options={EXPERIENCE_LEVEL_OPTIONS}
          values={form.targetMenteeLevels}
          onToggle={toggleTargetLevel}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Phiên tư vấn</h4>
        <MentorEditorInput
          label="Thời lượng đề xuất"
          value={form.preferredDurations}
          placeholder="60, 90"
          helper="Nhập số phút, cách nhau bằng dấu phẩy."
          onChange={(value) => updateField('preferredDurations', value)}
        />
        <MentorCheckboxGroup
          label="Loại phiên hỗ trợ"
          options={SESSION_TYPE_OPTIONS}
          values={form.sessionTypes}
          onToggle={toggleSessionType}
        />
        <MentorCheckboxGroup
          label="Hình thức giao tiếp"
          options={COMMUNICATION_METHOD_OPTIONS}
          values={form.communicationMethods}
          onToggle={toggleCommunicationMethod}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Giá phiên</h4>
        <div className="grid gap-3 md:grid-cols-3">
          <MentorEditorInput
            label="Currency"
            value={form.currency}
            placeholder="VND"
            onChange={(value) => updateField('currency', value.toUpperCase())}
          />
          <MentorEditorInput
            label="Thời lượng tính giá"
            type="number"
            min={1}
            value={form.sessionDuration}
            onChange={(value) => updateField('sessionDuration', value)}
          />
          <MentorEditorInput
            label="Giá mỗi phiên"
            type="number"
            min={0}
            value={form.pricePerSession}
            onChange={(value) => updateField('pricePerSession', value)}
          />
        </div>
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 p-4">
          <span>
            <span className="block text-sm font-bold">Có phiên miễn phí</span>
            <span className="text-xs text-muted-foreground">Dùng để mentor cho phép trải nghiệm miễn phí nếu sau này marketplace hỗ trợ.</span>
          </span>
          <Switch
            checked={form.freeSessionOffered}
            onCheckedChange={(checked) => updateField('freeSessionOffered', checked)}
            aria-label="Bật hoặc tắt phiên miễn phí"
          />
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel} disabled={isSaving}>
          Hủy
        </Button>
        <Button type="button" variant="hero" className="gap-2 rounded-xl" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu hồ sơ mentor
        </Button>
      </div>
    </div>
  );
}

function MentorEditorInput({
  label,
  helper,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      />
      {helper ? <span className="block text-xs text-muted-foreground">{helper}</span> : null}
    </label>
  );
}

function MentorEditorTextarea({
  label,
  helper,
  onChange,
  ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      />
      {helper ? <span className="block text-xs text-muted-foreground">{helper}</span> : null}
    </label>
  );
}

function MentorEditorSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MentorCheckboxGroup<T extends string>({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                checked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BillingReturnBanner({ banner }: { banner: BillingBanner }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-sm',
        banner.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        banner.tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700',
        banner.tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
        banner.tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-700',
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <div className="font-bold">{banner.title}</div>
        <div className="mt-1">{banner.description}</div>
      </div>
    </div>
  );
}

function createMentorProfileForm(profile: TutorProfile | null): MentorProfileForm {
  const firstCareer = profile?.mentoringExpertise?.careerExpertise?.[0];
  const firstSkill = profile?.mentoringExpertise?.skillExpertise?.[0];
  const firstRate = profile?.pricing?.sessionRates?.[0];
  const sessionTypes = profile?.availability?.sessionPreferences?.sessionTypes?.length
    ? profile.availability.sessionPreferences.sessionTypes
    : profile?.pricing?.sessionRates?.map((rate) => rate.sessionType).filter(Boolean);

  return {
    currentPosition: profile?.professionalBackground?.currentPosition || '',
    company: profile?.professionalBackground?.company || '',
    yearsOfExperience: String(profile?.professionalBackground?.yearsOfExperience ?? 0),
    industries: joinList(profile?.professionalBackground?.industries),
    seniority: profile?.professionalBackground?.seniority || 'mid_level',
    careerTitles: joinList(profile?.mentoringExpertise?.careerExpertise?.map((item) => item.careerTitle)),
    careerExperienceLevel:
      firstCareer?.experienceLevel || profile?.professionalBackground?.seniority || 'mid_level',
    careerYearsInField: String(firstCareer?.yearsInField ?? profile?.professionalBackground?.yearsOfExperience ?? 0),
    careerConfidenceLevel: String(firstCareer?.confidenceLevel ?? 4),
    skillNames: joinList(profile?.mentoringExpertise?.skillExpertise?.map((item) => item.skillName)),
    skillCategory: firstSkill?.skillCategory || 'technical',
    skillProficiencyLevel: String(firstSkill?.proficiencyLevel ?? 4),
    skillTeachingExperience: String(firstSkill?.teachingExperience ?? 1),
    specializations: joinList(profile?.mentoringExpertise?.specializations),
    targetMenteeLevels: profile?.mentoringExpertise?.targetMenteeLevels?.length
      ? profile.mentoringExpertise.targetMenteeLevels
      : ['entry_level', 'mid_level'],
    preferredDurations: joinList(profile?.availability?.sessionPreferences?.preferredDuration || [firstRate?.duration || 60]),
    sessionTypes: sessionTypes?.length ? sessionTypes : ['career_guidance', 'skill_coaching'],
    communicationMethods: profile?.availability?.sessionPreferences?.communicationMethods?.length
      ? profile.availability.sessionPreferences.communicationMethods
      : ['video'],
    currency: profile?.pricing?.currency || 'VND',
    sessionDuration: String(firstRate?.duration ?? profile?.availability?.sessionPreferences?.preferredDuration?.[0] ?? 60),
    pricePerSession: String(firstRate?.pricePerSession ?? 0),
    freeSessionOffered: Boolean(profile?.pricing?.freeSessionOffered),
  };
}

function validateMentorProfileForm(form: MentorProfileForm): string {
  if (!form.currentPosition.trim()) return 'Vui lòng nhập chức danh mentor.';
  if (!form.company.trim()) return 'Vui lòng nhập công ty hoặc tổ chức.';
  if (splitList(form.careerTitles).length === 0) return 'Vui lòng nhập ít nhất một nghề mentor hỗ trợ.';
  if (splitList(form.skillNames).length === 0) return 'Vui lòng nhập ít nhất một kỹ năng mentor.';
  if (form.sessionTypes.length === 0) return 'Vui lòng chọn ít nhất một loại phiên hỗ trợ.';
  if (form.communicationMethods.length === 0) return 'Vui lòng chọn ít nhất một hình thức giao tiếp.';
  if (toNonNegativeNumber(form.sessionDuration, 0) < 1) return 'Thời lượng tính giá phải lớn hơn 0.';
  if (toNonNegativeNumber(form.pricePerSession, -1) < 0) return 'Giá phiên không được âm.';
  return '';
}

function buildMentorProfilePayload(form: MentorProfileForm, currentProfile: TutorProfile | null): ApplyTutorProfilePayload {
  const yearsOfExperience = toNonNegativeNumber(form.yearsOfExperience, 0);
  const careerYearsInField = toNonNegativeNumber(form.careerYearsInField, yearsOfExperience);
  const careerConfidenceLevel = clampNumber(toNonNegativeNumber(form.careerConfidenceLevel, 4), 1, 5);
  const skillProficiencyLevel = clampNumber(toNonNegativeNumber(form.skillProficiencyLevel, 4), 1, 5);
  const skillTeachingExperience = toNonNegativeNumber(form.skillTeachingExperience, 1);
  const sessionDuration = toNonNegativeNumber(form.sessionDuration, 60);
  const pricePerSession = toNonNegativeNumber(form.pricePerSession, 0);
  const preferredDurations = splitNumberList(form.preferredDurations);
  const careerTitles = splitList(form.careerTitles);
  const skillNames = splitList(form.skillNames);
  const existingCareers = currentProfile?.mentoringExpertise?.careerExpertise || [];
  const existingSkills = currentProfile?.mentoringExpertise?.skillExpertise || [];
  const existingProfessionalBackground = currentProfile?.professionalBackground as
    | (TutorProfile['professionalBackground'] & Record<string, unknown>)
    | undefined;
  const existingMentoringExpertise = currentProfile?.mentoringExpertise as
    | (TutorProfile['mentoringExpertise'] & Record<string, unknown>)
    | undefined;
  const existingAvailability = currentProfile?.availability as
    | (TutorProfile['availability'] & Record<string, unknown>)
    | undefined;
  const existingPricing = currentProfile?.pricing as
    | (NonNullable<TutorProfile['pricing']> & Record<string, unknown>)
    | undefined;

  return {
    professionalBackground: {
      ...existingProfessionalBackground,
      currentPosition: form.currentPosition.trim(),
      company: form.company.trim(),
      yearsOfExperience,
      industries: splitList(form.industries),
      seniority: form.seniority,
    },
    mentoringExpertise: {
      ...existingMentoringExpertise,
      careerExpertise: careerTitles.map((careerTitle) => {
        const existing = existingCareers.find((item) => item.careerTitle.toLowerCase() === careerTitle.toLowerCase());
        return {
          careerId: String(existing?.careerId || slugifyForId(careerTitle)),
          careerTitle,
          experienceLevel: form.careerExperienceLevel,
          yearsInField: careerYearsInField,
          confidenceLevel: careerConfidenceLevel,
        };
      }),
      skillExpertise: skillNames.map((skillName) => {
        const existing = existingSkills.find((item) => item.skillName.toLowerCase() === skillName.toLowerCase());
        return {
          skillName,
          skillCategory: existing?.skillCategory || form.skillCategory,
          proficiencyLevel: skillProficiencyLevel,
          teachingExperience: skillTeachingExperience,
        };
      }),
      specializations: splitList(form.specializations),
      targetMenteeLevels: form.targetMenteeLevels.length ? form.targetMenteeLevels : ['entry_level', 'mid_level'],
    },
    availability: {
      ...existingAvailability,
      timeZone: currentProfile?.availability?.timeZone || 'Asia/Ho_Chi_Minh',
      weeklyAvailability: currentProfile?.availability?.weeklyAvailability?.length
        ? currentProfile.availability.weeklyAvailability
        : [
            {
              day: 'saturday',
              timeSlots: [{ startTime: '09:00', endTime: '17:00', available: true }],
            },
          ],
      sessionPreferences: {
        ...currentProfile?.availability?.sessionPreferences,
        preferredDuration: preferredDurations.length ? preferredDurations : [sessionDuration],
        sessionTypes: form.sessionTypes,
        communicationMethods: form.communicationMethods,
      },
    },
    pricing: {
      ...existingPricing,
      currency: form.currency.trim() || 'VND',
      sessionRates: form.sessionTypes.map((sessionType) => ({
        sessionType,
        duration: sessionDuration,
        pricePerSession,
      })),
      freeSessionOffered: form.freeSessionOffered,
    },
  };
}

function splitList(value?: string | string[] | number[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitNumberList(value?: string): number[] {
  return splitList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function joinList(value?: Array<string | number>): string {
  return value?.filter((item) => item !== undefined && item !== null && String(item).trim()).join(', ') || '';
}

function toNonNegativeNumber(value: string, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(numeric, 0);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function slugifyForId(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mentor-career';
}

function getProfileRoleLabel(role?: string): string {
  const normalizedRole = role?.trim().toLowerCase() || 'user';
  return PROFILE_ROLE_LABELS[normalizedRole] || PROFILE_ROLE_LABELS.user;
}

function getRoleProfile(role?: string): RoleProfile {
  const normalizedRole = role?.trim().toLowerCase();
  if (normalizedRole === 'admin') return 'admin';
  if (normalizedRole === 'mentor') return 'mentor';
  return 'user';
}

function getMentorStatusLabel(status?: string): string {
  switch (status) {
    case 'active':
      return 'Đang hoạt động';
    case 'pending_approval':
      return 'Chờ duyệt';
    case 'rejected':
      return 'Bị từ chối';
    case 'suspended':
      return 'Tạm khóa';
    case 'inactive':
      return 'Tạm ẩn';
    default:
      return status || 'Chưa có';
  }
}

function getMentorStatusClassName(status?: string): string {
  switch (status) {
    case 'active':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300';
    case 'pending_approval':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-700 dark:text-amber-300';
    case 'rejected':
    case 'suspended':
      return 'border-rose-400/20 bg-rose-400/10 text-rose-700 dark:text-rose-300';
    default:
      return 'border-muted bg-muted text-muted-foreground';
  }
}

function isActiveMentorBooking(booking: BookingSession): boolean {
  return ![
    'completed',
    'cancelled_by_mentee',
    'cancelled_by_mentor',
    'no_show_mentee',
    'no_show_mentor',
  ].includes(booking.status);
}

function getEducationLevelLabel(educationLevel?: string): string | null {
  const normalizedEducationLevel = educationLevel?.trim().toLowerCase();
  if (!normalizedEducationLevel) return null;
  return EDUCATION_LEVEL_LABELS[normalizedEducationLevel] || EDUCATION_LEVEL_LABELS.other;
}

function getInitials(name?: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || [];
  if (parts.length === 0) return 'ED';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(size / 1024, 1).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizePlanCode(planName?: string): string {
  const normalized = planName?.trim().toLowerCase();
  if (normalized === 'business') return 'business';
  if (normalized === 'plus') return 'plus';
  return 'free';
}

function getAllowedBillingCycles(plan: AiPlanCatalogItem): BillingCycle[] {
  if (plan.allowedBillingCycles?.length) return plan.allowedBillingCycles;
  const pricingCycles = Object.keys(plan.pricingByBillingCycle || {}) as BillingCycle[];
  return pricingCycles.length ? pricingCycles : ['monthly'];
}

function getDefaultBillingCycle(plan: AiPlanCatalogItem): BillingCycle {
  return getAllowedBillingCycles(plan)[0] || 'monthly';
}

function getPricingForCycle(plan: AiPlanCatalogItem, cycle: BillingCycle) {
  const serverPricing = plan.pricingByBillingCycle?.[cycle];
  if (serverPricing) return serverPricing;

  const months = BILLING_CYCLE_MONTHS[cycle] || 1;
  const monthlyPrice = Number(plan.price || 0);
  const subtotal = monthlyPrice * months;
  const discountPercentage = Math.min(Math.max(plan.billingCycleDiscounts?.[cycle] || 0, 0), 100);
  const discountAmount = (subtotal * discountPercentage) / 100;
  return {
    billingCycle: cycle,
    months,
    monthlyPrice,
    subtotal,
    discountPercentage,
    discountAmount,
    total: Math.max(subtotal - discountAmount, 0),
    currency: plan.currency || 'VND',
  };
}

function formatBillingCycle(cycle?: BillingCycle | null): string {
  if (!cycle) return '--';
  return BILLING_CYCLE_LABELS[cycle] || cycle;
}

function formatCurrency(amount?: number, currency = 'VND'): string {
  const numericAmount = amount ?? 0;
  if (currency.toUpperCase() === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(numericAmount)} đ`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatDate(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatQuotaUsageLabel(quota: QuotaView): string {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return 'Không giới hạn';
  return `${getVisibleQuotaUsed(quota)}/${quota.limit}`;
}

function formatQuotaRemainingLabel(quota: QuotaView): string {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return 'Không giới hạn';
  return `Còn ${Math.max(0, quota.remaining || 0)} lượt`;
}

function formatQuotaOverageLabel(quota: QuotaView): string | null {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return null;
  const overage = Math.max(0, (quota.used || 0) - quota.limit);
  return overage > 0 ? `Đã vượt ${overage} lượt` : null;
}

function getVisibleQuotaUsed(quota: QuotaView): number {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return Math.max(0, quota.used || 0);
  return Math.min(Math.max(0, quota.used || 0), quota.limit);
}

function formatQuotaResetLabel(quota: QuotaView): string {
  if (quota.resetPolicy === 'lifetime') return 'Không reset theo tháng';
  if (quota.resetPolicy === 'unlimited') return 'Không giới hạn';
  return quota.nextResetAt ? `Làm mới ${formatDate(quota.nextResetAt)}` : 'Làm mới theo chu kỳ';
}

function buildProfileReturnUrls() {
  if (typeof window === 'undefined') return undefined;
  const baseUrl = `${window.location.origin}/profile`;
  return {
    success: `${baseUrl}?payment=success`,
    error: `${baseUrl}?payment=error`,
    cancel: `${baseUrl}?payment=cancel`,
  };
}

function buildPaymentReturnBanner(result: string, payment: PaymentRecord | null): BillingBanner {
  if (payment?.status === 'paid') {
    return {
      tone: 'success',
      title: 'Thanh toán thành công',
      description: 'Gói AI của bạn đã được kích hoạt hoặc gia hạn.',
    };
  }

  if (payment?.status === 'pending') {
    return {
      tone: 'warning',
      title: 'Thanh toán đang chờ xác nhận',
      description: 'SePay chưa trả kết quả cuối cùng. Bạn có thể làm mới lại sau ít phút.',
    };
  }

  if (payment?.status === 'failed' || payment?.status === 'cancelled') {
    return {
      tone: 'error',
      title: 'Thanh toán chưa hoàn tất',
      description: 'Giao dịch chưa được xác nhận. Bạn có thể thử lại khi sẵn sàng.',
    };
  }

  if (payment?.status === 'refunded') {
    return {
      tone: 'warning',
      title: 'Thanh toán đã hoàn tiền',
      description: 'Gói liên quan đến giao dịch này đã được thu hồi.',
    };
  }

  if (result === 'success') {
    return {
      tone: 'info',
      title: 'Đã quay lại từ SePay',
      description: 'Hệ thống đang chờ gateway xác nhận thanh toán.',
    };
  }

  return {
    tone: 'error',
    title: result === 'cancel' ? 'Bạn đã hủy thanh toán' : 'Thanh toán gặp lỗi',
    description: 'Gói AI chưa được kích hoạt. Bạn có thể tạo giao dịch mới trong Profile.',
  };
}

function actionLabel(action: string): string {
  return action
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function showPaymentToast(banner: BillingBanner, toastId: string): void {
  if (banner.tone === 'success') {
    toast.success(banner.title, { id: toastId });
    return;
  }
  if (banner.tone === 'error') {
    toast.error(banner.title, { id: toastId });
    return;
  }
  if (banner.tone === 'warning') {
    toast.warning(banner.title, { id: toastId });
    return;
  }
  toast.info(banner.title, { id: toastId });
}

function getPaymentStatusClassName(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'failed':
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'refunded':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default Profile;

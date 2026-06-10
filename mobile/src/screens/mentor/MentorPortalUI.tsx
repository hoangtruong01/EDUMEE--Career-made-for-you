import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { RADIUS, SPACING } from '../../theme';

export const MENTOR_COLORS = {
  primary: '#2563EB',
  primarySoft: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  foreground: '#0F172A',
  muted: '#475569',
  mutedSoft: '#64748B',
  border: '#D8E0EA',
  borderSoft: '#E2E8F0',
  success: '#16A34A',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
};

const COLORS = MENTOR_COLORS;

export function PortalScreen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  rightAction?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={COLORS.primary} />
          ) : undefined
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Mentor Portal</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightAction}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

export function LoadingState({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.emptyCard}>
      {Icon ? <Icon size={30} color={COLORS.primary} /> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export function InfoCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  color = COLORS.primary,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
  color = COLORS.primary,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.pill, active && { backgroundColor: `${color}33`, borderColor: `${color}88` }]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon: Icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'success';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyle = {
    primary: styles.primaryButton,
    outline: styles.outlineButton,
    danger: styles.dangerButton,
    ghost: styles.ghostButton,
    success: styles.successButton,
  }[variant];
  const textStyle = {
    primary: styles.primaryButtonText,
    outline: styles.outlineButtonText,
    danger: styles.dangerButtonText,
    ghost: styles.outlineButtonText,
    success: styles.primaryButtonText,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.actionButton, variantStyle, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'success' ? '#fff' : COLORS.primary} size="small" />
      ) : Icon ? (
        <Icon size={16} color={(textStyle as TextStyle).color as string} />
      ) : null}
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'numeric' | 'email-address';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedSoft}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

export function MessageBanner({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'danger' | 'success' }) {
  const toneStyle = tone === 'danger' ? styles.messageDanger : tone === 'success' ? styles.messageSuccess : styles.messageNeutral;
  return (
    <View style={[styles.message, toneStyle]}>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 124,
    gap: SPACING.md,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: COLORS.foreground,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: '900',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  metricCard: {
    width: '48.5%',
    minHeight: 112,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  metricValue: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  sectionTitle: {
    gap: 2,
  },
  sectionTitleText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionMeta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  pill: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  pillTextActive: {
    color: COLORS.primary,
  },
  actionButton: {
    minHeight: 40,
    borderRadius: RADIUS.md,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  successButton: {
    backgroundColor: COLORS.success,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
  },
  ghostButton: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: COLORS.dangerSoft,
  },
  disabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.foreground,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  textarea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  message: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
  },
  messageNeutral: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.border,
  },
  messageDanger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: '#FECACA',
  },
  messageSuccess: {
    backgroundColor: COLORS.successSoft,
    borderColor: '#BBF7D0',
  },
  messageText: {
    color: COLORS.foreground,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});

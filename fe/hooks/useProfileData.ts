'use client';

import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import {
  aiBillingService,
  type AiPlanCatalogItem,
  type MyAiSubscription,
  type PaymentRecord,
} from '@/lib/ai-billing.service';
import { assessmentService, type CareerFitResult } from '@/lib/assessment.service';
import { profileService, type UserProfile } from '@/lib/profile.service';
import { userService, type UserMe } from '@/lib/user.service';
import { walletService, type WalletAccount } from '@/lib/wallet.service';
import { useQuery } from '@tanstack/react-query';

export type AiBillingData = {
  catalog: AiPlanCatalogItem[];
  subscription: MyAiSubscription;
  payments: PaymentRecord[];
  wallet: WalletAccount | null;
};

export const meQueryKey = (accessToken: string) => ['me', accessToken] as const;
export const myProfileQueryKey = (accessToken: string) => ['myProfile', accessToken] as const;
export const careerFitResultsQueryKey = (accessToken: string) => ['careerFitResults', accessToken] as const;
export const aiBillingQueryKey = (accessToken: string) => ['aiBilling', accessToken] as const;

export async function fetchMyProfile(accessToken: string): Promise<UserProfile | null> {
  try {
    return await profileService.getMyProfile(accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function fetchCareerFitResults(accessToken: string): Promise<CareerFitResult[]> {
  return assessmentService.getMyResults(accessToken).catch(() => []);
}

export async function fetchAiBillingData(accessToken: string): Promise<AiBillingData> {
  const [catalog, subscription, payments, wallet] = await Promise.all([
    aiBillingService.getCatalog(),
    aiBillingService.getMyAiSubscription(accessToken),
    aiBillingService.getMyPayments(accessToken),
    walletService.getMine(accessToken),
  ]);

  return {
    catalog,
    subscription,
    payments,
    wallet,
  };
}

function useAuthenticatedQueryEnabled(enabled: boolean) {
  const { accessToken, isAuthenticated, isHydrated } = useAuth();

  return {
    accessToken,
    enabled: enabled && isHydrated && isAuthenticated && Boolean(accessToken),
  };
}

export function useMeQuery(enabled = true) {
  const authQuery = useAuthenticatedQueryEnabled(enabled);

  return useQuery<UserMe>({
    queryKey: meQueryKey(authQuery.accessToken),
    queryFn: () => userService.getMe(authQuery.accessToken),
    enabled: authQuery.enabled,
  });
}

export function useMyProfileQuery(enabled = true) {
  const authQuery = useAuthenticatedQueryEnabled(enabled);

  return useQuery<UserProfile | null>({
    queryKey: myProfileQueryKey(authQuery.accessToken),
    queryFn: () => fetchMyProfile(authQuery.accessToken),
    enabled: authQuery.enabled,
  });
}

export function useCareerFitResultsQuery(enabled = true) {
  const authQuery = useAuthenticatedQueryEnabled(enabled);

  return useQuery<CareerFitResult[]>({
    queryKey: careerFitResultsQueryKey(authQuery.accessToken),
    queryFn: () => fetchCareerFitResults(authQuery.accessToken),
    enabled: authQuery.enabled,
  });
}

export function useAiBillingQuery(enabled = true) {
  const authQuery = useAuthenticatedQueryEnabled(enabled);

  return useQuery<AiBillingData>({
    queryKey: aiBillingQueryKey(authQuery.accessToken),
    queryFn: () => fetchAiBillingData(authQuery.accessToken),
    enabled: authQuery.enabled,
  });
}

export function useProfileData() {
  const { role } = useAuth();
  const isLearner = role === 'user';
  const meQuery = useMeQuery();
  const myProfileQuery = useMyProfileQuery();
  const careerFitResultsQuery = useCareerFitResultsQuery(isLearner);
  const aiBillingQuery = useAiBillingQuery(isLearner);

  return {
    meQuery,
    myProfileQuery,
    careerFitResultsQuery,
    aiBillingQuery,
  };
}

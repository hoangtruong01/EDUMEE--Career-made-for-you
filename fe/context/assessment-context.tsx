'use client';

import { useAuth } from '@/context/auth-context';
import { assessmentService } from '@/lib/assessment.service';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AssessmentContextValue {
  hasAssessmentResult: boolean;
  isAssessmentLoading: boolean;
  refreshAssessmentResult: () => Promise<void>;
  markHasAssessmentResult: () => void;
}

const AssessmentContext = createContext<AssessmentContextValue | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated, isHydrated } = useAuth();
  const [hasAssessmentResult, setHasAssessmentResult] = useState(false);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);

  const refreshAssessmentResult = useCallback(async () => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setHasAssessmentResult(false);
      setIsAssessmentLoading(false);
      return;
    }

    setIsAssessmentLoading(true);
    try {
      const hasResult = await assessmentService.hasAssessmentResult(accessToken);
      setHasAssessmentResult(hasResult);
    } catch {
      setHasAssessmentResult(false);
    } finally {
      setIsAssessmentLoading(false);
    }
  }, [accessToken, isAuthenticated, isHydrated]);

  const markHasAssessmentResult = useCallback(() => {
    setHasAssessmentResult(true);
  }, []);

  useEffect(() => {
    void refreshAssessmentResult();
  }, [refreshAssessmentResult]);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      hasAssessmentResult,
      isAssessmentLoading,
      refreshAssessmentResult,
      markHasAssessmentResult,
    }),
    [hasAssessmentResult, isAssessmentLoading, refreshAssessmentResult, markHasAssessmentResult],
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const context = useContext(AssessmentContext);

  if (!context) {
    throw new Error('useAssessment must be used inside AssessmentProvider');
  }

  return context;
}

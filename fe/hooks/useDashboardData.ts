// src/hooks/useDashboardData.ts
import { useAuth } from '@/context/auth-context';
import { dashboardService } from '@/lib/dashboard.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useDashboardData = () => {
  // Fix: Lấy trực tiếp accessToken từ useAuth() thay vì lấy qua session
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: () => dashboardService.getDashboardData(accessToken || ''),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCancelRoadmap = () => {
  // Fix: Lấy trực tiếp accessToken từ useAuth()
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roadmapId: string) =>
      dashboardService.cancelActiveRoadmap(accessToken || '', roadmapId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể hủy lộ trình lúc này');
    },
  });
};

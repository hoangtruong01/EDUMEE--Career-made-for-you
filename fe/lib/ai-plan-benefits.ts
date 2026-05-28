import type { AiPlanCatalogItem } from '@/lib/ai-billing.service';

export type AiPlanBenefitGroup = {
  title: string;
  items: string[];
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function addIfPresent(items: string[], condition: boolean, label: string): void {
  if (condition) items.push(label);
}

export function getPlanFeatureLabels(plan: AiPlanCatalogItem): string[] {
  const features = plan.features || {};
  const limits = plan.limits || {};
  const labels = [
    isPositiveNumber(limits.chatMessagesPerMonth)
      ? `${limits.chatMessagesPerMonth} tin nhắn AI/chu kỳ`
      : features.aiChatbot === true
        ? 'AI chat'
        : null,
    features.careerComparison === true ? 'So sánh 2-3 nghề/lần' : null,
    features.personalizedRoadmap === true ? 'Roadmap cá nhân' : null,
    features.jobSimulation === true ? 'Mô phỏng nghề' : null,
    features.mentorBooking === true ? 'Mentor booking' : null,
    features.teamDashboard === true ? 'Team dashboard' : null,
  ].filter((label): label is string => Boolean(label));

  if (plan.seatLimit) {
    labels.push(`${plan.seatLimit} seat`);
  }

  return labels.length ? labels : ['Tính năng AI mở rộng'];
}

export function getPlanBenefitGroups(plan: AiPlanCatalogItem): AiPlanBenefitGroup[] {
  const features = plan.features || {};
  const limits = plan.limits || {};
  const groups: AiPlanBenefitGroup[] = [];

  const assessmentItems: string[] = [];
  addIfPresent(
    assessmentItems,
    isPositiveNumber(limits.assessmentsPerMonth),
    `${limits.assessmentsPerMonth} lượt đánh giá / chu kỳ`,
  );
  addIfPresent(
    assessmentItems,
    isPositiveNumber(limits.assessmentsLifetimeLimit),
    `${limits.assessmentsLifetimeLimit} lượt đánh giá theo gói`,
  );
  addIfPresent(
    assessmentItems,
    isPositiveNumber(limits.maxCareerRecommendationsPerRun),
    `AI gợi ý tối đa ${limits.maxCareerRecommendationsPerRun} nghề`,
  );
  if (isPositiveNumber(limits.visibleCareerRecommendationsPerRun)) {
    const maxRecommendations = limits.maxCareerRecommendationsPerRun;
    assessmentItems.push(
      isPositiveNumber(maxRecommendations) && limits.visibleCareerRecommendationsPerRun < maxRecommendations
        ? `Mở khóa ${limits.visibleCareerRecommendationsPerRun} nghề đầu tiên`
        : `Mở khóa toàn bộ ${limits.visibleCareerRecommendationsPerRun} nghề gợi ý`,
    );
  }
  if (assessmentItems.length > 0) {
    groups.push({ title: 'Đánh giá & gợi ý nghề', items: assessmentItems });
  }

  const learningItems: string[] = [];
  addIfPresent(
    learningItems,
    isPositiveNumber(limits.chatMessagesPerMonth),
    `${limits.chatMessagesPerMonth} tin nhắn AI / chu kỳ`,
  );
  addIfPresent(
    learningItems,
    features.aiChatbot === true && !isPositiveNumber(limits.chatMessagesPerMonth),
    'AI chat',
  );
  addIfPresent(
    learningItems,
    isPositiveNumber(limits.personalizedRoadmapsPerMonth),
    `${limits.personalizedRoadmapsPerMonth} lộ trình / chu kỳ`,
  );
  addIfPresent(
    learningItems,
    features.personalizedRoadmap === true && !isPositiveNumber(limits.personalizedRoadmapsPerMonth),
    'Roadmap cá nhân',
  );
  addIfPresent(
    learningItems,
    isPositiveNumber(limits.simulationsPerMonth),
    `${limits.simulationsPerMonth} lượt mô phỏng nghề / chu kỳ`,
  );
  addIfPresent(
    learningItems,
    features.jobSimulation === true && !isPositiveNumber(limits.simulationsPerMonth),
    'Mô phỏng nghề',
  );
  if (learningItems.length > 0) {
    groups.push({ title: 'AI học tập', items: learningItems });
  }

  if (features.careerComparison === true) {
    groups.push({
      title: 'So sánh nghề',
      items: [
        'So sánh nghề đã mở khóa từ kết quả assessment',
        'Tối đa 3 nghề trong một lần so sánh',
        'Không giới hạn số lượt so sánh',
      ],
    });
  }

  const mentorTeamItems: string[] = [];
  addIfPresent(
    mentorTeamItems,
    isPositiveNumber(limits.mentorBookingsPerMonth),
    `${limits.mentorBookingsPerMonth} buổi mentor / chu kỳ`,
  );
  addIfPresent(
    mentorTeamItems,
    features.mentorBooking === true && !isPositiveNumber(limits.mentorBookingsPerMonth),
    'Mentor booking',
  );
  addIfPresent(mentorTeamItems, Boolean(plan.seatLimit), `${plan.seatLimit} seat`);
  addIfPresent(mentorTeamItems, features.teamDashboard === true, 'Team dashboard');
  addIfPresent(mentorTeamItems, features.reportExport === true, 'Xuất báo cáo');
  addIfPresent(mentorTeamItems, features.multiUserManagement === true, 'Quản lý nhiều người dùng');
  if (mentorTeamItems.length > 0) {
    groups.push({ title: 'Mentor & team', items: mentorTeamItems });
  }

  return groups;
}

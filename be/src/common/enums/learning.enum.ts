export enum TaskType {
  CODING_CHALLENGE = 'CODING_CHALLENGE',
  CASE_STUDY = 'CASE_STUDY',
  DESIGN_TASK = 'DESIGN_TASK',
  PRESENTATION = 'PRESENTATION',
  ANALYSIS_TASK = 'ANALYSIS_TASK',
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum RoadmapStatus {
  DRAFT = 'DRAFT', // Mới tạo khung, AI đang gen data
  ACTIVE = 'ACTIVE', // Đang học
  PAUSED = 'PAUSED', // Tạm dừng (Giữ nguyên streak nếu có mua tính năng "Bảo vệ chuỗi")
  COMPLETED = 'COMPLETED', // Hoàn thành 100%
  ABANDONED = 'ABANDONED', // Bỏ ngang quá 30 ngày
}

export enum TaskProgressStatus {
  LOCKED = 'LOCKED', // Đang khóa (Chưa tới lượt học)
  IN_PROGRESS = 'IN_PROGRESS', // Đang học
  SUBMITTED = 'SUBMITTED', // Đã nộp bài, đang chờ chấm điểm
  COMPLETED = 'COMPLETED', // Đã hoàn thành (Chấm pass)
  SKIPPED = 'SKIPPED', // Đã bấm bỏ qua
  FAILED = 'FAILED', // Không đạt (Chấm trượt)
}

// Thêm cấu trúc định dạng bài thi biến thiên mới vào cuối tệp tin
export enum TaskFormatType {
  READ = 'READ', // Bài đọc lý thuyết
  QUIZ = 'QUIZ', // Trắc nghiệm 100%
  TEXT = 'TEXT', // Tự luận/Viết code 100%
  HYBRID = 'HYBRID', // Kết hợp (60% trắc nghiệm + 40% tự luận)
}

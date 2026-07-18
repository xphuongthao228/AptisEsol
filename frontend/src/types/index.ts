export type RoleName = 'ADMIN' | 'STUDENT';
export type SkillType = 'LISTENING' | 'SPEAKING' | 'READING' | 'WRITING' | 'GRAMMAR';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT' | 'AUDIO' | 'SPEAKING';
export type TestMode = 'PRACTICE' | 'EXAM';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: unknown;
  timestamp: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  roles: RoleName[];
  enabled: boolean;
  proExpiresAt: string | null;
  accessExpiresAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Skill {
  id: number;
  type: SkillType;
  name: string;
  description: string;
}

export interface Test {
  id: number;
  skillId: number;
  skillName: string;
  title: string;
  description: string;
  durationMinutes: number;
  status: string;
  mode: TestMode;
  questionCount: number;
}

export interface Answer {
  id: number;
  content: string;
  correct: boolean;
  sortOrder: number;
}

export interface Question {
  id: number;
  testId: number;
  type: QuestionType;
  content: string;
  topic: string;
  audioUrl: string;
  scriptText: string;
  explanation: string;
  points: number;
  sortOrder: number;
  answers: Answer[];
}

export interface Submission {
  id: number;
  testId: number;
  testTitle: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
}

export interface Progress {
  skillId: number;
  skillName: string;
  completedTests: number;
  bestScore: number;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface PaymentOrder {
  id: number;
  userEmail: string;
  fullName: string;
  packageLabel: string;
  days: number;
  amount: number;
  paymentCode: string;
  status: PaymentStatus;
  bankId: string;
  accountNo: string;
  accountName: string;
  qrUrl: string;
  createdAt: string;
  paidAt: string | null;
}

export interface RevenueSummary {
  totalRevenue: number;
  thisMonthRevenue: number;
  transactions: number;
  customers: number;
}

export interface SubscriptionResponse {
  active: boolean;
  expiresAt: string | null;
  daysLeft: number;
}

export type NotificationAudience = 'ALL' | 'STUDENT' | 'ADMIN';
export type NotificationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  audience: NotificationAudience;
  level: NotificationLevel;
  active: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

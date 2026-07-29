export type AdminOverview = {
  totalAttempts: number;
  completedAttempts: number;
  totalLeads: number;
  avgScore: number;
  conversionRate: number;
  last7Days: { date: string; attempts: number; leads: number }[];
  disciplines: { discipline: string; answered: number; correct: number; accuracy: number }[];
};

export type AdminLead = {
  id: string;
  firstName: string;
  whatsapp: string;
  email: string | null;
  consent: boolean;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
};

export type AdminQuestion = {
  id: string;
  publicCode: string;
  discipline: string;
  topic: string | null;
  statement: string;
  correctAnswer: boolean;
  difficulty: string;
  isActive: boolean;
  sortOrder: number;
  answered: number;
  correct: number;
  accuracy: number | null;
};

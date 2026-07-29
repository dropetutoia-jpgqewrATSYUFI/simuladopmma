export type PmmaPublicQuestion = {
  id: string;
  publicCode: string;
  discipline: string;
  topic: string | null;
  baseText?: string | null;
  statement: string;
  difficulty: string;
  displayOrder: number;
  isBonus: boolean;
};

export type PmmaCampaignConfig = {
  id: string;
  name: string;
  status: string;
  questionsPerAttempt: number;
  questionsPerDiscipline: number;
  leadCaptureAfterQuestion: number;
  bonusEnabled: boolean;
  offerUrl: string;
  whatsappNumber: string | null;
  pausedMessage: string | null;
};

export type PmmaStartResult = {
  attemptId: string;
  campaign: PmmaCampaignConfig;
  questions: PmmaPublicQuestion[];
  bonusQuestion: PmmaPublicQuestion | null;
  headlineVariant: "A" | "B";
  ctaVariant: "A" | "B";
};

export type PmmaAnswerFeedback = {
  isCorrect: boolean;
  correctAnswer: boolean;
  feedback: string;
  keyPoint: string;
  nextDiscipline: string | null;
};

export type PmmaDisciplineScore = {
  discipline: string;
  correct: number;
  total: number;
  state: "prioridade" | "atencao" | "ponto_forte";
};

export type PmmaReviewItem = {
  publicCode: string;
  discipline: string;
  topic: string | null;
  statement: string;
  selectedAnswer: boolean | null;
  correctAnswer: boolean;
  isCorrect: boolean;
  explanation: string;
  keyPoint: string;
  isBonus: boolean;
};

export type PmmaResult = {
  firstName: string | null;
  correct: number;
  wrong: number;
  total: number;
  percentage: number;
  durationSeconds: number;
  averageSecondsPerQuestion: number;
  bestStreak: number;
  bonusAnswered: boolean;
  bonusCorrect: boolean | null;
  band: { key: string; label: string; text: string };
  disciplines: PmmaDisciplineScore[];
  bestDisciplines: string[];
  worstDisciplines: string[];
  recommendations: string[];
  review: PmmaReviewItem[];
  offerUrl: string;
  whatsappNumber: string | null;
};

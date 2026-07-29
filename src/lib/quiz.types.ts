import type { Tables } from "@/integrations/supabase/types";

export type QuizQuestion = Tables<"quiz_questions"> & {
  options: Tables<"quiz_options">[];
};

export type QuizAttempt = Tables<"quiz_attempts">;
export type QuizAnswer = Tables<"quiz_answers">;
export type QuizResult = Tables<"quiz_results">;
export type Lead = Tables<"leads">;

export type QuizMode = "quiz" | "simulado";

export type QuizSession = {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  answers: Record<string, string>; // question_id -> option_id
};

export type LeadFormData = {
  name: string;
  email: string;
  phone: string;
  city: string;
  consentPrivacy: boolean;
  consentMarketing: boolean;
};

export type ResultSummary = {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  scorePercentage: number;
  estimatedRank: string;
  recommendation: string;
  passed: boolean;
};

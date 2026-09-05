import type { ApiResponse } from "../types/auth";
import type { QuizQuestion, QuizSession, RecommendationResult } from "../types/quiz";
import api from "./client";

export async function startQuiz(language: "en" | "zh"): Promise<QuizSession> {
  const { data } = await api.post<ApiResponse<QuizSession>>("/quiz/sessions", { language });
  return data.data;
}

export async function getQuizQuestions(): Promise<QuizQuestion[]> {
  const { data } = await api.get<ApiResponse<QuizQuestion[]>>("/quiz/questions");
  return data.data;
}

export async function saveQuizAnswers(
  sessionToken: string,
  answers: Record<string, string | string[]>,
): Promise<QuizSession> {
  const { data } = await api.post<ApiResponse<QuizSession>>(
    `/quiz/sessions/${encodeURIComponent(sessionToken)}/answers`,
    { answers },
  );
  return data.data;
}

export async function getRecommendations(sessionToken: string): Promise<RecommendationResult> {
  const { data } = await api.post<ApiResponse<RecommendationResult>>(
    `/quiz/sessions/${encodeURIComponent(sessionToken)}/recommendations`,
  );
  return data.data;
}

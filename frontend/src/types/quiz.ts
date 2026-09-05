export type QuizOption = {
  code: string;
  label_en: string;
  label_zh: string;
};

export type QuizQuestion = {
  code: string;
  question_en: string;
  question_zh: string;
  answer_type: "single" | "multiple";
  options: QuizOption[];
};

export type QuizSession = {
  session_token: string;
  language: "en" | "zh";
  status: string;
};

export type Recommendation = {
  product_id: string;
  product_code: string;
  product_name_en: string;
  product_name_zh: string | null;
  score: number;
  tier: "Excellent" | "Good" | "Potential" | "Do Not Recommend";
  reasons: string[];
};

export type RecommendationResult = {
  session_token: string;
  score_weights: Record<string, number>;
  recommendations: Recommendation[];
  disclaimer_en: string;
  disclaimer_zh: string;
};

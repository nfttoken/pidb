import { useMemo, useState } from "react";
import { Alert, Button, Empty, Result, Segmented, Spin, Tag } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getRecommendations, getQuizQuestions, saveQuizAnswers, startQuiz } from "../../api/quiz";
import type { QuizQuestion, RecommendationResult } from "../../types/quiz";

const tierLabels: Record<string, { en: string; zh: string }> = {
  Excellent: { en: "Best match", zh: "非常匹配" },
  Good: { en: "Great match", zh: "很适合你" },
  Potential: { en: "Worth exploring", zh: "值得了解" },
};

function selectedValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function BeautyQuiz() {
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const sessionQuery = useQuery({ queryKey: ["quiz-session", language], queryFn: () => startQuiz(language) });
  const questionsQuery = useQuery({ queryKey: ["quiz-questions"], queryFn: getQuizQuestions });
  const resultMutation = useMutation({
    mutationFn: async () => {
      const token = sessionQuery.data?.session_token;
      if (!token) throw new Error("Quiz session is not ready");
      await saveQuizAnswers(token, answers);
      return getRecommendations(token);
    },
    onSuccess: setResult,
  });

  const questions = questionsQuery.data ?? [];
  const question: QuizQuestion | undefined = questions[step];
  const currentSelection = selectedValues(question ? answers[question.code] : undefined);
  const isReady = Boolean(sessionQuery.data && questions.length > 0);
  const progress = questions.length ? ((step + 1) / questions.length) * 100 : 0;
  const selectedSummary = useMemo(() => Object.keys(answers).length, [answers]);

  function selectOption(code: string) {
    if (!question) return;
    if (question.answer_type === "single") setAnswers((current) => ({ ...current, [question.code]: code }));
    else setAnswers((current) => {
      const currentValues = selectedValues(current[question.code]);
      const nextValues = currentValues.includes(code) ? currentValues.filter((value) => value !== code) : [...currentValues, code];
      return { ...current, [question.code]: nextValues };
    });
  }

  if (result) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}><Segmented value={language} onChange={(value) => setLanguage(value as "en" | "zh")} options={[{ label: "EN", value: "en" }, { label: "中文", value: "zh" }]} /></div>
        <span className="consumer-kicker">PIDB BEAUTY QUIZ</span>
        <h1 className="consumer-heading">{language === "zh" ? "找到适合你的美妆产品" : "Your beauty match"}</h1>
        <p className="consumer-subheading">{language === "zh" ? "根据你选择的肤质和偏好，为你筛选出值得了解的产品。" : "A shortlist based on the skin type and preferences you selected."}</p>
        {result.recommendations.length === 0 ? <Empty description={language === "zh" ? "暂时没有达到推荐门槛的产品。" : "No products reached the recommendation threshold yet."} /> : (
          <div className="consumer-result-grid" style={{ marginTop: 32 }}>
            {result.recommendations.map((item) => {
              const tier = tierLabels[item.tier] ?? tierLabels.Potential;
              return <article className="consumer-result-item" key={item.product_id}>
                <Tag color={item.tier === "Excellent" ? "green" : "blue"}>{language === "zh" ? tier.zh : tier.en}</Tag>
                <h3>{language === "zh" && item.product_name_zh ? item.product_name_zh : item.product_name_en}</h3>
                <span className="consumer-product-meta">{item.product_code}</span>
                <ul className="consumer-reasons">{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <Link to={`/product/${item.product_id}`}>{language === "zh" ? "查看产品" : "View product"}</Link>
              </article>;
            })}
          </div>
        )}
        <p className="consumer-disclaimer">{language === "zh" ? result.disclaimer_zh : result.disclaimer_en}</p>
        <Button style={{ marginTop: 12 }} onClick={() => { setResult(null); setStep(0); setAnswers({}); }}>{language === "zh" ? "重新测试" : "Retake quiz"}</Button>
      </div>
    );
  }

  if (sessionQuery.isLoading || questionsQuery.isLoading) return <Spin size="large" />;
  if (sessionQuery.isError || questionsQuery.isError || !isReady) return <Alert type="error" showIcon message="The Beauty Quiz is temporarily unavailable." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}><Segmented value={language} onChange={(value) => { setLanguage(value as "en" | "zh"); setStep(0); setAnswers({}); }} options={[{ label: "EN", value: "en" }, { label: "中文", value: "zh" }]} /></div>
      <span className="consumer-kicker">PIDB BEAUTY QUIZ</span>
      <h1 className="consumer-heading">{language === "zh" ? "找到适合你的美妆产品" : "Find your beauty match"}</h1>
      <p className="consumer-subheading">{language === "zh" ? "回答几个问题，发现适合你肤质和需求的产品。" : "Answer a few questions to discover products for your skin and routine."}</p>
      <div className="consumer-panel" style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <span>{language === "zh" ? `问题 ${step + 1} / ${questions.length}` : `Question ${step + 1} of ${questions.length}`}</span>
          <span className="consumer-product-meta">{selectedSummary} {language === "zh" ? "项已选择" : "answered"}</span>
        </div>
        <div className="quiz-progress" aria-label={`${progress}% complete`}><div style={{ width: `${progress}%` }} /></div>
        <h2 style={{ margin: "32px 0 0", color: "#1e2823", fontSize: 26 }}>{language === "zh" ? question?.question_zh : question?.question_en}</h2>
        <p className="consumer-product-meta">{question?.answer_type === "multiple" ? (language === "zh" ? "可多选" : "Select all that apply") : (language === "zh" ? "请选择一项" : "Select one")}</p>
        {question?.options.length ? <div className="quiz-option-grid">{question.options.map((option) => <button className={`quiz-option ${currentSelection.includes(option.code) ? "is-selected" : ""}`} key={option.code} type="button" onClick={() => selectOption(option.code)}>{language === "zh" ? option.label_zh : option.label_en}</button>)}</div> : <Alert style={{ margin: "28px 0" }} type="info" message={language === "zh" ? "这项偏好暂未配置，可直接继续。" : "No options are configured for this preference yet. You can continue."} />}
        <div className="quiz-footer">
          <Button disabled={step === 0} onClick={() => setStep((value) => value - 1)}>{language === "zh" ? "上一步" : "Back"}</Button>
          {step < questions.length - 1 ? <Button type="primary" onClick={() => setStep((value) => value + 1)}>{language === "zh" ? "下一步" : "Next"}</Button> : <Button type="primary" loading={resultMutation.isPending} disabled={selectedSummary === 0} onClick={() => resultMutation.mutate()}>{language === "zh" ? "查看推荐" : "See my matches"}</Button>}
        </div>
        {resultMutation.isError && <Alert style={{ marginTop: 16 }} type="error" showIcon message={language === "zh" ? "推荐暂时无法生成，请稍后重试。" : "We could not generate recommendations. Please try again."} />}
      </div>
      <p className="consumer-disclaimer">{language === "zh" ? "本测试仅用于美妆产品发现和推荐，不构成医疗或皮肤科诊断建议。" : "This quiz is for beauty product discovery only. It is not a medical or dermatological assessment."}</p>
    </div>
  );
}

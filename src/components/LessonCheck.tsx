"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { saveLearningProgress, useLearningProgress } from "@/lib/learning-progress";
import type { Lesson } from "@/lib/learning";
export default function LessonCheck({ lesson, next }: { lesson: Lesson; next?: string }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const progress = useLearningProgress();
  const completed = progress.some((record) => record.id === lesson.slug && record.mode === "lesson");
  return <section className="lesson-check"><p className="eyebrow">اختبر فهمك</p><h2>{lesson.question}</h2><fieldset><legend className="sr-only">اختر إجابة واحدة</legend>{lesson.choices.map((answer, index) => <label key={answer} data-selected={choice === index}><input type="radio" name={lesson.slug} checked={choice === index} onChange={() => { setChoice(index); setChecked(false); }} /><span>{answer}</span></label>)}</fieldset><button className="lab-button lab-button-secondary" disabled={choice === null} onClick={() => setChecked(true)}>تحقّق من الإجابة</button>{checked && <p role="status" className="guided-hint">{choice === lesson.answer ? "صحيح. " : "حاول مجددًا. "}{lesson.explanation}</p>}<div className="guided-actions">{checked && choice === lesson.answer && <button className="lab-button lab-button-primary" onClick={() => saveLearningProgress(lesson.slug, "lesson", `/learn/${lesson.slug}`)}><CheckCircle2 size={16} />{completed ? "اكتمل الدرس" : "علّم الدرس كمكتمل"}</button>}{completed && next && <Link href={`/learn/${next}`} className="lab-button lab-button-secondary">الدرس التالي <ArrowRight size={16} /></Link>}</div><p className="execution-limits">إكمال الدرس إنجاز تعلّم تسجّله بنفسك على هذا الجهاز، ونتائج المختبرات تُتتبّع بشكل منفصل.</p></section>;
}

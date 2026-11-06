"use client";

import { useMemo } from "react";
import { computeAttackSpans } from "@/lib/attack-metadata";
import { AttackSpan } from "@/types";
import { cn } from "@/lib/utils";
import { arSpanLabel } from "@/lib/i18n/ar";

interface Props {
  prompt: string;
  className?: string;
}

const TYPE_META: Record<AttackSpan["type"], { label: string; dot: string }> = {
  injection: { label: "كلمة حقن", dot: "bg-red-500" },
  jailbreak: { label: "محفّز كسر القيود", dot: "bg-orange-500" },
  encoding: { label: "ترميز / تمويه", dot: "bg-purple-500" },
  drift: { label: "علامة انحراف", dot: "bg-blue-500" },
  agent: { label: "إشارة لوكيل / أداة", dot: "bg-emerald-500" },
  leak: { label: "محاولة تسريب التعليمات", dot: "bg-cyan-500" },
  exfiltration: { label: "تهريب بيانات", dot: "bg-rose-500" },
  "output-handling": { label: "سوء معالجة المخرجات (XSS)", dot: "bg-fuchsia-500" },
  agency: { label: "صلاحيات مفرطة", dot: "bg-amber-500" },
  misinformation: { label: "تضليل / اختلاق", dot: "bg-teal-500" },
  rag: { label: "RAG / corpus poisoning", dot: "bg-lime-500" },
  consumption: { label: "استهلاك غير محدود", dot: "bg-sky-500" },
  poisoning: { label: "تسميم البيانات والنموذج", dot: "bg-indigo-500" },
  "supply-chain": { label: "سلسلة الإمداد / الاعتماديات", dot: "bg-violet-500" },
};

export default function AttackVisualizer({ prompt, className }: Props) {
  const spans = useMemo(() => computeAttackSpans(prompt), [prompt]);

  if (!prompt.trim()) return null;

  // Build annotated segments
  const segments: Array<{ text: string; span: AttackSpan | null }> = [];
  let cursor = 0;

  // Merge overlapping spans
  const merged: AttackSpan[] = [];
  for (const span of spans) {
    if (merged.length && span.start < merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, span.end);
    } else {
      merged.push({ ...span });
    }
  }

  for (const span of merged) {
    if (cursor < span.start) {
      segments.push({ text: prompt.slice(cursor, span.start), span: null });
    }
    // find original span for metadata
    const orig = spans.find((s) => s.start === span.start) ?? span;
    segments.push({ text: prompt.slice(span.start, span.end), span: orig });
    cursor = span.end;
  }
  if (cursor < prompt.length) {
    segments.push({ text: prompt.slice(cursor), span: null });
  }

  // Unique types detected
  const detectedTypes = [...new Set(spans.map((s) => s.type))];

  return (
    <div className={cn("rounded-xl border border-slate-700 bg-[#241f1a] p-4", className)}>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span>⚡</span> كاشف أنماط الهجوم
        {spans.length === 0 && (
          <span className="text-slate-600 font-normal normal-case tracking-normal ms-1">
            — لم يُرصد أي نمط بعد
          </span>
        )}
      </div>

      {/* Annotated prompt */}
      <div className="ltr font-mono text-sm bg-slate-900 rounded-lg p-3 border border-slate-700 leading-relaxed whitespace-pre-wrap break-all mb-3">
        {segments.map((seg, i) =>
          seg.span ? (
            <span
              key={i}
              className={cn("relative rounded px-0.5 cursor-default group", seg.span.color)}
              title={arSpanLabel(seg.span.label)}
            >
              {seg.text}
              {/* Tooltip */}
              <span className="absolute -top-7 start-0 z-10 hidden group-hover:block bg-slate-900 border border-slate-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-lg">
                {arSpanLabel(seg.span.label)}
              </span>
            </span>
          ) : (
            <span key={i} className="text-slate-300">
              {seg.text}
            </span>
          )
        )}
      </div>

      {/* Legend */}
      {detectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {detectedTypes.map((type) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={cn("h-2 w-2 rounded-full flex-shrink-0", TYPE_META[type].dot)} />
              {TYPE_META[type].label}
            </div>
          ))}
        </div>
      )}

      {spans.length > 0 && (
        <div className="mt-3 text-xs text-slate-500 border-t border-slate-700 pt-3">
          رُصد {spans.length} نمط · مرّر المؤشر على المظلَّل للتفاصيل
        </div>
      )}
    </div>
  );
}

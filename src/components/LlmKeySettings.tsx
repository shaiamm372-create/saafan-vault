"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, TriangleAlert, X } from "lucide-react";
import {
  type LlmProvider,
  type LlmSettings,
  getLlmSettings,
  saveLlmSettings,
  clearLlmSettings,
} from "@/lib/llm-grading-client";

const PLACEHOLDER: Record<LlmProvider, string> = {
  openai: "sk-...",
  anthropic: "sk-ant-...",
};
const DEFAULT_MODEL_HINT: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
};

export default function LlmKeySettings({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (s: LlmSettings | null) => void;
}) {
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Load saved settings from localStorage when the modal opens (SSR-unsafe,
  // so it runs in an effect rather than a lazy initializer).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const s = getLlmSettings();
    if (s) {
      setProvider(s.provider);
      setApiKey(s.apiKey);
      setModel(s.model ?? "");
      setEnabled(s.enabled);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  function save() {
    const s: LlmSettings = { enabled, provider, apiKey: apiKey.trim(), model: model.trim() || undefined };
    saveLlmSettings(s);
    onSaved?.(s);
    onClose();
  }

  function clear() {
    clearLlmSettings();
    setApiKey("");
    setModel("");
    setEnabled(true);
    onSaved?.(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#241f1a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-white">التقييم المباشر بنموذج حقيقي — مفتاحك الخاص</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-slate-400">
            افتراضيًا، تُقيَّم الهجمات بمطابق أنماط يعمل دون اتصال (بلا حاجة لمفتاح). أضف مفتاحك الخاص ليؤدي نموذج
            حقيقي دور الهدف، ويحكم هل نجح هجومك.
          </p>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            استخدم مفتاحي للتقييم المباشر
          </label>

          <div className="flex gap-2">
            {(["openai", "anthropic"] as LlmProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  provider === p
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">مفتاح API</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={PLACEHOLDER[provider]}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              النموذج <span className="normal-case text-slate-600">(اختياري — الافتراضي {DEFAULT_MODEL_HINT[provider]})</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL_HINT[provider]}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-relaxed">
            <div className="flex items-start gap-2 text-emerald-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                <strong>مفتاحك يبقى في متصفحك.</strong> يُحفظ فقط في التخزين المحلي لهذا المتصفح، ويُرسل
                <strong> مباشرة إلى {provider === "openai" ? "OpenAI" : "Anthropic"}</strong>، فلا يصل أبدًا إلى خوادمنا ولا نراه. والشفرة مفتوحة المصدر لتتحقق بنفسك.
              </span>
            </div>
            <div className="flex items-start gap-2 text-amber-300/90">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                أي شيء في تخزين المتصفح تستطيع قراءته البرامج العاملة في الصفحة. استخدم مفتاحًا بحد إنفاق منخفض (أو مفتاحًا
                مؤقتًا)، واضغط <strong>امسح المفتاح</strong> عند الانتهاء.
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-700 px-5 py-4">
          <button onClick={clear} className="text-sm font-medium text-slate-400 hover:text-red-400">
            امسح المفتاح
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
            >
              إلغاء
            </button>
            <button
              onClick={save}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-emerald-400"
            >
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

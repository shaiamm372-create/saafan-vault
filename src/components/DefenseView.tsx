"use client";

import { Challenge, AttackResult } from "@/types";
import { ATTACK_TYPE_INFO, computeAttackSpans } from "@/lib/attack-metadata";
import { Shield, AlertTriangle, Code2, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { arAttackType, arSpanLabel } from "@/lib/i18n/ar";
import { useMemo } from "react";

interface Props {
  challenge: Challenge;
  lastResult: AttackResult | null;
  lastPrompt: string;
}

const GUARDRAIL_ADVICE: Record<string, { input: string[]; output: string[]; architectural: string[] }> = {
  "prompt-injection": {
    input: [
      "احذف كلمات الحقن (ignore و forget و override) أو هرّبها قبل تمريرها إلى النموذج",
      "استخدم صيغ مدخلات منظّمة (مخطط JSON) لمنع حقن التعليمات الحرة",
      "أضف مصنِّفًا قبل النموذج يرصد الأنماط الشبيهة بالتعليمات في مدخلات المستخدم",
    ],
    output: [
      "تحقّق بمصنِّف ثانوي من أن الرد بقي ضمن الموضوع",
      "علِّم الردود التي تتطرق لمواضيع خارج النطاق المحدد",
    ],
    architectural: [
      "افصل تعليمات النظام عن مدخلات المستخدم بفواصل موثوقة لا يستطيع المستخدم تقليدها",
      "طبّق مبدأ أقل صلاحية: لا تكشف إلا القدرات التي يحتاجها المستخدم فعلًا",
    ],
  },
  jailbreak: {
    input: [
      "ارصد صيغ تقمّص الأدوار وتبديل الشخصية: 'act as' و 'pretend' و 'you are now' و 'DAN'",
      "علِّم علامات المسافة الافتراضية أو الخيالية ('in a story where' و 'hypothetically')",
    ],
    output: [
      "راقب عبارات الهوية بصيغة المتكلم التي لا تتسق مع شخصية النظام",
      "علِّم الردود التي تدّعي أنها 'بلا قيود' أو أن 'الإرشادات معلّقة'",
    ],
    architectural: [
      "تدريب يثبّت الهوية: قيم النموذج يجب أن تبقى ثابتة داخل سياقات التقمّص",
      "الذكاء الدستوري: قواعد عليا لا يمكن تجاوزها بأي تأطير حواري",
    ],
  },
  "intent-drift": {
    input: [
      "تتبّع المسافة الدلالية بين رسائل المستخدم عبر نافذة المحادثة",
      "أعِد ربط النموذج بقيوده الأساسية كل عدد من الرسائل بتذكير من النظام",
    ],
    output: [
      "رصد الانحراف بنافذة متحركة: قارن مواضيع الردود بالمهمة الأصلية",
      "أطلق تنبيهًا إذا اقتربت آخر 3 ردود تدريجيًا من المواضيع المحظورة",
    ],
    architectural: [
      "حافظ على الوعي بالقيود عبر سجل المحادثة كاملًا، لا الرسالة الأخيرة فقط",
      "استخدم وكيلًا منفصلًا 'لمراقبة الانحراف' يدقّق مخرجات الوكيل الرئيسي",
    ],
  },
  "token-smuggling": {
    input: [
      "وحّد المدخلات: فك Base64 و ROT13 والحروف المتشابهة في Unicode قبل تصفية المحتوى",
      "استخدم مصنِّفات دلالية بدل قوائم حظر الكلمات، فالمعنى أهم من الإملاء",
      "علِّم المدخلات ذات العشوائية العالية بشكل غير معتاد (مؤشر على الترميز)",
    ],
    output: [
      "مراقبة دلالية للمخرجات: تحقّق هل يناقش الرد مواضيع محظورة مهما كانت صياغتها",
    ],
    architectural: [
      "دفاع متعدد الطبقات: وحّد ← صنّف دلاليًا ← صفِّ المخرجات ← راقب",
      "درّب مصنِّفات المحتوى على الصيغ المموّهة، لا على النص الصريح وحده",
    ],
  },
  "multi-vector": {
    input: ["طبّق كل ضوابط المحور الواحد في وقت واحد", "حدّد معدل الجلسات التي تظهر فيها مؤشرات هجوم متعددة وسجّلها"],
    output: ["اشترط اجتياز كل مصنِّفات المخرجات قبل إرجاع الرد"],
    architectural: [
      "دفاع متعدد الطبقات: لا يكفي ضابط واحد، فرتّبها طبقات مستقلة",
      "اختبر هجوميًا باستمرار بمحاور مركّبة، لا بتقنيات منفردة فقط",
    ],
  },
  "indirect-injection": {
    input: [
      "عامل كل محتوى من مصدر خارجي كبيانات غير موثوقة، لا كتعليمات أبدًا",
      "نقِّ المستندات: احذف الأنماط الشبيهة بالتعليمات قبل تمريرها إلى النموذج",
      "استخدم تحليلًا معزولًا للمستندات يجرّد المحتوى الخارجي من بنيته الدلالية",
    ],
    output: [
      "راقب استدعاءات الأدوات أو عبارات التنفيذ في ردود مهام تلخيص المستندات",
      "علِّم أي رد يدّعي أنه 'نفّذ' أو 'اتّبع' توجيهًا من المحتوى",
    ],
    architectural: [
      "عزل المحتوى: لا تخلط البيانات الخارجية غير الموثوقة بقناة تعليمات النظام أبدًا",
      "معالجة على مرحلتين: استخرج حقائق المحتوى أولًا، ثم استدل عليها بشكل منفصل",
    ],
  },
  "agent-tool-abuse": {
    input: [
      "تحقّق من كل معاملات استدعاء الأدوات مقابل قائمة مسموحة قبل التنفيذ",
      "اشترط أن تطابق استدعاءات الأدوات نية المشغّل المحددة مسبقًا، لا طلب المستخدم وحده",
    ],
    output: [
      "سجّل كل استدعاء أداة بمعاملاته الكاملة للتدقيق",
      "اشترط تأكيدًا بشريًا للاستدعاءات عالية الأثر (إرسال، حذف، كتابة)",
    ],
    architectural: [
      "تسلسل هرمي للصلاحيات: نية المشغّل مقدّمة على طلب المستخدم عند تفويض الأدوات",
      "أقل قدرة ممكنة: لا يُمنح الوكيل إلا الأدوات التي يحتاجها فعلًا",
      "تنفيذ معزول: تعمل استدعاءات الأدوات في بيئات معزولة بقيود على الشبكة ونظام الملفات",
    ],
  },
};

function SeverityBadge({ success }: { success: boolean }) {
  return success ? (
    <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-0.5 rounded-full">
      <XCircle className="h-3 w-3" /> رُصد اختراق
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="h-3 w-3" /> صمد الدفاع
    </span>
  );
}

export default function DefenseView({ challenge, lastResult, lastPrompt }: Props) {
  const spans = useMemo(() => computeAttackSpans(lastPrompt), [lastPrompt]);
  const attackType = lastResult?.attackType ?? challenge.attackType;
  const advice = GUARDRAIL_ADVICE[attackType] ?? GUARDRAIL_ADVICE["prompt-injection"];

  const typeInfo = attackType ? ATTACK_TYPE_INFO[attackType] : null;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-[#241f1a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-blue-500/5">
        <Shield className="h-4 w-4 text-blue-400" />
        <span className="font-bold text-blue-400 text-sm">منظور المدافع</span>
        <span className="text-xs text-slate-500">اقلب المنظور: ما الذي كان سيوقف هذا الهجوم؟</span>
        {lastResult && (
          <div className="ms-auto">
            <SeverityBadge success={lastResult.success} />
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Attack classification */}
        {typeInfo && (
          <div className="rounded-lg bg-slate-900 border border-slate-700 p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              صُنّف الهجوم على أنه
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{typeInfo.icon}</span>
              <div>
                <span className={cn("font-bold", typeInfo.color)}>{arAttackType(attackType).name}</span>
                {typeInfo.owaspRef && (
                  <span className="ms-2 text-xs text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
                    {typeInfo.owaspRef}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pattern breakdown */}
        {spans.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {spans.length} نمط يجب أن يعلّمه ضابط المدخلات
            </div>
            <div className="space-y-1.5">
              {spans.slice(0, 5).map((span, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ChevronRight className="h-3 w-3 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span className="text-orange-300 font-mono bg-orange-500/10 px-1 rounded">
                    &quot;{arSpanLabel(span.label)}&quot;
                  </span>
                  <span className="text-slate-500">← نمط {span.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!lastPrompt && (
          <p className="text-xs text-slate-500 italic">
            أرسل أمر هجوم لترى الأنماط التي سيعلّمها المدافع.
          </p>
        )}

        {/* Guardrail advice */}
        <div>
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            ضوابط المدخلات
          </div>
          <ul className="space-y-1.5">
            {advice.input.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">←</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
            مراقبة المخرجات
          </div>
          <ul className="space-y-1.5">
            {advice.output.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">←</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2">
            الدفاع المعماري
          </div>
          <ul className="space-y-1.5">
            {advice.architectural.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-purple-400 mt-0.5 flex-shrink-0">←</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Defense code snippet */}
        {challenge.defenseCode && (
          <div>
            <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Code2 className="h-3 w-3" />
              تنفيذ الضابط (شفرة)
            </div>
            <pre className="text-xs font-mono text-slate-300 bg-slate-900 rounded-lg p-3 border border-slate-700 overflow-x-auto whitespace-pre leading-relaxed">
              {challenge.defenseCode}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}

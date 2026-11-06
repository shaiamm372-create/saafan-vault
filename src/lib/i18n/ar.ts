/**
 * Arabic display text for values the engine keeps in English.
 *
 * The grading engine, tests and attack payloads stay in English, so instead of
 * changing those values we translate them at display time with these helpers.
 * Every helper falls back to the English value if a key is missing.
 */
import type { AttackType, Difficulty } from "@/types";

export const AR_DIFFICULTY: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  expert: "خبير",
  legendary: "أسطوري",
};
export const arDifficulty = (d: string) => AR_DIFFICULTY[d as Difficulty] ?? d;

export const AR_ATTACK_TYPE: Record<AttackType, { name: string; description: string }> = {
  "prompt-injection": { name: "حقن الأوامر", description: "إدخال تعليمات مباشرة تتجاوز تعليمات النظام وتلغيها." },
  jailbreak: { name: "كسر القيود", description: "استخدام تقمّص الأدوار أو الإطار الخيالي لتجاوز إرشادات الأمان." },
  "intent-drift": { name: "انحراف النيّة", description: "تحويل السياق تدريجيًا عبر عدة رسائل حتى يخالف النموذج قيوده." },
  "token-smuggling": { name: "تهريب الرموز", description: "تشفير الكلمات المحظورة (Base64 أو ROT13 أو كتابة leet) لتجاوز فلاتر الكلمات المفتاحية." },
  "multi-vector": { name: "هجوم متعدد المحاور", description: "ربط عدة أنواع من الهجمات معًا لتجاوز دفاعات متعددة الطبقات." },
  "indirect-injection": { name: "الحقن غير المباشر", description: "زرع تعليمات الهجوم داخل محتوى خارجي يقرؤه الذكاء الاصطناعي، مثل مستند أو بريد أو صفحة ويب." },
  "agent-tool-abuse": { name: "إساءة استخدام أدوات الوكيل", description: "التلاعب بوكيل ذكاء اصطناعي حتى يسيء استخدام أدواته الحقيقية، مثل البريد وقواعد البيانات وتنفيذ الشفرات." },
  "system-prompt-leak": { name: "تسريب تعليمات النظام", description: "استدراج النموذج حتى يكشف تعليماته المخفية، وما فيها من أسرار وقواعد وضوابط." },
  "data-exfiltration": { name: "تهريب البيانات", description: "إخراج البيانات الخاصة عبر رابط أو صورة Markdown يكتبها النموذج ويعرضها التطبيق تلقائيًا بدون أي نقرة." },
  "improper-output-handling": { name: "سوء معالجة المخرجات", description: "توجيه مخرجات النموذج لتصبح شفرة نشطة (وسوم script أو معالجات أحداث أو روابط javascript:) ينفّذها المتصفح، أي XSS عبر النموذج." },
  "excessive-agency": { name: "الصلاحيات المفرطة", description: "دفع وكيل يملك صلاحيات عالية لتنفيذ إجراء مدمّر أو مغيّر للحالة بنفسه، بينما كان دوره أن يقترحه فقط لموافقة بشرية." },
  misinformation: { name: "المعلومات المضللة", description: "دفع النموذج لعرض محتوى مختلق لا يمكن التحقق منه، مثل مراجع وأرقام DOI وإحصاءات وسوابق قضائية مخترعة، كأنه حقيقة مؤكدة بلا أي تحفّظ." },
  "rag-poisoning": { name: "تسميم الاسترجاع (RAG)", description: "إدخال محتوى يتحكم فيه المهاجم إلى قاعدة معرفة نظام الاسترجاع، فيُسترجَع ويُعامل كحقيقة: زرع معلومات خاطئة، أو تجاوز الإجابات المعتمدة، أو تسريب مدخلات سرية أو تخص عملاء آخرين." },
  "unbounded-consumption": { name: "الاستهلاك غير المحدود", description: "إجبار نموذج مدفوع بالاستخدام على عمل ضخم أو لا نهائي، مثل التكرار للأبد أو أطول مخرجات ممكنة أو التوسّع الذاتي، فترتفع التكلفة والتأخير والطاقة بلا حد (استنزاف المحفظة)." },
  "data-poisoning": { name: "تسميم البيانات والنموذج", description: "العبث ببيانات التدريب أو الضبط الدقيق أو التفضيلات التي تشكّل النموذج، مثل زرع باب خلفي أو وسم مخرجات خطرة كمفضّلة، فيُطبع الفساد في الأوزان ويؤثر على كل مستخدم لاحقًا." },
  "supply-chain": { name: "سلسلة الإمداد", description: "إدخال مكوّن طرف ثالث مخترق إلى منظومة النموذج: نموذج أو محوّل LoRA غير موقّع من مرآة غير موثوقة، أو حزمة منتحلة الاسم، أو إصدار 'latest' غير مثبّت. هنا تُعامل السهولة كأنها دليل موثوقية، فينهار حدّ السلامة." },
};
export const arAttackType = (t: string | null | undefined) =>
  (t && AR_ATTACK_TYPE[t as AttackType]) || { name: t ?? "", description: "" };

/** OWASP LLM Top 10 (2025) risk names. */
export const AR_OWASP: Record<string, string> = {
  "LLM01:2025": "حقن الأوامر",
  "LLM02:2025": "كشف المعلومات الحساسة",
  "LLM03:2025": "سلسلة الإمداد",
  "LLM04:2025": "تسميم البيانات والنموذج",
  "LLM05:2025": "سوء معالجة المخرجات",
  "LLM06:2025": "الصلاحيات المفرطة",
  "LLM07:2025": "تسريب تعليمات النظام",
  "LLM08:2025": "ضعف المتجهات والتضمينات",
  "LLM09:2025": "المعلومات المضللة",
  "LLM10:2025": "الاستهلاك غير المحدود",
};
export const arOwasp = (code: string, fallback?: string) => AR_OWASP[code] ?? fallback ?? code;

export const AR_RANK: Record<string, string> = {
  Rookie: "مبتدئ",
  Analyst: "محلّل",
  Hacker: "مخترق",
  "Red Teamer": "فريق أحمر",
  "Chief Red Teamer": "قائد الفريق الأحمر",
};
export const arRank = (r: string) => AR_RANK[r] ?? r;

export const AR_BADGE: Record<string, { name: string; description: string }> = {
  "first-blood": { name: "أول اختراق", description: "حلّ أول تحدٍ لك" },
  "hat-trick": { name: "هاتريك", description: "حلّ 3 تحديات" },
  completionist: { name: "المكمّل", description: "حلّ جميع التحديات" },
  "frontier-hunter": { name: "صيّاد الجديد", description: "حلّ تحديًا من تحديات 2025/2026 المتقدمة" },
  legend: { name: "أسطورة", description: "حلّ تحديًا بمستوى أسطوري" },
  analyst: { name: "رتبة محلّل", description: "الوصول لرتبة محلّل (500+ نقطة)" },
  "red-teamer": { name: "فريق أحمر", description: "الوصول لرتبة الفريق الأحمر (3500+ نقطة)" },
  chief: { name: "قائد الفريق الأحمر", description: "الوصول لأعلى رتبة (6000+ نقطة)" },
};
export const arBadge = (id: string, fallback: { name: string; description: string }) => AR_BADGE[id] ?? fallback;

/** Labels for the highlighted spans in the attack visualizer. */
export const AR_SPAN_LABEL: Record<string, string> = {
  "Instruction Override": "تجاوز التعليمات",
  "Memory Wipe": "مسح الذاكرة",
  "Instruction Injection": "حقن تعليمات",
  "Delimiter Spoofing": "تزوير الفواصل",
  "Identity Takeover": "انتحال الهوية",
  "Roleplay Trigger": "محفّز تقمّص",
  "Persona Switch": "تبديل الشخصية",
  "DAN Trigger": "محفّز DAN",
  "Restriction Removal": "إزالة القيود",
  "Fictional Distance": "مسافة خيالية",
  "Base64 Encoding": "ترميز Base64",
  "ROT13 Encoding": "ترميز ROT13",
  "Leet Speak": "كتابة Leet",
  "Homoglyph Attack": "حروف متشابهة",
  "Exception Framing": "تأطير الاستثناء",
  "Drift Marker": "علامة انحراف",
  "Hypothetical Drift": "انحراف افتراضي",
  "Tool Name": "اسم أداة",
  "Malicious Target": "هدف خبيث",
  "Prompt Echo": "ترديد التعليمات",
  "Config Extraction": "استخراج الإعدادات",
  "Above-the-line Leak": "تسريب ما سبق",
  "Markdown Image Exfil": "تهريب عبر صورة Markdown",
  "Data-Carrying URL Param": "معامل رابط يحمل بيانات",
  "Tracking Beacon": "منارة تتبّع",
  "Script/Frame Injection": "حقن script/iframe",
  "Inline Event Handler": "معالج حدث مضمّن",
  "XSS Sink / Payload": "حمولة XSS",
  "Unescaped-Output Ask": "طلب مخرجات بلا تهريب",
  "Approval Bypass": "تجاوز الموافقة",
  "Autonomy Escalation": "تصعيد الاستقلالية",
  "Claimed Approval Artifact": "ادعاء موافقة",
  "High-Privilege Executor": "منفّذ بصلاحيات عالية",
  "Destructive Action": "إجراء مدمّر",
  "Privilege Grant": "منح صلاحيات",
  "Source Fabrication": "اختلاق مصدر",
  "False-Fact Framing": "تأطير حقيقة زائفة",
  "Caveat Suppression": "حذف التحفّظات",
  "Overconfidence Prompt": "طلب ثقة مفرطة",
  "False Verification State": "حالة تحقق مزيفة",
  "Corpus Injection": "حقن في قاعدة المعرفة",
  "False-Trust Framing": "تأطير ثقة زائفة",
  "Retrieval Override": "تجاوز الاسترجاع",
  "Store Poisoning": "تسميم المخزن",
  "Unbounded Loop": "حلقة لا نهائية",
  "Cap Removal": "إزالة الحد",
  "Budget Override": "تجاوز الميزانية",
  "Resource Exhaustion": "استنزاف الموارد",
  "Training-Data Poisoning": "تسميم بيانات التدريب",
  "Backdoor Trigger": "محفّز باب خلفي",
  "Weight Tampering": "عبث بالأوزان",
  "Preference Poisoning": "تسميم التفضيلات",
  "Unvetted Install": "تثبيت غير مدقّق",
  "Untrusted Source": "مصدر غير موثوق",
  "Provenance Bypass": "تجاوز التحقق من المصدر",
  "Squat / Floating Ref": "اسم منتحل / إصدار عائم",
};
export const arSpanLabel = (l: string) => AR_SPAN_LABEL[l] ?? l;

/** Agentic track stages and roles. */
export const AR_STAGE: Record<string, string> = { Foundation: "تأسيسي", Advanced: "متقدم", Expert: "خبير" };
export const arStage = (s: string) => AR_STAGE[s] ?? s;
export const AR_ROLE: Record<string, string> = { attacker: "مهاجم", defender: "مدافع" };
export const arRole = (r: string) => AR_ROLE[r] ?? r;

/** Relative time, short form. */
export function arRelativeTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `قبل ${s} ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}

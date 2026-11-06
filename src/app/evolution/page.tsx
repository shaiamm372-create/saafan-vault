import type { Metadata } from "next";
import Link from "next/link";
import { CHALLENGES } from "@/lib/challenges";
import { AGENTIC_MISSIONS } from "@/lib/agentic/catalog";
import { GUIDED_LABS } from "@/lib/guided-labs";
import { LESSONS } from "@/lib/learning";

const description = "تتبّع رحلة المنصة من أول تحدٍّ لحقن الأوامر إلى الدروس والدفاعات الموجّهة ومهام أمن الوكلاء، مع أدلة مؤرخة من المستودع.";
export const metadata: Metadata = {
  title: "تطوّر المنصة",
  description,
  alternates: { canonical: "/evolution" },
  openGraph: { title: "تطوّر المنصة | خزنة سعفان", description, url: "/evolution", images: ["/og-image.png"] },
  twitter: { card: "summary_large_image", title: "تطوّر المنصة | خزنة سعفان", description, images: ["/og-image.png"] },
};

const UPSTREAM_COMMIT = "https://github.com/ppradyoth/prompt-injection-ctf/commit/";

const milestones: { date: string; label: string; title: string; phase: string; body: string; changes: string[]; commits: string[][] }[] = [
  { date: "2026-05-22", label: "22 مايو 2026", title: "أول تحدٍّ لحقن الأوامر", phase: "التأسيس", body: "بدأ المشروع كتطبيق Next.js، وأصبح في أول يوم مسجّل له تحديًا قابلًا للعب من خمس مهام. منح معلّم الرياضيات المقيّد اللاعبين هدفًا ملموسًا: أخرِج المساعد عن مهمته المحددة.", changes: ["أهداف المهام، والتلميحات، والمؤقتات، والنقاط", "كاشف أنماط الهجوم، ومنظور المدافع، ولوحة المجتمع", "حفظ ملاحظات المجتمع والترتيب في Firebase"], commits: [["79e5419", "أول تحدٍّ"], ["669921f", "أدوات اللاعب"], ["c74c4f1", "تكامل Firebase"]] },
  { date: "2026-06-04", label: "4 يونيو 2026", title: "تحدٍّ يستحق المشاركة", phase: "الانتشار", body: "بطاقات المشاركة، وروابط التحديات، والشارات، وصور المعاينة، سهّلت اكتشاف المهام الفردية وتمريرها. فبدأت المنصة تنمو أبعد من جلسة لعب واحدة.", changes: ["روابط للتحديات الفردية", "صور مشاركة وشارات إنجاز"], commits: [["986ecf4", "ميزات المشاركة"]] },
  { date: "2026-06-26", label: "26 يونيو – 10 يوليو 2026", title: "من الحقن إلى سطح هجوم النماذج الأوسع", phase: "التغطية", body: "توسّعت المهام إلى ست عشرة مهمة، شملت استخراج التعليمات، وتهريب البيانات، ومعالجة المخرجات، والصلاحيات المفرطة، والتسميم، ومخاطر سلسلة الإمداد. وربطت خريطة تغطية مرقّمة الإصدار المهام بفئات OWASP LLM Top 10 2025.", changes: ["ست عشرة مهمة وخريطة تغطية قابلة للقراءة آليًا", "اختبارات للمنطق الأساسي ومعرض تحديات مولّد", "فحوص قابلية الحل بجانب اختبارات الدفاع"], commits: [["843cc59", "مجموعة الاختبارات الأساسية"], ["08e09c4", "فحوص الانحدار"], ["bde144b", "ست عشرة مهمة"]] },
  { date: "2026-08-07", label: "7 أغسطس 2026", title: "تحقق أقوى من التحديات", phase: "التقييم", body: "تشدّد التقييم حول هدف المهمة الفعلي، وتشاركت بيئات التشغيل المقيّم نفسه، وأُغلقت مسارات كانت تمنح حلًا دون إثبات السلوك المقصود.", changes: ["تحقق مشدّد من الهدف", "مقيّم مشترك بين بيئات التشغيل"], commits: [["551ac37", "تشديد التحقق"], ["e42c5b4", "مقيّم مشترك"]] },
  { date: "2026-09-18", label: "18 – 30 سبتمبر 2026", title: "أوضاع تنفيذ ومنافسة أوضح", phase: "المشاركة", body: "أصبح بإمكان اللاعبين التقييم المباشر في المتصفح بمفاتيحهم الخاصة، ثم جاءت المنافسة الأسبوعية والدخول المباشر للمهمة الأولى. ووُسم التدريب بالمحاكاة صراحة ليفهم اللاعبون ما الذي عمل فعلًا.", changes: ["تقييم مباشر بمفتاح اللاعب", "منافسة أسبوعية ودخول أبسط للمهمة الأولى", "وسوم صريحة للتدريب بالمحاكاة"], commits: [["35a569f", "التقييم بمفتاحك"], ["d2fd02e", "المنافسة الأسبوعية"], ["6b89320", "وسوم التدريب"]] },
  { date: "2026-10-02", label: "2 – 3 أكتوبر 2026", title: "تجربة دفعة موثّقة", phase: "الدفعة", body: "حصلت AISYWLC على مسار دفعة خاص، وتسجيل دخول بـ Google، وتسجيل تلقائي، وفئات تقدّم، وترتيب حسب الوقت، فأُضيفت تجربة منافسة خاصة بفعالية بجانب التدريب دون حساب.", changes: ["تسجيل بـ Google وألقاب للمشاركين", "تقدّم الدفعة وترتيب حسب الوقت"], commits: [["4d9ae28", "وضع الدفعة"], ["84a3399", "التسجيل التلقائي"], ["1f34037", "الترتيب المؤقت"]] },
  { date: "2026-10-04", label: "4 أكتوبر 2026", title: "من ردود المحادثة إلى أفعال الوكلاء", phase: "أمن الوكلاء", body: "أدخلت ثلاثون مهمة للوكلاء استدعاءات الأدوات، والموارد الوهمية، وإعادة التشغيل بالدفاع إلى المنصة. وأتاحت مساحة العمل فحص آثار الإجراء والتحقق من أن الضوابط تحافظ على العمل المشروع.", changes: ["ثلاثون مهمة لأمن الوكلاء", "سجلات الأدوات، وإعادة التشغيل بالدفاع، وفحوص المهمة المشروعة", "واجهة محدّثة بألوان الزمرد والأزرق والرمادي"], commits: [["34d4b72", "تحديث الواجهة"], ["daeba3c", "مهام الوكلاء"]] },
  { date: "2026-10-08", label: "8 أكتوبر 2026", title: "منصة تعليمية متكاملة لأمن الذكاء الاصطناعي", phase: "التعلّم", body: "ربط أول إصدار تعليمي بين الشروحات، والدفاعات القابلة للتشغيل، والأبحاث، والتقدّم. وصار الهدف دورة كاملة: افهم حدّ الثقة، وتجاوزه في مختبر اصطناعي، وابنِ دفاعًا فعّالًا، واحتفظ بالدليل.", changes: ["ستة دروس تأسيسية وثلاثة مختبرات دفاع موجّهة", "دليل واحد للتدريب الموجّه والنماذج والوكلاء", "تصدير الأدلة وسجل تعلّم شخصي", "سجلات منافسة موثّقة يملكها الخادم"], commits: [["f87d8ea", "إصدار منصة التعلّم"]] },
  { date: "2026-11-06", label: "نوفمبر 2026", title: "خزنة سعفان: النسخة العربية", phase: "التعريب", body: "عرّب نادي الأمن السيبراني في جامعة الملك فيصل المنصة كاملة، وأعاد تقديمها بهوية أحسائية: سعفان حارس الخزنة، وألوان ذهب الخلاص وخضرة السعف. وبقيت الهجمات وتقييمها بالإنجليزية كما في الأصل، لتبقى النتائج مطابقة للمشروع الأصلي.", changes: ["واجهة عربية كاملة من اليمين لليسار بخطوط مضمّنة", "تعريب المهام الست عشرة، ومهام الوكلاء الثلاثين، والدروس والمختبرات الموجّهة", "الإبقاء على نص الهجمات ومنطق التقييم دون تغيير"], commits: [] },
];

export default function EvolutionPage() {
  return <div className="platform-page"><article className="platform-shell evolution-page">
    <header className="platform-header"><p className="eyebrow">المشروع في حركة</p><h1>من تحدٍّ لحقن الأوامر<br />إلى مختبر لأمن الذكاء الاصطناعي.</h1><p>كيف تطوّرت المنصة، قدرةً ملموسة بعد أخرى. تتبّع الرحلة من أول تحدٍّ لمعلّم الرياضيات إلى مسارات التعلّم، والدفاعات الفعّالة، وأفعال الوكلاء القابلة للفحص.</p></header>
    <div className="evolution-snapshot" aria-label="محتوى المنصة الحالي">
      {[[CHALLENGES.length, "مهمة نماذج"], [AGENTIC_MISSIONS.length, "مهمة وكلاء"], [GUIDED_LABS.length, "مختبرات دفاع موجّهة"], [LESSONS.length, "دروس تأسيسية"]].map(([count, label]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
    </div>
    <nav className="evolution-index" aria-label="اختصارات الخط الزمني"><a href="#milestone-0">ابدأ من البداية ↓</a><a href="#milestone-8">انتقل إلى النسخة العربية ↓</a></nav>
    <p className="evolution-provenance">التواريخ أدناه تشير إلى تغييرات مسجّلة في مستودع المشروع الأصلي، لا إلى تواريخ إطلاق عامة متحقق منها بشكل مستقل. وكل محطة مرتبطة بالتعديلات المصدرية لها. هذا تاريخ منتقى، لا قائمة بكل إصلاح.</p>
    <ol className="evolution-timeline">{milestones.map((milestone, index) => <li id={`milestone-${index}`} key={milestone.date}>
      <div className="evolution-date"><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><time dateTime={milestone.date}>{milestone.label}</time></div>
      <section className="evolution-entry" aria-labelledby={`title-${index}`}><p className="eyebrow">{milestone.phase}</p><h2 id={`title-${index}`}>{milestone.title}</h2><p>{milestone.body}</p><ul>{milestone.changes.map((change) => <li key={change}>{change}</li>)}</ul><div className="evolution-sources">{milestone.commits.map(([sha, label]) => <a key={sha} href={`${UPSTREAM_COMMIT}${sha}`} target="_blank" rel="noopener noreferrer">{label} <code>{sha}</code> ↗</a>)}</div></section>
    </li>)}</ol>
    <section className="evolution-current"><p className="eyebrow">استكشف المنصة اليوم</p><h2>الخطوة التالية لك.</h2><p>اقرأ درسًا تأسيسيًا، أو شغّل دفاعًا موجّهًا، أو افحص مهمة وكيل. أوضاع التنفيذ وحدود الأدلة موثّقة لكل نوع من التدريب.</p><div><Link href="/learn">ابدأ مسار التعلّم ←</Link><Link href="/challenges">استكشف كل المختبرات ←</Link><Link href="/docs">كيف يعمل المختبر ←</Link></div></section>
  </article></div>;
}

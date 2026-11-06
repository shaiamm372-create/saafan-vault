import Link from "next/link";
import { ArrowUpRight, Network, Shield } from "lucide-react";
import AgenticCatalog from "@/components/AgenticCatalog";
import { AGENTIC_SOURCE } from "@/lib/agentic/catalog";

export const metadata = { title: "مختبر الوكلاء", description: "العب 30 مهمة تغطي قائمة OWASP لأخطر 10 تهديدات للوكلاء لعام 2026، بأدوات معزولة ودفاعات يتحقق منها الخادم." };

export default function AgenticPage() {
  return <div className="agentic-lab pt-28 pb-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="agentic-intro">
        <div><p className="eyebrow mb-5"><Network size={15} /> أمن الوكلاء / 2026</p><h1>تتبّع الإشارة.<br /><span className="text-emerald-400">واكسر الحدّ.</span></h1><p className="mt-6 max-w-xl leading-7 text-slate-400">الوكلاء ينفّذون، ويفوّضون، ويتذكّرون. استكشف حدود الثقة وراء قراراتهم عبر الأدوات، وتغييرات الحالة، والأدلة القابلة للتحقق.</p><div className="mt-6 flex flex-wrap gap-3"><Link className="lab-button lab-button-primary" href="/agentic/asi01-a">ابدأ بعملية المهمة الجانبية <ArrowUpRight size={16} /></Link><Link className="lab-button lab-button-secondary" href="/challenges">غيّر المسار</Link></div></div>
        <div className="agentic-signal-map" aria-hidden="true"><span className="agentic-orbit" /><span className="agentic-orbit inner" /><Network size={54} strokeWidth={1} /><span className="agentic-node node-one">المهمة</span><span className="agentic-node node-two">الأدوات</span><span className="agentic-node node-three">الذاكرة</span><p>الصلاحية / الإجراء / الدليل</p></div>
      </header>
      <div className="agentic-preview-banner"><Shield size={20} /><div><strong>30 مهمة · 10 فئات تهديد</strong><p>التدريب بالسيناريو لا يدخل الترتيب. التشغيل المباشر يتطلب إعداد نموذج على الخادم وتسجيل دخول موثّق بـ Google. مهام المدافع تقيّم ضوابطك مباشرة، ومهام الشفرة تستخدم مفسّرًا افتراضيًا محدودًا.</p></div><Link href="/leaderboard?board=agentic">الترتيب المحتسب <ArrowUpRight size={14} /></Link></div>
      <AgenticCatalog />
      <p className="mt-8 text-sm text-slate-400">تصنيف التهديدات: <a href={AGENTIC_SOURCE} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">OWASP Top 10 for Agentic Applications 2026</a>. المهام سيناريوهات تدريبية مستقلة التأليف.</p>
    </div>
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDED_LABS } from "@/lib/guided-labs";
import GuidedLabWorkspace from "@/components/GuidedLabWorkspace";
export function generateStaticParams() { return GUIDED_LABS.map((lab) => ({ id: lab.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const lab = GUIDED_LABS.find((entry) => entry.id === id);
  return { title: lab?.title ?? "المختبر غير متاح", description: lab?.summary, alternates: { canonical: `/labs/${id}` }, openGraph: { title: lab?.title, description: lab?.summary, url: `/labs/${id}`, type: "website", images: ["/og-image.png"] }, twitter: { card: "summary_large_image", title: lab?.title, description: lab?.summary, images: ["/og-image.png"] } };
}
export default async function GuidedLabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const lab = GUIDED_LABS.find((entry) => entry.id === id); if (!lab) notFound();
  return <div className="platform-page"><div className="platform-shell"><Link href="/challenges" className="platform-back">→ كل المختبرات</Link><header className="platform-header"><p className="eyebrow">مختبر موجّه / {lab.system}</p><h1>{lab.title}</h1><p>{lab.summary}</p><div className="platform-meta"><span className="mode-tag">بيئة معزولة حتمية</span><span>السيناريو v1</span><span>بدون تسجيل</span><Link href={`/learn/${lab.lesson}`}>اقرأ الدرس ←</Link></div></header><GuidedLabWorkspace lab={lab} /><p className="execution-limits">تضيف هذه المختبرات الموجّهة الثلاثة تمارين دفاع متكاملة إلى المهام الست والأربعين. وفحوصها المحدودة التي ينفّذها الخادم تُثبت سلوك سياسة البيئة المعزولة، لا قابلية نموذج مباشر للتأثر.</p></div></div>;
}

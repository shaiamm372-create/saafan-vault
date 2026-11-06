import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="site-footer mt-auto">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
        <div className="platform-footer-grid">
          <div>
            <h2 className="brand-title text-lg">{BRAND.name} <span className="text-emerald-400">· {BRAND.vault}</span></h2>
            <p>دروس عربية في أمن الذكاء الاصطناعي ومختبرات اصطناعية آمنة. افهم الحدّ، وابنِ دفاعًا فعّالًا، واحتفظ بالدليل.</p>
            <p className="mt-3">{BRAND.owner} · <a href={`mailto:${BRAND.ownerEmail}`} className="ltr inline-block underline underline-offset-4">{BRAND.ownerEmail}</a></p>
          </div>
          <nav aria-label="مصادر التعلّم">
            <strong>استكشف</strong>
            <Link href="/learn">مسار التعلّم</Link>
            <Link href="/challenges?track=llm">خزنة النماذج</Link>
            <Link href="/agentic">مختبر الوكلاء</Link>
            <Link href="/challenges?view=labs">كل المختبرات والدفاعات الموجّهة</Link>
            <Link href="/research">الأبحاث</Link>
            <Link href="/community">ملاحظات المجتمع</Link>
            <Link href="/leaderboard">المتصدرون</Link>
          </nav>
          <nav aria-label="معلومات المنصة">
            <strong>عن المنصة</strong>
            <Link href="/docs">كيف يعمل المختبر</Link>
            <Link href="/docs#about">من نحن</Link>
            <Link href="/evolution">تطوّر المنصة</Link>
            <Link href="/privacy">البيانات والخصوصية</Link>
            <Link href="/progress">سجل تعلّمك</Link>
            <Link href="/aisywlc">دفعة AISYWLC (من المشروع الأصلي)</Link>
          </nav>
        </div>
        <div className="platform-footer-bottom">
          <span>
            مبنية على المشروع مفتوح المصدر{" "}
            <a href={BRAND.upstream.url} target="_blank" rel="noopener noreferrer" className="ltr inline-block underline underline-offset-4">{BRAND.upstream.name}</a>{" "}
            من تطوير <span className="ltr inline-block">{BRAND.upstream.author}</span>، وتُنشر بترخيص MIT. عرّبها وكيّفها {BRAND.ownerShort}.
          </span>
          <a href={`${BRAND.upstream.url}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">نص الترخيص ↗</a>
        </div>
      </div>
    </footer>
  );
}

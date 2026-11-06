import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تعلّم أمن الذكاء الاصطناعي",
  description:
    "مسار تأسيسي كامل من ستة دروس في أمن الذكاء الاصطناعي، مع اختبارات فهم ودفاعات موجّهة وأمثلة أصلية ومراجع.",
  openGraph: {
    title: "تعلّم أمن الذكاء الاصطناعي — خزنة سعفان",
    description: "حدود الثقة، والسياق الحساس، والحقن غير المباشر، ونطاق الموارد، وتفويض الأدوات، والأدلة القابلة للتكرار.",
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

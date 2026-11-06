import { Metadata } from "next";

export const metadata: Metadata = {
  title: "دليل مختبرات أمن الذكاء الاصطناعي",
  description:
    "تصفّح 46 مهمة للنماذج والوكلاء، وثلاثة مختبرات دفاع موجّهة. ابحث حسب النظام والمهارة والصعوبة. التدريب المجهول لا يدخل الترتيب.",
  openGraph: {
    title: "تحديات أمن الذكاء الاصطناعي — خزنة سعفان",
    description:
      "46 مهمة وثلاثة مختبرات دفاع موجّهة، بأوضاع تنفيذ واضحة وأدلة قابلة للفحص.",
  },
};

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

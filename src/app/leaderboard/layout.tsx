import { Metadata } from "next";

export const metadata: Metadata = {
  title: "المتصدرون",
  description:
    "لوحة متصدري خزنة سعفان. هل تستطيع حل التحديات الستة عشر والوصول للمركز الأول؟",
  openGraph: {
    title: "لوحة المتصدرين — خزنة سعفان",
    description: "نافس في 16 تحديًا لحقن الأوامر و30 مهمة لأمن الوكلاء.",
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

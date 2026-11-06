import { Metadata } from "next";

export const metadata: Metadata = {
  title: "هجمات المجتمع",
  description:
    "تصفّح تقنيات حقن الأوامر وصوّت لها وشاركها. مكتبة يجمعها المجتمع لأساليب كسر القيود والحقن غير المباشر واستغلال الوكلاء.",
  openGraph: {
    title: "لوحة هجمات المجتمع — خزنة سعفان",
    description: "هجمات يجمعها المجتمع. تصفّح أساليب كسر القيود والحقن غير المباشر واستغلال الوكلاء، وأضف هجومك.",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

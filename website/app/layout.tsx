import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ogpeek — 어느 페이지든 오픈그래프 메타태그를 바로 들여다봅니다",
  description:
    "URL 한 줄로 카카오톡, 슬랙, 페이스북, X, 링크드인에서 어떻게 보이는지 즉시 확인하고 OGP 스펙 위반을 잡아냅니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

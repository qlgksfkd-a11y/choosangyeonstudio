export const metadata = {
  title: "루페 | 사진작가 예약 플랫폼",
  description: "루페가 직접 검증한 전국 사진작가들을 만나보세요.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

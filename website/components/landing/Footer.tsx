const FAQ = [
  {
    q: "사내 staging 도메인을 어떻게 파싱하나요?",
    a: "환경변수 OGPEEK_ALLOW_PRIVATE_NETWORK=1 을 설정하면 사설 IP 대역 차단을 해제합니다. public 배포에선 기본값을 유지하세요.",
  },
  {
    q: "왜 ogp.me처럼 일부 사이트는 403이 나나요?",
    a: "CDN이 bot UA를 차단하는 경우입니다. OGPEEK_USER_AGENT로 UA를 바꾸거나 브라우저와 동일한 값을 넣어보세요.",
  },
  {
    q: "내부 전용으로만 쓰고 싶어요.",
    a: "NEXT_PUBLIC_MODE=internal 로 실행하면 랜딩 섹션이 숨겨지고 디버거 화면만 표시됩니다.",
  },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-[color:rgb(var(--border))] pt-10">
      <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold">FAQ</h2>
          <dl className="mt-4 space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="border-l-2 border-[color:rgb(var(--border))] pl-4">
                <dt className="text-sm font-medium">{item.q}</dt>
                <dd className="mt-1 text-sm text-[color:rgb(var(--muted))]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="text-sm">
          <h2 className="text-lg font-semibold">프로젝트</h2>
          <ul className="mt-4 space-y-2 text-[color:rgb(var(--muted))]">
            <li>
              <a className="hover:underline" href="https://github.com/">
                GitHub
              </a>
            </li>
            <li>Next.js 15 · TypeScript · Tailwind</li>
            <li>ogpeek · htmlparser2 · Node 20+</li>
            <li className="pt-2 text-xs">
              &copy; {new Date().getFullYear()} ogpeek
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

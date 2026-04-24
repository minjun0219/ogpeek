const FEATURES = [
  {
    title: "스펙 기반 검증",
    body:
      "ogp.me 공식 스펙을 기준으로 12개의 규칙을 자동 검사합니다. og:title 60자 초과, og:url 불일치 같은 실무 규칙까지 함께 잡습니다.",
  },
  {
    title: "국내 서비스 우선",
    body:
      "카카오톡 미리보기를 최우선으로 렌더합니다. 슬랙·페이스북·X·링크드인 카드도 한 화면에서 비교하세요.",
  },
  {
    title: "안전한 외부 호출",
    body:
      "사설 IP·루프백·링크로컬 대역을 기본 차단합니다. 타임아웃, 응답 크기 상한, 분당 요청 수 제한이 기본 내장입니다.",
  },
  {
    title: "공유 가능한 링크",
    body:
      "`/?url=...` permalink가 곧 결과 페이지입니다. QA 티켓에 그대로 붙여 넣어 재현 가능한 근거를 공유하세요.",
  },
];

export function Features() {
  return (
    <section className="flex flex-col gap-6 py-14">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">어떤 문제를 해결하나요?</h2>
        <p className="mt-1 text-sm text-[color:rgb(var(--muted))]">
          링크 공유를 다루는 기획자·QA·개발자가 공통으로 겪는 네 가지 통증점에 집중합니다.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-4"
          >
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-[color:rgb(var(--muted))]">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { UrlInput } from "@/components/UrlInput";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 py-14 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[color:rgb(var(--muted))]">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Open Graph debugger
      </div>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        어느 페이지든 오픈그래프 메타태그를
        <br className="hidden sm:block" /> 바로 들여다봅니다.
      </h1>
      <p className="max-w-xl text-sm text-[color:rgb(var(--muted))] sm:text-base">
        URL 한 줄로 카카오톡·슬랙·페이스북·X·링크드인에서의 실제 미리보기와
        스펙 위반 경고를 즉시 확인하세요.
      </p>
      <div className="w-full max-w-xl">
        <UrlInput />
      </div>
    </section>
  );
}

import { UrlInput } from "@/components/UrlInput";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 py-14 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[color:rgb(var(--muted))]">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Open Graph debugger
      </div>
      <div className="w-full max-w-xl">
        <UrlInput />
      </div>
    </section>
  );
}

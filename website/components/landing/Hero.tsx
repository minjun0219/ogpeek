import { UrlInput } from "@/components/UrlInput";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 py-14 text-center">
      <img
        src="/logo.png"
        alt=""
        width={88}
        height={88}
        className="h-22 w-22"
      />
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
        ogpeek
      </h1>
      <div className="w-full max-w-xl">
        <UrlInput />
      </div>
    </section>
  );
}

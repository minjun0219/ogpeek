import { UrlInput } from "@/components/UrlInput";
import { InstallCopy } from "@/components/landing/InstallCopy";
import type { Dict } from "@/lib/i18n";

export function Hero({ dict }: { dict: Dict }) {
  return (
    <section className="flex flex-col items-center gap-6 py-14 text-center">
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
        ogpeek
      </h1>
      <div className="w-full max-w-xl">
        <UrlInput dict={dict} />
      </div>
      <InstallCopy dict={dict} />
    </section>
  );
}

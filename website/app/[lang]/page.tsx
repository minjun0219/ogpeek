import { notFound } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { getDict, hasLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string }>;

export default async function Page({ params }: { params: Params }) {
  const { lang: rawLang } = await params;
  if (!hasLang(rawLang)) {
    notFound();
  }
  const lang: Lang = rawLang;
  const dict = getDict(lang);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-6">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <Hero />
      <Footer lang={lang} dict={dict} />
    </main>
  );
}

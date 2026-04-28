import { InstallCopy } from "@/components/landing/InstallCopy";
import type { Dict } from "@/lib/i18n";

type Pkg = {
  name: string;
  command: string;
  tagline: string;
  npmHref: string;
  readmeHref: string;
};

export function Packages({ dict }: { dict: Dict }) {
  const packages: Pkg[] = [
    {
      name: "ogpeek",
      command: "npm install ogpeek",
      tagline: dict.packages.engine.tagline,
      npmHref: "https://www.npmjs.com/package/ogpeek",
      readmeHref:
        "https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek#readme",
    },
    {
      name: "@ogpeek/react",
      command: "npm install @ogpeek/react",
      tagline: dict.packages.react.tagline,
      npmHref: "https://www.npmjs.com/package/@ogpeek/react",
      readmeHref:
        "https://github.com/minjun0219/ogpeek/tree/main/packages/ogpeek-react#readme",
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {dict.packages.title}
        </h2>
        <p className="text-sm text-[color:rgb(var(--muted))]">
          {dict.packages.subtitle}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg) => (
          <article
            key={pkg.name}
            className="flex flex-col gap-3 rounded-xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-5 py-4"
          >
            <h3 className="font-mono text-sm font-medium">{pkg.name}</h3>
            <p className="text-sm text-[color:rgb(var(--muted))]">
              {pkg.tagline}
            </p>
            <InstallCopy command={pkg.command} />
            <div className="flex flex-wrap gap-3 text-xs text-[color:rgb(var(--muted))]">
              <a
                className="hover:text-[color:rgb(var(--foreground))] hover:underline"
                href={pkg.npmHref}
                target="_blank"
                rel="noreferrer"
              >
                {dict.packages.npmLink}
              </a>
              <span aria-hidden>·</span>
              <a
                className="hover:text-[color:rgb(var(--foreground))] hover:underline"
                href={pkg.readmeHref}
                target="_blank"
                rel="noreferrer"
              >
                {dict.packages.readmeLink}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

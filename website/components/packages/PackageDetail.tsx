import { InstallCopy } from "@/components/landing/InstallCopy";

type Props = {
  name: string;
  pkg: string;
  tagline: string;
  npmHref: string;
  readmeHref: string;
  badges: Array<{ src: string; alt: string }>;
  quickStartTitle: string;
  quickStartCode: string;
  npmLinkLabel: string;
  readmeLinkLabel: string;
};

export function PackageDetail(props: Props) {
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-[color:rgb(var(--border))] bg-[color:rgb(var(--surface))] px-6 py-6 sm:px-8 sm:py-7">
      <header className="flex flex-col gap-3">
        <h2 className="font-mono text-xl font-medium tracking-tight">
          {props.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          {props.badges.map((badge) => (
            <a
              key={badge.src}
              href={props.npmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              {/* shields.io serves SVG badges that are tiny and meant for direct embed. */}
              {/* biome-ignore lint/performance/noImgElement: external SVG badge from shields.io */}
              <img
                src={badge.src}
                alt={badge.alt}
                height={20}
                loading="lazy"
                decoding="async"
                className="h-5"
              />
            </a>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-[color:rgb(var(--muted))]">
          {props.tagline}
        </p>
      </header>

      <InstallCopy pkg={props.pkg} />

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:rgb(var(--muted))]">
          {props.quickStartTitle}
        </h3>
        <pre className="overflow-x-auto rounded-lg border border-[color:rgb(var(--border))] bg-[color:rgb(var(--background))] px-4 py-3 text-xs leading-relaxed">
          <code className="font-mono">{props.quickStartCode}</code>
        </pre>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[color:rgb(var(--muted))]">
        <a
          className="hover:text-[color:rgb(var(--foreground))] hover:underline"
          href={props.npmHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {props.npmLinkLabel}
        </a>
        <span aria-hidden>·</span>
        <a
          className="hover:text-[color:rgb(var(--foreground))] hover:underline"
          href={props.readmeHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {props.readmeLinkLabel}
        </a>
      </div>
    </article>
  );
}

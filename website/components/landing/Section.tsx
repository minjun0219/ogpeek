import type { ReactNode } from "react";

export function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-6 flex-col gap-5"
    >
      <header className="flex flex-col gap-2">
        <h2
          id={`${id}-title`}
          className="text-2xl font-semibold tracking-tight"
        >
          {title}
        </h2>
        {lead ? (
          <p className="max-w-2xl text-sm leading-relaxed text-[color:rgb(var(--muted))]">
            {lead}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

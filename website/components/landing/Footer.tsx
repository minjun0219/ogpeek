export function Footer() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-2 border-t border-[color:rgb(var(--border))] pt-10 text-sm text-[color:rgb(var(--muted))]">
      <div className="flex gap-3">
        <a
          className="hover:text-[color:rgb(var(--foreground))] hover:underline"
          href="https://github.com/minjun0219/ogpeek"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <span aria-hidden>·</span>
        <a
          className="hover:text-[color:rgb(var(--foreground))] hover:underline"
          href="https://github.com/minjun0219/ogpeek/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          MIT License
        </a>
      </div>
      <p className="text-xs">
        by{" "}
        <a
          className="hover:text-[color:rgb(var(--foreground))] hover:underline"
          href="https://minjun.kim"
          target="_blank"
          rel="noreferrer"
        >
          minjun.kim
        </a>
      </p>
    </footer>
  );
}

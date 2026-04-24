export function Footer() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-2 border-t border-[color:rgb(var(--border))] pt-10 text-sm text-[color:rgb(var(--muted))]">
      <a
        className="hover:text-[color:rgb(var(--foreground))] hover:underline"
        href="https://github.com/minjun0219/ogpeek"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
      <p className="text-xs">&copy; {new Date().getFullYear()} ogpeek</p>
    </footer>
  );
}

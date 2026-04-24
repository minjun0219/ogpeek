export function Footer() {
  return (
    <footer className="mt-10 border-t border-[color:rgb(var(--border))] pt-10">
      <div className="text-sm">
        <h2 className="text-lg font-semibold">프로젝트</h2>
        <ul className="mt-4 space-y-2 text-[color:rgb(var(--muted))]">
          <li>
            <a className="hover:underline" href="https://github.com/">
              GitHub
            </a>
          </li>
          <li>Next.js 15 · TypeScript · Tailwind</li>
          <li>ogpeek · htmlparser2 · Node 20+</li>
          <li className="pt-2 text-xs">
            &copy; {new Date().getFullYear()} ogpeek
          </li>
        </ul>
      </div>
    </footer>
  );
}

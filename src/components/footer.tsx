export function Footer() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Commuvent. Free for the community.</p>
        <nav className="flex gap-4">
          <a href="/about" className="hover:text-foreground">About</a>
          <a href="/explore" className="hover:text-foreground">Explore</a>
          <a href="/become-a-host" className="hover:text-foreground">Host an event</a>
        </nav>
      </div>
    </footer>
  );
}

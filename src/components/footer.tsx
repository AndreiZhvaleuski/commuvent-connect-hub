import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Commuvent. Free for the community.</p>
        <nav className="flex gap-4">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/explore" className="hover:text-foreground">Explore</Link>
          <Link to="/become-a-host" className="hover:text-foreground">Host an event</Link>
        </nav>
      </div>
    </footer>
  );
}

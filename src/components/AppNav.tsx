import { Link } from "@tanstack/react-router";
import { CalendarCheck, Hospital as HospitalIcon, Search } from "lucide-react";

import { ThemeToggle } from "@/lib/theme";

const link =
  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const active = "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-2 flex items-center gap-2 font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
            <HospitalIcon className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">SaúdePerto</span>
        </Link>
        <Link to="/" className={link} activeOptions={{ exact: true }} activeProps={{ className: `${link} ${active}` }}>
          Início
        </Link>
        <Link to="/buscar" className={link} activeProps={{ className: `${link} ${active}` }}>
          <Search className="h-4 w-4" />
          Buscar
        </Link>
        <Link
          to="/agendamentos"
          className={link}
          activeProps={{ className: `${link} ${active}` }}
        >
          <CalendarCheck className="h-4 w-4" />
          Agendamentos
        </Link>
        <ThemeToggle className="ml-auto" />
      </nav>
    </header>
  );
}

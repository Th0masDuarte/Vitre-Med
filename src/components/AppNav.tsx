import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, LogIn, LogOut, Search, User } from "lucide-react";

import { ThemeToggle } from "@/lib/theme";
import logoAsset from "@/assets/vitre-med-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

const link =
  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const active = "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";

export function AppNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useSession();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/entrar", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-2 flex items-center gap-2 font-semibold text-foreground">
          <img
            src={logoAsset.url}
            alt="Vitre-Med"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="hidden sm:inline">Vitre-Med</span>
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

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <span className="hidden max-w-[10rem] items-center gap-1.5 truncate text-sm text-muted-foreground sm:inline-flex">
                <User className="h-4 w-4 shrink-0" />
                {profile?.nome || user.email}
              </span>
              <button type="button" onClick={handleSignOut} className={link} title="Sair">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </>
          ) : (
            <Link to="/entrar" className={link}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

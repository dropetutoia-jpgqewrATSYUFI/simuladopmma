import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listLeads, listAttempts } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, FileCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/diagnostico-pmma/")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel Administrativo — Diagnóstico PMMA" },
      { name: "description", content: "Gestão de leads e questões do Diagnóstico PMMA Edital360." },
    ],
  }),
});

function AdminPage() {
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const listLeadsFn = useServerFn(listLeads);
  const listAttemptsFn = useServerFn(listAttempts);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (!session) {
        navigate({ to: "/auth" });
        return;
      }

      const { data } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!data) {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
        return;
      }

      setIsAdmin(true);
      setSessionChecked(true);
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: () => listLeadsFn({ data: { limit: 100 } }),
    enabled: isAdmin === true,
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ["admin-attempts"],
    queryFn: () => listAttemptsFn({ data: { limit: 100 } }),
    enabled: isAdmin === true,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!sessionChecked || isAdmin !== true) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Diagnóstico PMMA</h1>
            <p className="text-sm text-muted-foreground">Gestão de leads, tentativas e questões.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/">Voltar ao site</Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">
              <Users className="mr-2 h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="attempts">
              <FileCheck className="mr-2 h-4 w-4" />
              Tentativas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Leads capturados</CardTitle>
                <CardDescription>Total: {leads?.length ?? 0}</CardDescription>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left">
                        <tr>
                          <th className="pb-2 font-medium">Nome</th>
                          <th className="pb-2 font-medium">E-mail</th>
                          <th className="pb-2 font-medium">Telefone</th>
                          <th className="pb-2 font-medium">Cidade</th>
                          <th className="pb-2 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {leads?.map((lead) => (
                          <tr key={lead.id}>
                            <td className="py-2">{lead.name}</td>
                            <td className="py-2">{lead.email}</td>
                            <td className="py-2">{lead.phone ?? "—"}</td>
                            <td className="py-2">{lead.city ?? "—"}</td>
                            <td className="py-2">
                              {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attempts">
            <Card>
              <CardHeader>
                <CardTitle>Tentativas</CardTitle>
                <CardDescription>Total: {attempts?.length ?? 0}</CardDescription>
              </CardHeader>
              <CardContent>
                {attemptsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left">
                        <tr>
                          <th className="pb-2 font-medium">Modo</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Score</th>
                          <th className="pb-2 font-medium">Token</th>
                          <th className="pb-2 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attempts?.map((attempt) => (
                          <tr key={attempt.id}>
                            <td className="py-2 capitalize">{attempt.mode}</td>
                            <td className="py-2 capitalize">{attempt.status}</td>
                            <td className="py-2">{attempt.score ?? "—"}</td>
                            <td className="py-2 font-mono text-xs">{attempt.public_token}</td>
                            <td className="py-2">
                              {new Date(attempt.created_at).toLocaleDateString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  pmmaListAttempts,
  pmmaListLeads,
  pmmaListQuestions,
  pmmaOverview,
} from "@/lib/pmma-admin.functions";

export const Route = createFileRoute("/admin/quiz-pmma/")({
  head: () => ({
    meta: [
      { title: "Quiz PMMA — Painel Edital360" },
      { name: "description", content: "Painel administrativo do Desafio PMMA da Edital360." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminQuizPmma,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function AdminQuizPmma() {
  const overviewFn = useServerFn(pmmaOverview);
  const leadsFn = useServerFn(pmmaListLeads);
  const attemptsFn = useServerFn(pmmaListAttempts);
  const questionsFn = useServerFn(pmmaListQuestions);

  const overview = useQuery({ queryKey: ["pmma", "overview"], queryFn: () => overviewFn({}) });
  const leads = useQuery({ queryKey: ["pmma", "leads"], queryFn: () => leadsFn({ data: {} }) });
  const attempts = useQuery({
    queryKey: ["pmma", "attempts"],
    queryFn: () => attemptsFn({ data: {} }),
  });
  const questions = useQuery({ queryKey: ["pmma", "questions"], queryFn: () => questionsFn({}) });

  const error = overview.error ?? leads.error ?? attempts.error ?? questions.error;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Quiz PMMA</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Visão geral do funil, questões, leads e tentativas do Desafio PMMA.
      </p>

      {error ? (
        <Card className="mt-6 border-destructive/40 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar os dados."} É necessário
          estar autenticado como administrador.
        </Card>
      ) : null}

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="questions">Questões</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="attempts">Tentativas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {overview.data ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Visitantes únicos" value={overview.data.uniqueVisitors} />
                <Stat label="Cliques em começar" value={overview.data.startClicks} />
                <Stat label="Chegaram à questão 4" value={overview.data.reachedCapture} />
                <Stat label="Leads capturados" value={overview.data.leads} />
                <Stat label="Taxa de captura" value={`${overview.data.captureRate}%`} />
                <Stat label="Quizzes concluídos" value={overview.data.completed} />
                <Stat label="Taxa de conclusão" value={`${overview.data.completionRate}%`} />
                <Stat
                  label="Maior abandono na questão"
                  value={overview.data.abandonmentQuestion ?? "—"}
                />
                <Stat label="Cliques na oferta" value={overview.data.offerClicks} />
                <Stat label="Cliques no WhatsApp" value={overview.data.whatsappClicks} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Card className="p-4">
                  <h2 className="text-sm font-semibold">Questões com mais erros</h2>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {overview.data.topErrorQuestions.map(([code, count]) => (
                      <li key={code}>
                        {code} — {count} erros
                      </li>
                    ))}
                    {overview.data.topErrorQuestions.length === 0 ? <li>Sem dados ainda.</li> : null}
                  </ul>
                </Card>
                <Card className="p-4">
                  <h2 className="text-sm font-semibold">Disciplinas com mais erros</h2>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {overview.data.topErrorDisciplines.map(([name, count]) => (
                      <li key={name}>
                        {name} — {count} erros
                      </li>
                    ))}
                    {overview.data.topErrorDisciplines.length === 0 ? (
                      <li>Sem dados ainda.</li>
                    ) : null}
                  </ul>
                </Card>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          )}
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Gabarito</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Revisão</TableHead>
                  <TableHead>Ativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(questions.data ?? []).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-xs">{q.public_code}</TableCell>
                    <TableCell>{q.discipline}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{q.topic}</TableCell>
                    <TableCell>{q.correct_answer ? "CERTO" : "ERRADO"}</TableCell>
                    <TableCell>{q.difficulty}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.pedagogical_review_status}</Badge>
                    </TableCell>
                    <TableCell>{q.is_active ? "Sim" : "Não"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Consentimento</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(leads.data ?? []).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.first_name}</TableCell>
                    <TableCell className="font-mono text-xs">{lead.whatsapp_e164}</TableCell>
                    <TableCell className="font-mono text-xs">{lead.email ?? "—"}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell className="text-xs">
                      {[lead.utm_source, lead.utm_medium, lead.utm_campaign]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {lead.consent_at ? new Date(lead.consent_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(lead.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            WhatsApp e e-mail são exibidos mascarados por padrão.
          </p>
        </TabsContent>

        <TabsContent value="attempts" className="mt-4">
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Acertos</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Questão atual</TableHead>
                  <TableHead>Sequência</TableHead>
                  <TableHead>Bônus</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Início</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attempts.data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.status}</TableCell>
                    <TableCell>
                      {a.correct_count}/{a.total_questions}
                    </TableCell>
                    <TableCell>{a.percentage}%</TableCell>
                    <TableCell>{a.current_question_index}</TableCell>
                    <TableCell>{a.best_streak}</TableCell>
                    <TableCell>{a.bonus_answered ? "Sim" : "Não"}</TableCell>
                    <TableCell>{a.device_type ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(a.started_at).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

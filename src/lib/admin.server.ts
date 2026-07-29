import type { AdminLead, AdminOverview, AdminQuestion } from "./admin.types";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export async function getOverview(): Promise<AdminOverview> {
  const db = await admin();

  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const [attemptsRes, leadsRes, questionsRes, answersRes] = await Promise.all([
    db
      .from("pmma_attempts")
      .select("id, status, percentage, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    db.from("pmma_leads").select("id, created_at").limit(5000),
    db.from("pmma_questions").select("id, discipline").eq("is_active", true).limit(500),
    db
      .from("pmma_attempt_questions")
      .select("question_id, is_correct, answered_at")
      .not("answered_at", "is", null)
      .limit(20000),
  ]);

  const attempts = attemptsRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const questions = questionsRes.data ?? [];
  const answers = answersRes.data ?? [];

  const completed = attempts.filter((a) => a.status === "completed");
  const avgScore = completed.length
    ? completed.reduce((s, a) => s + Number(a.percentage ?? 0), 0) / completed.length
    : 0;

  const days: { date: string; attempts: number; leads: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      attempts: attempts.filter((a) => dayKey(a.created_at) === key).length,
      leads: leads.filter((l) => dayKey(l.created_at) === key).length,
    });
  }

  const byQuestion = new Map(questions.map((q) => [q.id, q.discipline]));
  const disciplineMap = new Map<string, { answered: number; correct: number }>();
  for (const a of answers) {
    const discipline = byQuestion.get(a.question_id);
    if (!discipline) continue;
    const entry = disciplineMap.get(discipline) ?? { answered: 0, correct: 0 };
    entry.answered += 1;
    if (a.is_correct) entry.correct += 1;
    disciplineMap.set(discipline, entry);
  }

  return {
    totalAttempts: attempts.length,
    completedAttempts: completed.length,
    totalLeads: leads.length,
    avgScore: Math.round(avgScore * 10) / 10,
    conversionRate: attempts.length ? Math.round((leads.length / attempts.length) * 1000) / 10 : 0,
    last7Days: days,
    disciplines: [...disciplineMap.entries()]
      .map(([discipline, v]) => ({
        discipline,
        answered: v.answered,
        correct: v.correct,
        accuracy: v.answered ? Math.round((v.correct / v.answered) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy),
  };
}

export async function listLeads(search: string, limit: number): Promise<AdminLead[]> {
  const db = await admin();

  let query = db
    .from("pmma_leads")
    .select(
      "id, first_name, whatsapp_e164, email, consent, source, utm_source, utm_medium, utm_campaign, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const term = search.trim();
  if (term) {
    const safe = term.replace(/[,%()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `first_name.ilike.%${safe}%,whatsapp_e164.ilike.%${safe}%,email.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: attempts } = await db
    .from("pmma_attempts")
    .select("lead_id, percentage, correct_count, total_questions, completed_at")
    .in(
      "lead_id",
      rows.map((r) => r.id),
    );

  const byLead = new Map<string, { percentage: number; correct: number; total: number }>();
  for (const a of attempts ?? []) {
    if (!a.lead_id) continue;
    if (!byLead.has(a.lead_id) || a.completed_at) {
      byLead.set(a.lead_id, {
        percentage: Number(a.percentage ?? 0),
        correct: a.correct_count ?? 0,
        total: a.total_questions ?? 0,
      });
    }
  }

  return rows.map((r) => {
    const stat = byLead.get(r.id);
    return {
      id: r.id,
      firstName: r.first_name,
      whatsapp: r.whatsapp_e164,
      email: r.email,
      consent: r.consent,
      source: r.source,
      utmSource: r.utm_source,
      utmMedium: r.utm_medium,
      utmCampaign: r.utm_campaign,
      createdAt: r.created_at,
      score: stat ? stat.percentage : null,
      correctCount: stat ? stat.correct : null,
      totalQuestions: stat ? stat.total : null,
    };
  });
}

export async function leadsCsv(): Promise<string> {
  const leads = await listLeads("", 5000);
  const header = [
    "nome",
    "whatsapp",
    "email",
    "consentimento",
    "origem",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "acertos",
    "total",
    "percentual",
    "criado_em",
  ];
  const escape = (value: string | number | boolean | null) => {
    const raw = value === null || value === undefined ? "" : String(value);
    // Prevent CSV formula injection in spreadsheet apps.
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [header.join(",")];
  for (const l of leads) {
    lines.push(
      [
        l.firstName,
        l.whatsapp,
        l.email,
        l.consent ? "sim" : "nao",
        l.source,
        l.utmSource,
        l.utmMedium,
        l.utmCampaign,
        l.correctCount,
        l.totalQuestions,
        l.score,
        l.createdAt,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function listQuestions(): Promise<AdminQuestion[]> {
  const db = await admin();
  const [questionsRes, answersRes] = await Promise.all([
    db
      .from("pmma_questions")
      .select(
        "id, public_code, discipline, topic, statement, correct_answer, difficulty, is_active, sort_order",
      )
      .order("discipline", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(500),
    db
      .from("pmma_attempt_questions")
      .select("question_id, is_correct")
      .not("answered_at", "is", null)
      .limit(20000),
  ]);

  if (questionsRes.error) throw new Error(questionsRes.error.message);

  const stats = new Map<string, { answered: number; correct: number }>();
  for (const a of answersRes.data ?? []) {
    const entry = stats.get(a.question_id) ?? { answered: 0, correct: 0 };
    entry.answered += 1;
    if (a.is_correct) entry.correct += 1;
    stats.set(a.question_id, entry);
  }

  return (questionsRes.data ?? []).map((q) => {
    const stat = stats.get(q.id) ?? { answered: 0, correct: 0 };
    return {
      id: q.id,
      publicCode: q.public_code,
      discipline: q.discipline,
      topic: q.topic,
      statement: q.statement,
      correctAnswer: q.correct_answer,
      difficulty: q.difficulty,
      isActive: q.is_active,
      sortOrder: q.sort_order,
      answered: stat.answered,
      correct: stat.correct,
      accuracy: stat.answered ? Math.round((stat.correct / stat.answered) * 1000) / 10 : null,
    };
  });
}

export async function setQuestionActive(id: string, isActive: boolean) {
  const db = await admin();
  const { error } = await db
    .from("pmma_questions")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

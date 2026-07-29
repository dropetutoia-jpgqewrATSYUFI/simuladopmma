import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { adminListUsers, adminSetUserAccess, adminUserAccess } from "@/lib/admin-manage.functions";
import type { AdminAccessRow, AdminUser } from "@/lib/admin-manage.server";

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-primary";

export function AdminAccessPanel() {
  const listUsers = useServerFn(adminListUsers);
  const loadAccess = useServerFn(adminUserAccess);
  const setAccess = useServerFn(adminSetUserAccess);

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [rows, setRows] = useState<AdminAccessRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const search_ = useCallback(
    async (term: string) => {
      setBusy(true);
      setMessage(null);
      try {
        setUsers(await listUsers({ data: { search: term } }));
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Falha ao buscar usuários.");
      } finally {
        setBusy(false);
      }
    },
    [listUsers],
  );

  useEffect(() => {
    void search_("");
  }, [search_]);

  async function pick(user: AdminUser) {
    setSelected(user);
    setRows([]);
    setBusy(true);
    setMessage(null);
    try {
      setRows(await loadAccess({ data: { userId: user.id } }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao carregar acessos.");
    } finally {
      setBusy(false);
    }
  }

  async function change(row: AdminAccessRow, status: "released" | "blocked") {
    setBusy(true);
    setMessage(null);
    try {
      await setAccess({ data: { userId: row.userId, campaignId: row.campaignId, status } });
      setRows((prev) =>
        prev.map((r) => (r.campaignId === row.campaignId ? { ...r, status } : r)),
      );
      setMessage(
        status === "released"
          ? `Acesso liberado: ${row.campaignName}. O aluno já pode iniciar agora.`
          : `Acesso bloqueado: ${row.campaignName}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao atualizar acesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
        <h2 className="font-display text-lg font-semibold text-white">
          Liberar simulado pago para um aluno
        </h2>
        <p className="mt-1 text-sm text-white/65">
          Busque a pessoa, escolha o simulado e clique em <strong>Liberar</strong>. A liberação vale
          na hora, sem precisar de pagamento.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search_(search);
          }}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, e-mail ou WhatsApp do aluno"
            className={`min-w-[240px] flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            Buscar
          </button>
        </form>
      </div>

      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]">
          <p className="border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Alunos ({users.length})
          </p>
          <div className="max-h-[520px] overflow-y-auto">
            {users.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-white/50">
                {busy ? "Carregando..." : "Nenhum aluno encontrado."}
              </p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => void pick(u)}
                  className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-0 ${
                    selected?.id === u.id ? "bg-primary/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">
                    {(u.fullName ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {u.fullName ?? "Sem nome"}
                    </span>
                    <span className="block truncate text-xs text-white/50">
                      {u.email ?? u.phone ?? "—"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-white/60">
                    {u.releasedSimulados} lib.
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
          {!selected ? (
            <p className="py-16 text-center text-sm text-white/50">
              Selecione um aluno na lista ao lado para gerenciar os simulados.
            </p>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                Acessos de
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-white">
                {selected.fullName ?? selected.email ?? selected.id}
              </h3>
              <p className="text-xs text-white/50">{selected.email ?? "—"}</p>

              <div className="mt-5 space-y-2">
                {rows.length === 0 ? (
                  <p className="text-sm text-white/50">
                    {busy ? "Carregando simulados..." : "Nenhum simulado cadastrado."}
                  </p>
                ) : (
                  rows.map((row) => (
                    <div
                      key={row.campaignId}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {row.campaignName}
                        </p>
                        <p className="text-xs text-white/45">
                          {row.isPaid ? "Simulado pago" : "Simulado gratuito"} · {row.campaignSlug}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          row.status === "released"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-white/10 text-white/55"
                        }`}
                      >
                        {row.status === "released" ? "Liberado" : "Bloqueado"}
                      </span>
                      {row.status === "released" ? (
                        <button
                          disabled={busy}
                          onClick={() => void change(row, "blocked")}
                          className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => void change(row, "released")}
                          className="h-9 rounded-lg bg-emerald-500 px-4 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          Liberar
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

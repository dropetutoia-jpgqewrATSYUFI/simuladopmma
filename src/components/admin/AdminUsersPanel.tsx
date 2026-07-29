import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  adminDeleteUsers,
  adminListUsers,
  adminResetUserPassword,
  adminSetUserAccess,
  adminUpdateUser,
  adminUserAccess,
} from "@/lib/admin-manage.functions";
import type { AdminAccessRow, AdminUser } from "@/lib/admin-manage.server";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-primary";

export function AdminUsersPanel({ currentUserId }: { currentUserId: string }) {
  const listUsers = useServerFn(adminListUsers);
  const updateUser = useServerFn(adminUpdateUser);
  const deleteUsers = useServerFn(adminDeleteUsers);
  const resetPassword = useServerFn(adminResetUserPassword);
  const loadAccess = useServerFn(adminUserAccess);
  const setAccess = useServerFn(adminSetUserAccess);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [access, setAccessRows] = useState<AdminAccessRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(
    async (term = search) => {
      setBusy(true);
      try {
        setUsers(await listUsers({ data: { search: term } }));
        setSelected(new Set());
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Falha ao carregar usuários.");
      } finally {
        setBusy(false);
      }
    },
    [listUsers, search],
  );

  useEffect(() => {
    void refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === users.length ? new Set() : new Set(users.map((u) => u.id)),
    );
  }

  async function openEditor(user: AdminUser) {
    setEditing(user);
    setAccessRows([]);
    try {
      setAccessRows(await loadAccess({ data: { userId: user.id } }));
    } catch {
      /* acesso opcional */
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      await updateUser({
        data: {
          userId: editing.id,
          fullName: String(form.get("fullName") ?? "").trim() || null,
          phone: String(form.get("phone") ?? "").trim() || null,
          city: String(form.get("city") ?? "").trim() || null,
          email: String(form.get("email") ?? "").trim() || undefined,
          isAdmin: form.get("isAdmin") === "on",
        },
      });
      const password = String(form.get("password") ?? "").trim();
      if (password) await resetPassword({ data: { userId: editing.id, password } });
      setMessage("Usuário atualizado.");
      setEditing(null);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await deleteUsers({ data: { userIds: [...selected] } });
      setMessage(
        `${result.deleted} usuário(s) excluído(s).` +
          (result.skipped ? ` ${result.skipped} ignorado(s) (sua conta).` : "") +
          (result.failed ? ` ${result.failed} com erro.` : ""),
      );
      setConfirmDelete(false);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccess(row: AdminAccessRow, status: "released" | "blocked") {
    setBusy(true);
    try {
      await setAccess({ data: { userId: row.userId, campaignId: row.campaignId, status } });
      setAccessRows((prev) =>
        prev.map((r) => (r.campaignId === row.campaignId ? { ...r, status } : r)),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void refresh();
          }}
          className="flex min-w-[240px] flex-1 gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            Buscar
          </button>
        </form>
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={busy || selected.size === 0}
          className="h-11 rounded-xl border border-red-500/40 bg-red-500/10 px-5 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
        >
          Excluir selecionados ({selected.size})
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/55">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleAll}
                  className="size-4 accent-[#3B82F6]"
                />
              </th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Simulados</th>
              <th className="px-4 py-3">Pagamentos</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/50">
                  {busy ? "Carregando..." : "Nenhum usuário encontrado."}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-white/5 last:border-0 ${selected.has(u.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="size-4 accent-[#3B82F6]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{u.fullName ?? "Sem nome"}</p>
                    <div className="mt-1 flex gap-1.5">
                      {u.isAdmin ? (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                          Admin
                        </span>
                      ) : null}
                      {u.id === currentUserId ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                          Você
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    <p>{u.email ?? "—"}</p>
                    <p className="text-xs text-white/45">{u.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {u.completedAttempts}/{u.attempts} concluídos
                    <p className="text-xs text-white/45">{u.releasedSimulados} liberado(s)</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {u.paidPurchases} pago(s)
                    <p className="text-xs text-emerald-400">
                      {u.totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/55">
                    {formatDate(u.createdAt)}
                    <p className="text-white/35">Último acesso: {formatDate(u.lastSignInAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void openEditor(u)}
                      className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold text-white transition hover:border-primary/50 hover:bg-primary/10"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1220] p-6">
            <h3 className="font-display text-lg font-bold text-white">Excluir usuários</h3>
            <p className="mt-2 text-sm text-white/70">
              {selected.size} conta(s) serão removidas permanentemente, junto com tentativas,
              compras e acessos. Essa ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="h-11 flex-1 rounded-xl border border-white/15 text-sm font-semibold text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="h-11 flex-1 rounded-xl bg-red-500 text-sm font-bold text-white disabled:opacity-60"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <form
            onSubmit={handleSave}
            className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B1220] p-6"
          >
            <h3 className="font-display text-lg font-bold text-white">Editar usuário</h3>
            <p className="mt-1 text-xs text-white/50">{editing.id}</p>

            <div className="mt-5 space-y-3">
              <label className="block text-sm text-white/70">
                Nome completo
                <input name="fullName" defaultValue={editing.fullName ?? ""} className={`mt-1 ${inputClass}`} />
              </label>
              <label className="block text-sm text-white/70">
                E-mail
                <input name="email" type="email" defaultValue={editing.email ?? ""} className={`mt-1 ${inputClass}`} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-white/70">
                  WhatsApp
                  <input name="phone" defaultValue={editing.phone ?? ""} className={`mt-1 ${inputClass}`} />
                </label>
                <label className="block text-sm text-white/70">
                  Cidade
                  <input name="city" defaultValue={editing.city ?? ""} className={`mt-1 ${inputClass}`} />
                </label>
              </div>
              <label className="block text-sm text-white/70">
                Nova senha (opcional)
                <input name="password" type="text" placeholder="Deixe em branco para manter" className={`mt-1 ${inputClass}`} />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <input
                  name="isAdmin"
                  type="checkbox"
                  defaultChecked={editing.isAdmin}
                  disabled={editing.id === currentUserId}
                  className="size-4 accent-[#F59E0B]"
                />
                Administrador (acesso total, sem pagamento)
              </label>
            </div>

            {access.length > 0 ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-white/55">
                  Acesso aos simulados
                </p>
                <div className="mt-3 space-y-2">
                  {access.map((row) => (
                    <div key={row.campaignId} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-white/85">{row.campaignName}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void handleAccess(row, row.status === "released" ? "blocked" : "released")
                        }
                        className={`h-8 rounded-full px-3 text-xs font-bold transition ${
                          row.status === "released"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {row.status === "released" ? "Liberado" : "Bloqueado"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-11 flex-1 rounded-xl border border-white/15 text-sm font-semibold text-white"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

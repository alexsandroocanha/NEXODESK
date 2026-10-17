import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Check,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
  Package,
  ArrowLeftRight,
  Pencil,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "./api";
import type { ReactNode } from "react";

type StockItem = {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minimum_quantity: number;
  unit: string;
  location: number | null;
  location_name: string;
  active: boolean;
  is_low_stock: boolean;
};

type StockMovement = {
  id: number;
  item: number;
  item_name: string;
  sku: string;
  movement_type: "entry" | "exit";
  quantity: number;
  note: string;
  created_by_username: string;
  created_at: string;
};

type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

type Location = { id: number; name: string; section: string; active: boolean };
type Reason = { id: number; name: string; active: boolean };
type Equipment = { id: number; name: string; active: boolean };

type Ticket = {
  id: number;
  location: number;
  location_name: string;
  reasons: number[];
  reason_names: string[];
  equipment: number[];
  equipment_names: string[];
  description: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  created_by_username: string;
};

type Stats = {
  total: number;
  week_total: number;
  by_location: {
    location_id: number;
    location: string;
    section: string;
    ticket_count: number;
    last_ticket_at: string;
    last_reason: string;
    top_equipment: string;
  }[];
  alerts: {
    location: string;
    reason: string;
    equipment: string;
    count: number;
    total: number;
    percentage: number;
  }[];
};

const statusNames: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const dateLabel = (v: string | null) =>
  v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(v)) : "—";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerMode, setRegisterMode] = useState(false);
  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [stockForm, setStockForm] = useState({
    name: "", sku: "", category: "", quantity: "0",
    minimum_quantity: "0", unit: "unidade", location: "",
  });
  const [movementForm, setMovementForm] = useState({
    item: "", movement_type: "entry" as "entry" | "exit", quantity: "1", note: "",
  });
  const [stockMode, setStockMode] = useState<"item" | "movement">("item");
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [userBeingEdited, setUserBeingEdited] = useState<number | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "delete" | "catalog" | "user" | "user-edit" | null>(null);
  const [catalogType, setCatalogType] = useState("locations");
  const [catalogName, setCatalogName] = useState("");
  const [catalogSection, setCatalogSection] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [marked, setMarked] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    location: "", reason: "", equipment: "", section: "", start: "", end: "",
  });
  const [form, setForm] = useState({
    location: "", reasons: [] as number[], equipment: [] as number[],
    description: "", started_at: "", ended_at: "", status: "open",
  });
  const [newUser, setNewUser] = useState({
    username: "", email: "", password: "", is_active: true,
    is_staff: false, is_superuser: false,
  });

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const logout = useCallback(() => {
    const refreshToken = sessionStorage.getItem("nexo_refresh");

    if (refreshToken) {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";
      void fetch(`${apiUrl}/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      }).catch(() => undefined);
    }

    sessionStorage.removeItem("nexo_access");
    sessionStorage.removeItem("nexo_refresh");
    setUser(null);
  }, []);

  const params = useCallback(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    [filters],
  );

  const loadRefs = useCallback(async () => {
    const [locationResponse, reasonResponse, equipmentResponse] = await Promise.all([
      api.get("/locations/"),
      api.get("/reasons/"),
      api.get("/equipment/"),
    ]);

    setLocations(locationResponse.data.results ?? locationResponse.data);
    setReasons(reasonResponse.data.results ?? reasonResponse.data);
    setEquipment(equipmentResponse.data.results ?? equipmentResponse.data);
  }, []);

  const loadStock = useCallback(async () => {
    const [itemResponse, movementResponse] = await Promise.all([
      api.get("/stock/items/"),
      api.get("/stock/movements/"),
    ]);

    setStockItems(itemResponse.data.results ?? itemResponse.data);
    setStockMovements(movementResponse.data.results ?? movementResponse.data);
  }, []);

  const loadTickets = useCallback(async () => {
    const response = await api.get("/tickets/", {
      params: { ...params(), month: "last" },
    });
    setTickets(response.data.results ?? response.data);
  }, [params]);

  const loadStats = useCallback(async () => {
    const response = await api.get("/tickets/statistics/", { params: params() });
    setStats(response.data);
  }, [params]);

  const loadUsers = useCallback(async () => {
    if (!user?.is_superuser) return;

    const response = await api.get("/users/");
    setUsers(response.data.results ?? response.data);
  }, [user]);

  useEffect(() => {
    if (sessionStorage.getItem("nexo_access")) {
      api.get("/me/").then(r => setUser(r.data)).catch(logout);
    }

    const f = () => logout();
    window.addEventListener("nexo:logout", f);
    return () => window.removeEventListener("nexo:logout", f);
  }, [logout]);

  useEffect(() => {
    if (user) {
      Promise.all([loadRefs(), loadTickets(), loadStats(), loadUsers(), loadStock()])
        .catch(() => flash("Erro ao carregar dados. Confira a API e suas permissões."));
    }
  }, [user, loadRefs, loadTickets, loadStats, loadUsers, loadStock]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    const button = document.getElementById("google-signin-button");

    if (user || !clientId || !button) return;

    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const result = await api.post("/auth/google/", {
              credential: response.credential,
            });
            sessionStorage.setItem("nexo_access", result.data.access);
            sessionStorage.setItem("nexo_refresh", result.data.refresh);
            setUser((await api.get("/me/")).data);
          } catch (error: any) {
            flash(error.response?.data?.detail ?? "Não foi possível autenticar com o Google.");
          }
        },
      });

      window.google.accounts.id.renderButton(button, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
        locale: "pt-BR",
      });
    };

    const googleScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (window.google) {
      renderGoogleButton();
    } else {
      googleScript?.addEventListener("load", renderGoogleButton, { once: true });
    }

    return () => {
      cancelled = true;
      googleScript?.removeEventListener("load", renderGoogleButton);
    };
  }, [user, registerMode]);

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await api.post("/auth/register/", registerForm);
      flash(response.data.detail ?? "Solicitação enviada para aprovação.");
      setRegisterMode(false);
      setRegisterForm({ username: "", email: "", password: "" });
    } catch (error: any) {
      flash(
        Array.isArray(error.response?.data?.detail)
          ? error.response.data.detail.join(" ")
          : (error.response?.data?.detail ?? "Não foi possível solicitar cadastro."),
      );
    } finally {
      setBusy(false);
    }
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await api.post("/auth/token/", { username, password });
      sessionStorage.setItem("nexo_access", response.data.access);
      sessionStorage.setItem("nexo_refresh", response.data.refresh);
      setUser((await api.get("/me/")).data);
      setPassword("");
    } catch {
      flash("Usuário ou senha inválidos.");
    } finally {
      setBusy(false);
    }
  };

  const openTicket = (ticket?: Ticket) => {
    setSelected(ticket ?? null);
    setError("");
    setForm(ticket ? {
      location: String(ticket.location),
      reasons: ticket.reasons,
      equipment: ticket.equipment,
      description: ticket.description,
      started_at: ticket.started_at.slice(0, 16),
      ended_at: ticket.ended_at?.slice(0, 16) ?? "",
      status: ticket.status,
    } : {
      location: "", reasons: [], equipment: [], description: "",
      started_at: "", ended_at: "", status: "open",
    });
    setModal(ticket ? "edit" : "create");
  };

  const saveTicket = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.location || !form.reasons.length || !form.equipment.length || !form.started_at) {
      setError("Preencha posto, motivo, equipamento e início.");
      return;
    }

    const payload = {
      ...form,
      location: Number(form.location),
      started_at: new Date(form.started_at).toISOString(),
      ended_at: form.ended_at ? new Date(form.ended_at).toISOString() : null,
    };

    try {
      if (modal === "edit" && selected) {
        await api.patch(`/tickets/${selected.id}/`, payload);
      } else {
        await api.post("/tickets/", payload);
      }

      setModal(null);
      await Promise.all([loadTickets(), loadStats()]);
      flash("Chamado salvo com sucesso.");
    } catch (requestError: any) {
      setError(JSON.stringify(requestError.response?.data ?? "Falha ao salvar chamado."));
    }
  };

  const createCatalog = async (event: FormEvent) => {
    event.preventDefault();
    const payload = catalogType === "locations"
      ? { name: catalogName, section: catalogSection, active: true }
      : { name: catalogName, active: true };

    try {
      await api.post(`/${catalogType}/`, payload);
      await loadRefs();
      setModal(null);
      setCatalogName("");
      setCatalogSection("");
      flash("Cadastro adicionado.");
    } catch (requestError: any) {
      setError(JSON.stringify(requestError.response?.data ?? "Falha ao cadastrar."));
    }
  };

  const deleteTickets = async () => {
    if (!marked.length) {
      setError("Selecione pelo menos um chamado.");
      return;
    }

    try {
      for (const ticketId of marked) {
        await api.delete(`/tickets/${ticketId}/`);
      }

      setModal(null);
      setMarked([]);
      await Promise.all([loadTickets(), loadStats()]);
      flash("Chamados excluídos.");
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail ?? "Sem permissão para excluir.");
    }
  };

  const exportCsv = async () => {
    try {
      const response = await api.get("/tickets/export-csv/", {
        params: params(),
        responseType: "blob",
      });
      const downloadUrl = URL.createObjectURL(response.data);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = "estatisticas-chamados.csv";
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      flash("Erro ao exportar CSV.");
    }
  };

  const saveUser = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (modal === "user-edit" && userBeingEdited !== null) {
        const payload = { ...newUser };
        if (!payload.password) delete (payload as Partial<typeof payload>).password;
        await api.patch(`/users/${userBeingEdited}/`, payload);
        flash("Permissões do usuário atualizadas.");
      } else {
        await api.post("/users/", newUser);
        flash("Usuário criado.");
      }

      setModal(null);
      setUserBeingEdited(null);
      setNewUser({ username: "", email: "", password: "", is_active: true, is_staff: false, is_superuser: false });
      await loadUsers();
    } catch (err: any) {
      setError(JSON.stringify(err.response?.data ?? "Não foi possível salvar o usuário."));
    }
  };

  const editUser = (account: any) => {
    setUserBeingEdited(account.id);
    setNewUser({
      username: account.username,
      email: account.email ?? "",
      password: "",
      is_active: account.is_active,
      is_staff: account.is_staff,
      is_superuser: account.is_superuser,
    });
    setError("");
    setModal("user-edit");
  };

  const saveStockItem = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await api.post("/stock/items/", {
        ...stockForm,
        quantity: Number(stockForm.quantity),
        minimum_quantity: Number(stockForm.minimum_quantity),
        location: stockForm.location ? Number(stockForm.location) : null,
      });

      setStockForm({
        name: "", sku: "", category: "", quantity: "0",
        minimum_quantity: "0", unit: "unidade", location: "",
      });
      await loadStock();
      flash("Item de estoque cadastrado.");
    } catch (requestError: any) {
      setError(JSON.stringify(requestError.response?.data ?? "Não foi possível cadastrar o item."));
    }
  };

  const saveMovement = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await api.post("/stock/movements/", {
        ...movementForm,
        item: Number(movementForm.item),
        quantity: Number(movementForm.quantity),
      });

      setMovementForm({ item: "", movement_type: "entry", quantity: "1", note: "" });
      await loadStock();
      flash("Movimentação registrada.");
    } catch (requestError: any) {
      setError(JSON.stringify(requestError.response?.data ?? "Não foi possível registrar a movimentação."));
    }
  };

  const removeUser = async () => {
    if (userToDelete === null) return;

    try {
      await api.delete(`/users/${userToDelete}/`);
      setUserToDelete(null);
      await loadUsers();
      flash("Usuário excluído.");
    } catch {
      flash("Não foi possível excluir usuário.");
    }
  };

  if (!user) {
    return (
      <main className="login-wrap">
        <form className="login-card" onSubmit={registerMode ? submitRegistration : login}>
          <div className="logo">
            <Activity /> NEXO<span>DESK</span>
          </div>

          <small className="eyebrow">Chamados & Estoque</small>
          <h1>
            {registerMode ? <>Solicite seu<br />acesso.</> : <>Bom ter você<br />de volta.</>}
          </h1>
          <p>
            {registerMode
              ? "Crie sua solicitação. Um superadministrador precisa aprovar a conta antes do acesso."
              : "Acompanhe chamados, identifique padrões e mantenha tudo funcionando."}
          </p>

          {registerMode ? (
            <>
              <label>
                Usuário
                <input
                  value={registerForm.username}
                  onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha (mínimo 12 caracteres)
                <input
                  type="password"
                  minLength={12}
                  value={registerForm.password}
                  onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="primary wide" disabled={busy}>
                {busy ? "Enviando..." : "Solicitar cadastro"}
              </button>
              <button type="button" className="auth-switch" onClick={() => setRegisterMode(false)}>
                Já tenho uma conta · Voltar ao login
              </button>
            </>
          ) : (
            <>
              <label>
                Usuário
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary wide" disabled={busy}>
                {busy ? "Entrando..." : "Entrar na plataforma ↗"}
              </button>
              <button
                type="button"
                className="auth-switch"
                onClick={() => { setRegisterMode(true); setToast(""); }}
              >
                Não tem conta? Solicitar cadastro
              </button>
              <div className="login-divider"><span>ou continue com</span></div>
              <div id="google-signin-button" className="google-signin" />
              <small className="google-hint">
                O acesso social exige configuração do administrador e aprovação prévia da conta.
              </small>
            </>
          )}

          <footer>
            <ShieldCheck size={15} /> Acesso protegido por autenticação JWT
          </footer>
          {toast && <div className="toast">{toast}</div>}
        </form>
      </main>
    );
  }

  const nav = [
    { id: "dashboard", name: "Visão geral", icon: LayoutDashboard },
    { id: "tickets", name: "Chamados", icon: ClipboardList },
    { id: "inventory", name: "Estoque", icon: Package },
    { id: "statistics", name: "Estatísticas", icon: BarChart3 },
    { id: "settings", name: "Cadastros", icon: Settings2 },
    ...(user.is_superuser ? [{ id: "users", name: "Usuários", icon: Users }] : []),
  ];

  const filtered = tickets.filter(t =>
    [t.location_name, t.description, ...t.reason_names, ...t.equipment_names]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <Activity /> NEXO<span>DESK</span>
        </div>
        <div className="workspace">
          <small>WORKSPACE</small>
          <b>◈　Operações TI</b>
        </div>
        <small className="nav-title">MENU PRINCIPAL</small>
        {nav.map(n => (
          <button
            key={n.id}
            className={`nav ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
          >
            <n.icon size={18} />
            {n.name}
            {n.id === "statistics" && stats?.alerts.length ? <i>{stats.alerts.length}</i> : null}
          </button>
        ))}
        <div className="side-bottom">
          <div className="secure">
            <ShieldCheck />
            <b>Ambiente protegido</b>
            <small>Centralize chamados e operações.</small>
          </div>
          <button className="userline" onClick={logout}>
            <span className="avatar">{user.username[0].toUpperCase()}</span>
            <span>
              <b>{user.username}</b>
              <small>{user.is_superuser ? "Superusuário" : "Operador"}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span>
            Workspace　/　<b>{nav.find(n => n.id === page)?.name}</b>
          </span>
          <span className="online">
            ● Sistema operacional　 <b className="avatar">{user.username[0].toUpperCase()}</b>
          </span>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <small className="eyebrow">
                PAINEL DE CONTROLE　•　{new Date().toLocaleDateString("pt-BR")}
              </small>
              <h1>
                {nav.find(n => n.id === page)?.name}<em>.</em>
              </h1>
              <p>Acompanhe o volume, encontre padrões e antecipe problemas.</p>
            </div>
            {["dashboard", "tickets"].includes(page) && (
              <button className="primary" onClick={() => openTicket()}>
                <Plus size={17} /> Novo chamado
              </button>
            )}
          </div>

          {page === "dashboard" && (
            <>
              <div className="metrics">
                <Metric title="Chamados no período" value={stats?.total ?? 0} note="Com os filtros atuais" icon={<ClipboardList />} />
                <Metric title="Nesta semana" value={stats?.week_total ?? 0} note="Desde segunda-feira" icon={<Activity />} />
                <Metric title="Postos com registros" value={stats?.by_location.length ?? 0} note="Com chamados" icon={<MapPin />} />
                <Metric title="Alertas" value={stats?.alerts.length ?? 0} note="Acima de 40%" icon={<AlertTriangle />} />
              </div>

              <div className="grid-two">
                <section className="panel">
                  <PanelTitle title="Chamados por posto" subtitle="Ranking por volume registrado" />
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.by_location.slice(0, 8) ?? []}>
                        <defs>
                          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7869f7" stopOpacity={.3} />
                            <stop offset="100%" stopColor="#7869f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 4" vertical={false} />
                        <XAxis dataKey="location" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area dataKey="ticket_count" name="Chamados" stroke="#7869f7" fill="url(#fill)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel">
                  <PanelTitle title="Postos em destaque" subtitle="Maiores volumes no período" />
                  <div className="ranking">
                    {stats?.by_location.slice(0, 6).map((x, i) => (
                      <div className="rank" key={x.location_id}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <b>{x.location}</b>
                          <small>{x.section || "Sem seção"}</small>
                          <div className="track">
                            <i style={{ width: `${Math.min(100, x.ticket_count * 10)}%` }} />
                          </div>
                        </div>
                        <strong>{x.ticket_count}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="panel">
                <PanelTitle title="Alertas de recorrência" subtitle="Motivo + equipamento acima de 40% dos chamados do posto" />
                <Alerts alerts={stats?.alerts ?? []} />
              </section>

              <section className="panel">
                <PanelTitle title="Chamados recentes" subtitle="Últimos registros cadastrados" />
                <TicketTable tickets={tickets.slice(0, 5)} onEdit={openTicket} />
              </section>
            </>
          )}

          {page === "tickets" && (
            <section className="panel">
              <PanelTitle title="Todos os chamados" subtitle="Pesquise, edite ou remova registros" />
              <div className="toolbar">
                <input
                  placeholder="Buscar posto, motivo, equipamento..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button
                  className="secondary"
                  onClick={() => { setMarked([]); setError(""); setModal("delete"); }}
                >
                  <Trash2 size={16} /> Excluir selecionados
                </button>
              </div>
              <TicketTable tickets={filtered} onEdit={openTicket} />
            </section>
          )}

          {page === "inventory" && (
            <>
              <div className="metrics">
                <Metric title="Itens cadastrados" value={stockItems.length} note="Catálogo de estoque" icon={<Package />} />
                <Metric
                  title="Abaixo do mínimo"
                  value={stockItems.filter(item => item.is_low_stock).length}
                  note="Precisam de reposição"
                  icon={<AlertTriangle />}
                />
                <Metric title="Movimentações" value={stockMovements.length} note="Entradas e saídas registradas" icon={<ArrowLeftRight />} />
                <Metric
                  title="Unidades em estoque"
                  value={stockItems.reduce((total, item) => total + item.quantity, 0)}
                  note="Soma das quantidades"
                  icon={<Package />}
                />
              </div>

              <section className="panel">
                <PanelTitle title="Controle de estoque" subtitle="Cadastre materiais e registre cada entrada ou saída." />
                <div className="stock-tabs">
                  <button
                    className={stockMode === "item" ? "active" : ""}
                    onClick={() => { setStockMode("item"); setError(""); }}
                  >
                    Cadastrar item
                  </button>
                  <button
                    className={stockMode === "movement" ? "active" : ""}
                    onClick={() => { setStockMode("movement"); setError(""); }}
                  >
                    Movimentar estoque
                  </button>
                </div>

                {stockMode === "item" ? (
                  <form className="stock-form" onSubmit={saveStockItem}>
                    <label>
                      Nome do item
                      <input
                        required
                        maxLength={160}
                        value={stockForm.name}
                        onChange={e => setStockForm({ ...stockForm, name: e.target.value })}
                      />
                    </label>
                    <label>
                      SKU / código
                      <input
                        required
                        maxLength={80}
                        value={stockForm.sku}
                        onChange={e => setStockForm({ ...stockForm, sku: e.target.value })}
                        placeholder="Ex.: CABO-001"
                      />
                    </label>
                    <label>
                      Categoria
                      <input
                        value={stockForm.category}
                        onChange={e => setStockForm({ ...stockForm, category: e.target.value })}
                        placeholder="Ex.: Rede, periféricos"
                      />
                    </label>
                    <label>
                      Unidade
                      <input
                        required
                        value={stockForm.unit}
                        onChange={e => setStockForm({ ...stockForm, unit: e.target.value })}
                      />
                    </label>
                    <label>
                      Quantidade inicial
                      <input
                        type="number"
                        min="0"
                        required
                        value={stockForm.quantity}
                        onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
                      />
                    </label>
                    <label>
                      Estoque mínimo
                      <input
                        type="number"
                        min="0"
                        required
                        value={stockForm.minimum_quantity}
                        onChange={e => setStockForm({ ...stockForm, minimum_quantity: e.target.value })}
                      />
                    </label>
                    <label>
                      Posto/localidade
                      <select
                        value={stockForm.location}
                        onChange={e => setStockForm({ ...stockForm, location: e.target.value })}
                      >
                        <option value="">Estoque geral</option>
                        {locations.map(location => (
                          <option key={location.id} value={location.id}>{location.name}</option>
                        ))}
                      </select>
                    </label>
                    <div className="stock-submit">
                      <button className="primary">
                        <Plus size={16} /> Cadastrar item
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="stock-form" onSubmit={saveMovement}>
                    <label>
                      Item
                      <select
                        required
                        value={movementForm.item}
                        onChange={e => setMovementForm({ ...movementForm, item: e.target.value })}
                      >
                        <option value="">Selecione um item</option>
                        {stockItems.filter(item => item.active).map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} · disponível: {item.quantity} {item.unit}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tipo de movimentação
                      <select
                        value={movementForm.movement_type}
                        onChange={e => setMovementForm({ ...movementForm, movement_type: e.target.value as "entry" | "exit" })}
                      >
                        <option value="entry">Entrada</option>
                        <option value="exit">Saída</option>
                      </select>
                    </label>
                    <label>
                      Quantidade
                      <input
                        type="number"
                        min="1"
                        required
                        value={movementForm.quantity}
                        onChange={e => setMovementForm({ ...movementForm, quantity: e.target.value })}
                      />
                    </label>
                    <label>
                      Observação
                      <input
                        maxLength={500}
                        value={movementForm.note}
                        onChange={e => setMovementForm({ ...movementForm, note: e.target.value })}
                        placeholder="Ex.: Reposição, troca de equipamento"
                      />
                    </label>
                    <div className="stock-submit">
                      <button className="primary">
                        <ArrowLeftRight size={16} /> Registrar movimentação
                      </button>
                    </div>
                  </form>
                )}

                {error && <p className="error">{error}</p>}
              </section>

              <section className="panel">
                <div className="stock-heading">
                  <PanelTitle title="Itens em estoque" subtitle="Os itens abaixo do mínimo ficam destacados em vermelho." />
                  <input
                    placeholder="Buscar por nome, SKU ou categoria"
                    value={stockSearch}
                    onChange={e => setStockSearch(e.target.value)}
                  />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Categoria</th>
                        <th>Localidade</th>
                        <th>Quantidade</th>
                        <th>Mínimo</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockItems
                        .filter(item => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(stockSearch.toLowerCase()))
                        .map(item => (
                          <tr key={item.id}>
                            <td><b>{item.name}</b></td>
                            <td>{item.sku}</td>
                            <td>{item.category || "—"}</td>
                            <td>{item.location_name || "Estoque geral"}</td>
                            <td>{item.quantity} {item.unit}</td>
                            <td>{item.minimum_quantity} {item.unit}</td>
                            <td>
                              <span className={`stock-status ${item.is_low_stock ? "low" : "ok"}`}>
                                {item.is_low_stock ? "Repor estoque" : "Disponível"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!stockItems.length && <p className="empty">Nenhum item cadastrado. Use o formulário acima para começar.</p>}
                </div>
              </section>

              <section className="panel">
                <PanelTitle title="Movimentações recentes" subtitle="Histórico de entradas e saídas, com usuário responsável." />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Item</th>
                        <th>Tipo</th>
                        <th>Quantidade</th>
                        <th>Responsável</th>
                        <th>Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.slice(0, 15).map(movement => (
                        <tr key={movement.id}>
                          <td>{dateLabel(movement.created_at)}</td>
                          <td>
                            <b>{movement.item_name}</b>
                            <small>{movement.sku}</small>
                          </td>
                          <td>
                            <span className={`stock-status ${movement.movement_type === "entry" ? "ok" : "low"}`}>
                              {movement.movement_type === "entry" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td>{movement.quantity}</td>
                          <td>{movement.created_by_username || "—"}</td>
                          <td>{movement.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!stockMovements.length && <p className="empty">Nenhuma movimentação registrada.</p>}
                </div>
              </section>
            </>
          )}

          {page === "statistics" && (
            <>
              <section className="panel">
                <PanelTitle title="Filtros de análise" subtitle="Aplicados à tabela e ao CSV" />
                <div className="filters">
                  <Select
                    label="Posto"
                    value={filters.location}
                    onChange={v => setFilters({ ...filters, location: v })}
                    options={locations.map(x => [String(x.id), x.name] as [string, string])}
                  />
                  <Select
                    label="Seção"
                    value={filters.section}
                    onChange={v => setFilters({ ...filters, section: v })}
                    options={[...new Set(locations.map(x => x.section).filter(Boolean))].map(x => [x, x] as [string, string])}
                  />
                  <Select
                    label="Motivo"
                    value={filters.reason}
                    onChange={v => setFilters({ ...filters, reason: v })}
                    options={reasons.map(x => [String(x.id), x.name] as [string, string])}
                  />
                  <Select
                    label="Equipamento"
                    value={filters.equipment}
                    onChange={v => setFilters({ ...filters, equipment: v })}
                    options={equipment.map(x => [String(x.id), x.name] as [string, string])}
                  />
                  <label>
                    Data inicial
                    <input
                      type="date"
                      value={filters.start}
                      onChange={e => setFilters({ ...filters, start: e.target.value })}
                    />
                  </label>
                  <label>
                    Data final
                    <input
                      type="date"
                      value={filters.end}
                      onChange={e => setFilters({ ...filters, end: e.target.value })}
                    />
                  </label>
                </div>
                <button className="primary" onClick={() => void exportCsv()}>
                  <ArrowDownToLine size={16} /> Exportar CSV filtrado
                </button>
                <button
                  className="secondary clear"
                  onClick={() => setFilters({ location: "", reason: "", equipment: "", section: "", start: "", end: "" })}
                >
                  Limpar filtros
                </button>
              </section>

              <section className="panel">
                <PanelTitle title="Resumo por posto" subtitle="Template padronizado para análise operacional" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>NomeDoPosto</th>
                        <th>QuantidadeDeChamados</th>
                        <th>DataDoUltimoChamado</th>
                        <th>MotivoDoUltimoChamado</th>
                        <th>QualFoiOEquipamentoQueMaisTeveChamado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.by_location.map(x => (
                        <tr key={x.location_id}>
                          <td>
                            <b>{x.location}</b>
                            <small>{x.section}</small>
                          </td>
                          <td>{x.ticket_count}</td>
                          <td>{dateLabel(x.last_ticket_at)}</td>
                          <td>{x.last_reason}</td>
                          <td>{x.top_equipment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Alerts alerts={stats?.alerts ?? []} />
              </section>
            </>
          )}

          {page === "settings" && (
            <div className="catalogs">
              <Catalog
                title="Postos e localidades"
                icon={<MapPin />}
                items={locations.map(x => `${x.name} · ${x.section || "Sem seção"}`)}
                onAdd={() => { setCatalogType("locations"); setModal("catalog"); setError(""); }}
              />
              <Catalog
                title="Motivos dos chamados"
                icon={<Activity />}
                items={reasons.map(x => x.name)}
                onAdd={() => { setCatalogType("reasons"); setModal("catalog"); setError(""); }}
              />
              <Catalog
                title="Equipamentos"
                icon={<Wrench />}
                items={equipment.map(x => x.name)}
                onAdd={() => { setCatalogType("equipment"); setModal("catalog"); setError(""); }}
              />
              <div className="hint">
                <ShieldCheck /> Apenas o superusuário pode alterar os cadastros.
              </div>
            </div>
          )}

          {page === "users" && user.is_superuser && (
            <section className="panel">
              <PanelTitle title="Usuários da plataforma" subtitle="Contas e permissões" />
              <button className="primary" onClick={() => { setError(""); setModal("user"); }}>
                <Plus size={16} /> Novo usuário
              </button>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>E-mail</th>
                      <th>Acesso</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.email || "—"}</td>
                        <td>{u.is_superuser ? "Superusuário" : u.is_staff ? "Admin" : "Operador"}</td>
                        <td>{u.is_active ? "Ativo" : "Inativo"}</td>
                        <td>
                          <button
                            className="icon-btn"
                            title={u.is_active ? "Editar / desativar" : "Aprovar / editar"}
                            onClick={() => editUser(u)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            title="Excluir usuário"
                            onClick={() => setUserToDelete(u.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <footer className="footer">
          © {new Date().getFullYear()} NEXODESK <span>Feito para dar visibilidade ao que importa ◆</span>
          <span>v1.0.0</span>
        </footer>
      </main>

      {modal && (
        <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="modal">
            <header>
              <div>
                <h2>
                  {modal === "create"
                    ? "Novo chamado"
                    : modal === "edit"
                      ? `Editar chamado #${selected?.id}`
                      : modal === "delete"
                        ? "Excluir chamados"
                        : modal === "catalog"
                          ? "Adicionar cadastro"
                          : modal === "user-edit"
                            ? "Editar usuário e permissões"
                            : "Criar usuário"}
                </h2>
                <p>{modal === "delete" ? "Selecione os registros para exclusão." : "Preencha os dados abaixo."}</p>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)}>×</button>
            </header>

            {(modal === "create" || modal === "edit") && (
              <form onSubmit={saveTicket}>
                <div className="form-grid">
                  <label>
                    Posto
                    <select
                      required
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                    >
                      <option value="">Selecione um posto</option>
                      {locations.filter(x => x.active).map(x => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="link"
                      onClick={() => { setCatalogType("locations"); setModal("catalog"); }}
                    >
                      + Adicionar posto
                    </button>
                  </label>

                  <label>
                    Status
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {Object.entries(statusNames).map(([v, n]) => (
                        <option key={v} value={v}>{n}</option>
                      ))}
                    </select>
                  </label>

                  <fieldset>
                    <legend>Motivos do chamado</legend>
                    <div className="choices">
                      {reasons.filter(x => x.active).map(x => (
                        <label key={x.id}>
                          <input
                            type="checkbox"
                            checked={form.reasons.includes(x.id)}
                            onChange={e => setForm({
                              ...form,
                              reasons: e.target.checked
                                ? [...form.reasons, x.id]
                                : form.reasons.filter(id => id !== x.id),
                            })}
                          />
                          {x.name}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="link"
                      onClick={() => { setCatalogType("reasons"); setModal("catalog"); }}
                    >
                      + Adicionar motivo
                    </button>
                  </fieldset>

                  <fieldset>
                    <legend>Equipamentos afetados</legend>
                    <div className="choices">
                      {equipment.filter(x => x.active).map(x => (
                        <label key={x.id}>
                          <input
                            type="checkbox"
                            checked={form.equipment.includes(x.id)}
                            onChange={e => setForm({
                              ...form,
                              equipment: e.target.checked
                                ? [...form.equipment, x.id]
                                : form.equipment.filter(id => id !== x.id),
                            })}
                          />
                          {x.name}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="link"
                      onClick={() => { setCatalogType("equipment"); setModal("catalog"); }}
                    >
                      + Adicionar equipamento
                    </button>
                  </fieldset>

                  <label className="span-two">
                    Descrição
                    <textarea
                      required
                      minLength={3}
                      maxLength={5000}
                      rows={4}
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Detalhes do problema e ações realizadas"
                    />
                  </label>
                  <label>
                    Início do chamado
                    <input
                      type="datetime-local"
                      required
                      value={form.started_at}
                      onChange={e => setForm({ ...form, started_at: e.target.value })}
                    />
                  </label>
                  <label>
                    Fim do chamado
                    <input
                      type="datetime-local"
                      value={form.ended_at}
                      onChange={e => setForm({ ...form, ended_at: e.target.value })}
                    />
                  </label>
                </div>

                {error && <p className="error">{error}</p>}
                <div className="actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
                  <button className="primary">
                    <Check size={16} /> Salvar chamado
                  </button>
                </div>
              </form>
            )}

            {modal === "delete" && (
              <div className="modal-body">
                <div className="warning">
                  <AlertTriangle /> A exclusão é permanente.
                </div>
                <div className="delete-list">
                  {tickets.map(t => (
                    <label key={t.id}>
                      <input
                        type="checkbox"
                        checked={marked.includes(t.id)}
                        onChange={e => setMarked(e.target.checked ? [...marked, t.id] : marked.filter(id => id !== t.id))}
                      />
                      <span>
                        <b>#{t.id} · {t.location_name}</b>
                        <small>{dateLabel(t.started_at)} · {t.reason_names.join(", ")}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {error && <p className="error">{error}</p>}
                <div className="actions">
                  <button className="secondary" onClick={() => setModal(null)}>Cancelar</button>
                  <button className="danger" onClick={() => void deleteTickets()}>
                    Excluir ({marked.length})
                  </button>
                </div>
              </div>
            )}

            {modal === "catalog" && (
              <form className="modal-body" onSubmit={createCatalog}>
                <label>
                  Nome
                  <input
                    required
                    maxLength={120}
                    value={catalogName}
                    onChange={e => setCatalogName(e.target.value)}
                  />
                </label>
                {catalogType === "locations" && (
                  <label>
                    Seção
                    <input value={catalogSection} onChange={e => setCatalogSection(e.target.value)} />
                  </label>
                )}
                {error && <p className="error">{error}</p>}
                <div className="actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
                  <button className="primary">Adicionar</button>
                </div>
              </form>
            )}

            {(modal === "user" || modal === "user-edit") && (
              <form className="modal-body" onSubmit={saveUser}>
                <label>
                  Usuário
                  <input
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </label>
                <label>
                  Senha {modal === "user-edit" ? "(deixe em branco para manter)" : "(mínimo 12 caracteres)"}
                  <input
                    type="password"
                    minLength={12}
                    required={modal === "user"}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </label>
                <div className="choices vertical">
                  {([
                    ["is_active", "Conta ativa"],
                    ["is_staff", "Acesso ao admin"],
                    ["is_superuser", "Superusuário"],
                  ] as const).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={newUser[key]}
                        onChange={e => setNewUser({ ...newUser, [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {error && <p className="error">{error}</p>}
                <div className="actions">
                  <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
                  <button className="primary">
                    {modal === "user-edit" ? "Salvar permissões" : "Criar usuário"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {userToDelete !== null && (
        <div className="backdrop">
          <section className="modal confirm-modal">
            <header>
              <div>
                <h2>Excluir usuário?</h2>
                <p>Esta ação não pode ser desfeita.</p>
              </div>
              <button className="icon-btn" onClick={() => setUserToDelete(null)}>×</button>
            </header>
            <div className="modal-body">
              <p>O acesso desta conta será removido do sistema.</p>
              <div className="actions">
                <button className="secondary" onClick={() => setUserToDelete(null)}>Cancelar</button>
                <button className="danger" onClick={() => void removeUser()}>Confirmar exclusão</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Metric({ title, value, note, icon }: { title: string; value: number; note: string; icon: ReactNode }) {
  return (
    <article className="metric">
      <div>
        {title}
        <span>{icon}</span>
      </div>
      <strong>{value.toLocaleString("pt-BR")}</strong>
      <small>● {note}</small>
    </article>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Alerts({ alerts }: {
  alerts: { location: string; reason: string; equipment: string; count: number; total: number; percentage: number }[];
}) {
  if (!alerts.length) {
    return (
      <p className="empty">
        <Check size={17} /> Nenhum padrão crítico identificado para os filtros atuais.
      </p>
    );
  }

  return (
    <div className="alerts">
      {alerts.map((a, i) => (
        <div className="alert" key={i}>
          <AlertTriangle />
          <div>
            <b>{a.location}</b>
            <p>
              {a.reason} · <strong>{a.equipment}</strong>
            </p>
            <small>{a.count} de {a.total} chamados no recorte</small>
          </div>
          <strong className="percent">{a.percentage}%</strong>
        </div>
      ))}
    </div>
  );
}

function TicketTable({ tickets, onEdit }: { tickets: Ticket[]; onEdit: (t: Ticket) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Chamado</th>
            <th>Posto</th>
            <th>Motivo</th>
            <th>Equipamento</th>
            <th>Início</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.id}>
              <td>
                <b>#{String(t.id).padStart(4, "0")}</b>
                <small>{t.created_by_username}</small>
              </td>
              <td>{t.location_name}</td>
              <td>{t.reason_names.join(", ")}</td>
              <td>{t.equipment_names.join(", ")}</td>
              <td>{dateLabel(t.started_at)}</td>
              <td>
                <span className={`status ${t.status}`}>{statusNames[t.status] ?? t.status}</span>
              </td>
              <td>
                <button className="icon-btn" onClick={() => onEdit(t)} aria-label="Editar chamado">✎</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tickets.length && <p className="empty">Nenhum chamado encontrado.</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </label>
  );
}

function Catalog({ title, icon, items, onAdd }: {
  title: string;
  icon: ReactNode;
  items: string[];
  onAdd: () => void;
}) {
  return (
    <section className="panel catalog">
      <span>{icon}</span>
      <h2>{title}</h2>
      <div className="catalog-list">
        {items.slice(0, 8).map(x => <small key={x}>{x}</small>)}
        {!items.length && <small>Nenhum cadastro ainda.</small>}
      </div>
      <button className="secondary" onClick={onAdd}>
        <Plus size={16} /> Adicionar
      </button>
    </section>
  );
}
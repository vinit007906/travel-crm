import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const STATUSES = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"];
const TEAM = ["Unassigned", "Priya Sharma", "Rahul Patil", "Amit Deshmukh", "Neha Joshi"];
const blankLead = { name: "", phone: "", email: "", destination: "", budget: "", travelDate: "", assignedTo: "Unassigned", status: "New", notes: "" };
const ROLE_PAGES = {
  Admin: [
    "Dashboard", "Leads", "Bookings", "Reminders",
    "Reports", "User Management", "Team Performance",
    "Notifications", "WhatsApp Campaigns"
  ],
  Manager: [
    "Dashboard", "Leads", "Bookings", "Reminders",
    "Reports", "Team Performance", "Notifications",
    "WhatsApp Campaigns"
  ],
  Agent: [
    "Dashboard", "Leads", "Reminders", "My Tasks",
    "Notifications"
  ]
};
const DEMO_EMAILS = { Admin: "admin@tripwise.demo", Manager: "manager@tripwise.demo", Agent: "agent@tripwise.demo" };

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}
function date(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function exportCSV(filename, rows) {
  if (!rows.length) return false;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.map(escape).join(","), ...rows.map(row => columns.map(key => escape(row[key])).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
  return true;
}

function StatCard({ label, value, hint }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [user, setUser] = useState(() => { try { return localStorage.getItem("tripwise-token") ? JSON.parse(localStorage.getItem("tripwise-user") || "null") : null; } catch { return null; } });
  const [loginForm, setLoginForm] = useState({ email: "admin@tripwise.demo", password: "demo123", role: "Admin" });
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [notifications, setNotifications] = useState(() => { try { return JSON.parse(localStorage.getItem(`tripwise-notifications-${user?.email || "guest"}`) || "[]"); } catch { return []; } });
  const [cancelledBookings] = useState([]);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [leadForm, setLeadForm] = useState(blankLead);
  const [activity, setActivity] = useState({ type: "Call", note: "", followUpDate: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [selectedCampaignLeads, setSelectedCampaignLeads] = useState([]);
  const [campaignMessage, setCampaignMessage] = useState(
    "Hello {{name}}! 👋 Greetings from TripWise Travel. Are you planning a trip to {{destination}}? Contact our team to explore our travel packages."
  );

  const flash = (type, message) => {
    setNotice({ type, message });
    const next = [{ id: `${Date.now()}-${Math.random()}`, type, message, createdAt: new Date().toISOString(), read: false }, ...notifications].slice(0, 30);
    setNotifications(next); try { localStorage.setItem(`tripwise-notifications-${user?.email || "guest"}`, JSON.stringify(next)); } catch {}
    window.setTimeout(() => setNotice(null), 5000);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { search, status: statusFilter };
      if (user.role !== "Agent" && teamFilter) params.assignedTo = teamFilter;
      const [s, l, b, u] = await Promise.all([
        api.stats(),
        api.leads(params),
        user.role === "Agent" ? Promise.resolve([]) : api.bookings(),
        user.role === "Admin" ? api.users() : Promise.resolve([])
      ]);
      setStats(s); setLeads(l); setBookings(b); setWorkspaceUsers(u);
    } catch (err) {
      if (err.status === 401) { setUser(null); localStorage.removeItem("tripwise-user"); localStorage.removeItem("tripwise-token"); }
      flash("error", `${err.message}. Check the backend connection and your account access.`);
    } finally { setLoading(false); }
  }, [user, search, statusFilter, teamFilter]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);
  useEffect(() => {
    if (user && !ROLE_PAGES[user.role]?.includes(page)) setPage("Dashboard");
  }, [user, page]);
  useEffect(() => {
    try { setNotifications(JSON.parse(localStorage.getItem(`tripwise-notifications-${user?.email || "guest"}`) || "[]")); } catch { setNotifications([]); }
  }, [user?.email]);

  const exportLeads = () => {
    const ok = exportCSV(`tripwise-leads-${new Date().toISOString().slice(0, 10)}.csv`, leads.map(({ _id, name, phone, email, destination, budget, travelDate, assignedTo, status, notes, createdAt }) => ({
      Name: name, Phone: phone, Email: email, Destination: destination, Budget_INR: budget, Travel_Date: travelDate ? date(travelDate) : "", Assigned_To: assignedTo, Status: status, Notes: notes, Created: createdAt ? date(createdAt) : ""
    })));
    if (!ok) flash("error", "There are no leads to export."); else flash("success", "Lead CSV downloaded.");
  };
  const exportBookings = () => {
    const ok = exportCSV(`tripwise-bookings-${new Date().toISOString().slice(0, 10)}.csv`, bookings.map(b => ({ Reference: b.bookingReference, Customer: b.customerName, Phone: b.phone, Destination: b.destination, Travel_Date: b.travelDate ? date(b.travelDate) : "", Budget_INR: b.budget, Status: b.status })));
    if (!ok) flash("error", "There are no bookings to export."); else flash("success", "Booking CSV downloaded.");
  };
  const openCreate = () => { setLeadForm({ ...blankLead, assignedTo: user?.role === "Agent" ? user.name : "Unassigned" }); setModal("create"); };
  const openEdit = (lead) => { setSelected(lead); setLeadForm({ ...blankLead, ...lead, travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().slice(0, 10) : "", budget: lead.budget ?? "" }); setModal("edit"); };
  const openDetails = (lead) => { setSelected(lead); setActivity({ type: "Call", note: "", followUpDate: "" }); setModal("details"); };

  async function saveLead(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = { ...leadForm, budget: Number(leadForm.budget || 0), travelDate: leadForm.travelDate || null };
      if (modal === "edit") await api.updateLead(selected._id, body);
      else await api.createLead(body);
      setModal(null); flash("success", modal === "edit" ? "Lead updated successfully." : "Lead created successfully.");
      await loadData();
    } catch (err) {
      if (err.status === 409 && err.data?.duplicates?.length) {
        flash("error", `Possible duplicate: ${err.data.duplicates.map(d => `${d.name} (${d.phone})`).join(", ")}`);
      } else flash("error", err.message);
    } finally { setBusy(false); }
  }

  async function changeStatus(lead, status) {
    try { await api.updateStatus(lead._id, status); flash("success", "Lead status updated."); await loadData(); }
    catch (err) { flash("error", err.message); }
  }

  async function addActivity(event) {
    event.preventDefault();
    if (!activity.note.trim()) return;
    setBusy(true);
    try {
      const updated = await api.addActivity(selected._id, { ...activity, followUpDate: activity.followUpDate || null });
      setSelected(updated); setActivity({ type: "Call", note: "", followUpDate: "" });
      flash("success", "Follow-up activity saved."); await loadData();
    } catch (err) { flash("error", err.message); }
    finally { setBusy(false); }
  }

  async function convertLead(lead) {
    if (!window.confirm(`Convert ${lead.name}'s lead into a booking?`)) return;
    try {
      const booking = await api.convert(lead._id);
      setModal(null); flash("success", `Booking created: ${booking.bookingReference}`); await loadData(); setPage("Bookings");
    } catch (err) { flash("error", err.message); }
  }

  const reminders = useMemo(() => leads.flatMap(lead => (lead.activities || []).filter(a => a.followUpDate && !["Converted", "Lost"].includes(lead.status)).map(a => ({ ...a, leadId: lead._id, leadName: lead.name, destination: lead.destination, phone: lead.phone }))).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate)), [leads]);
  const monthlySales = useMemo(() => {
    const now = new Date();
    return Array.from({length: 6}, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthBookings = bookings.filter(b => { const bd = new Date(b.createdAt || b.travelDate || 0); return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth() && !(b.status === "Cancelled" || cancelledBookings.includes(String(b._id))); });
      return { label: d.toLocaleDateString("en-IN", { month: "short" }), count: monthBookings.length, revenue: monthBookings.reduce((sum,b) => sum + Number(b.budget || 0), 0) };
    });
  }, [bookings, cancelledBookings]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const eligibleFilteredLeads = useMemo(() => {
    const term = campaignSearch.trim().toLowerCase();
    return leads.filter(lead =>
      lead.whatsappOptIn === true &&
      `${lead.name || ""} ${lead.phone || ""} ${lead.destination || ""}`.toLowerCase().includes(term)
    );
  }, [leads, campaignSearch]);

  const selectedEligibleLeads = useMemo(
    () => leads.filter(lead => selectedCampaignLeads.includes(lead._id) && lead.whatsappOptIn === true),
    [leads, selectedCampaignLeads]
  );
  const previewLead = selectedEligibleLeads[0] || eligibleFilteredLeads[0];
  const pageTitle = useMemo(() => ({
    Dashboard: [user?.role === "Admin" ? "Admin Dashboard" : user?.role === "Manager" ? "Manager Dashboard" : "Agent Dashboard", user?.role === "Admin" ? "Manage the whole travel operation, access and business performance." : user?.role === "Manager" ? "Monitor team progress, bookings and customer follow-ups." : "Your leads, customer follow-ups and next actions in one place."],
    Leads: [user?.role === "Agent" ? "My Leads" : user?.role === "Manager" ? "Team Lead Management" : "Lead Management", user?.role === "Agent" ? "Work only with enquiries assigned to your account." : user?.role === "Manager" ? "Review team enquiries, ownership, and next steps." : "Manage all customer enquiries, ownership, and next steps."],
    Bookings: [user?.role === "Manager" ? "Team Bookings" : "All Bookings", "Review converted enquiries and booking status."],
    Reminders: [user?.role === "Agent" ? "My Follow-ups" : "Follow-up Reminders", user?.role === "Agent" ? "Only follow-ups for your assigned customers." : "Keep team callbacks and customer follow-ups on track."],
    Reports: ["Sales reports", "A quick view of recent booking volume and booking value."],
    Notifications: ["Notifications", "Recent updates and actions from your workspace."],
    "WhatsApp Campaigns": ["WhatsApp Campaigns", "Prepare personalized WhatsApp campaigns for customers who have opted in."],
    "User Management": ["User Management", "Review workspace roles and demo access profiles."],
    "Team Performance": ["Team Performance", "Compare lead ownership, progress and conversion across the team."],
    "My Tasks": ["My Tasks", "Your assigned enquiries and the next actions to complete."]
  }[page]), [page, user?.role]);

  async function signIn(event) {
    event.preventDefault();
    setLoginBusy(true); setLoginError("");
    try {
      const result = await api.login({ email: loginForm.email.trim(), password: loginForm.password });
      const nextUser = result.user;
      localStorage.setItem("tripwise-token", result.token);
      localStorage.setItem("tripwise-user", JSON.stringify(nextUser));
      setUser(nextUser); setPage("Dashboard"); setTeamFilter(""); setSearch(""); setStatusFilter("");
    } catch (err) { setLoginError(err.message || "Unable to sign in."); }
    finally { setLoginBusy(false); }
  }
  function signOut() { setUser(null); setPage("Dashboard"); setLeads([]); setBookings([]); setWorkspaceUsers([]); try { localStorage.removeItem("tripwise-user"); localStorage.removeItem("tripwise-token"); } catch {} }
  function markAllRead() { const next = notifications.map(n => ({...n, read:true})); setNotifications(next); try { localStorage.setItem(`tripwise-notifications-${user?.email || "guest"}`, JSON.stringify(next)); } catch {} }
  async function enableBrowserNotifications() {
    if (!("Notification" in window)) { flash("error", "This browser does not support desktop notifications."); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") { setBrowserNotifications(true); new Notification("Tripwise notifications enabled", { body: "You can receive browser alerts while this page is open." }); flash("success", "Browser notifications enabled for this session."); }
    else flash("error", "Browser notification permission was not granted.");
  }
  async function cancelBooking(booking) {
    if (user?.role !== "Admin" && user?.role !== "Manager") { flash("error", "Only Admin or Manager can cancel bookings."); return; }
    if (!window.confirm(`Cancel booking ${booking.bookingReference} for ${booking.customerName}?`)) return;
    try {
      await api.cancelBooking(booking._id);
      flash("success", `Booking ${booking.bookingReference} cancelled.`);
      await loadData();
    } catch (err) { flash("error", err.message); }
  }

  if (!user) return <div className="login-screen"><form className="login-card" onSubmit={signIn}><div className="brand login-brand"><div className="brand-mark">✦</div><div><b>tripwise</b><small>TRAVEL CRM</small></div></div><span className="eyebrow">WELCOME BACK</span><h1>Sign in to your workspace</h1><p>Use demo credentials to explore the CRM experience.</p><label>Email address<input type="email" required value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})}/></label><label>Password<input type="password" required value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})}/></label><label>Role<select value={loginForm.role} onChange={e=>setLoginForm({...loginForm,role:e.target.value,email:DEMO_EMAILS[e.target.value]})}><option>Admin</option><option>Manager</option><option>Agent</option></select></label>{loginError && <div className="notice error" role="alert">{loginError}</div>}<button className="primary-btn login-submit" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in →"}</button><small className="login-note">Demo accounts use the password <b>demo123</b>. Access is checked by the backend API.</small></form></div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">✦</div><div><b>tripwise</b><small>TRAVEL CRM</small></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <button className={page === "Dashboard" ? "nav-item active" : "nav-item"} onClick={() => setPage("Dashboard")}><span>▦</span> {user.role === "Admin" ? "Admin Overview" : user.role === "Manager" ? "Manager Overview" : "My Overview"}</button>
          <button className={page === "Leads" ? "nav-item active" : "nav-item"} onClick={() => setPage("Leads")}><span>♧</span> {user.role === "Agent" ? "My Leads" : "Lead Management"} <i>{stats?.totalLeads ?? "—"}</i></button>
          {user.role !== "Agent" && <button className={page === "Bookings" ? "nav-item active" : "nav-item"} onClick={() => setPage("Bookings")}><span>▣</span> Bookings <i>{stats?.bookings ?? "—"}</i></button>}
          <button className={page === "Reminders" ? "nav-item active" : "nav-item"} onClick={() => setPage("Reminders")}><span>◷</span> {user.role === "Agent" ? "My Follow-ups" : "Reminders"} <i>{reminders.length}</i></button>
          {user.role === "Admin" && <button className={page === "User Management" ? "nav-item active" : "nav-item"} onClick={() => setPage("User Management")}><span>♙</span> User Management</button>}
          {(user.role === "Manager" || user.role === "Admin") && <button className={page === "Team Performance" ? "nav-item active" : "nav-item"} onClick={() => setPage("Team Performance")}><span>▥</span> Team Performance</button>}
          {user.role === "Agent" && <button className={page === "My Tasks" ? "nav-item active" : "nav-item"} onClick={() => setPage("My Tasks")}><span>✓</span> My Tasks</button>}
          {user.role !== "Agent" && <button className={page === "Reports" ? "nav-item active" : "nav-item"} onClick={() => setPage("Reports")}><span>▤</span> Reports</button>}
          {user.role !== "Agent" && <button className={page === "WhatsApp Campaigns" ? "nav-item active" : "nav-item"} onClick={() => { setPage("WhatsApp Campaigns"); setSelectedCampaignLeads([]); }}><span>◉</span> WhatsApp Campaigns</button>}
          <button className={page === "Notifications" ? "nav-item active" : "nav-item"} onClick={() => setPage("Notifications")}><span>♧</span> Alerts <i>{unreadCount || ""}</i></button>
        </nav>
        <div className="sidebar-bottom"><div className="avatar">{user.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><b>{user.name}</b><small>{user.role} · Demo workspace</small></div><button className="signout-btn" onClick={signOut} title="Sign out">↪</button></div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {page}</div><div className="topbar-right"><span className="live-dot"></span><span>Prototype environment</span><button className="top-refresh" onClick={loadData} disabled={loading} title="Refresh data">↻ <span>{loading ? "Refreshing" : "Refresh"}</span></button><button className="notification-trigger" onClick={() => setPage("Notifications")} title="Open notifications">♧ {unreadCount ? <b>{unreadCount}</b> : null}</button><div className="avatar small">{user.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div></div></header>
        <section className="content">
          <div className="page-heading"><div><div className="eyebrow">TRAVEL SALES OVERVIEW</div><h1>{pageTitle[0]}</h1><p>{pageTitle[1]}</p></div>{["Dashboard","Leads","My Tasks"].includes(page) && <button className="primary-btn" onClick={openCreate}>＋ Add new lead</button>}</div>

          {page === "Dashboard" && user.role === "Admin" && <section className="panel role-welcome"><div className="panel-heading"><div><span className="eyebrow">ADMINISTRATOR WORKSPACE</span><h2>Good to see you, Admin</h2><p>Control workspace access and keep an eye on the full business.</p></div><span className="role-chip admin-chip">ADMIN</span></div><div className="role-shortcuts"><button className="secondary-btn" onClick={() => setPage("User Management")}>♙ Manage users</button><button className="secondary-btn" onClick={() => setPage("Reports")}>▥ View business reports</button><button className="secondary-btn" onClick={() => setPage("Bookings")}>▣ Review bookings</button></div></section>}
          {page === "Dashboard" && user.role === "Manager" && <section className="panel role-welcome"><div className="panel-heading"><div><span className="eyebrow">MANAGER WORKSPACE</span><h2>Team performance at a glance</h2><p>Prioritize overdue follow-ups, support agents and improve conversions.</p></div><span className="role-chip manager-chip">MANAGER</span></div><div className="role-shortcuts"><button className="secondary-btn" onClick={() => setPage("Team Performance")}>▥ Team performance</button><button className="secondary-btn" onClick={() => setPage("Reminders")}>◷ Review follow-ups</button><button className="secondary-btn" onClick={() => setPage("Bookings")}>▣ Manage bookings</button></div></section>}
          {page === "Dashboard" && user.role === "Agent" && <section className="panel role-welcome"><div className="panel-heading"><div><span className="eyebrow">AGENT WORKSPACE</span><h2>Your customer pipeline</h2><p>Focus on assigned leads, timely callbacks and moving enquiries forward.</p></div><span className="role-chip agent-chip">AGENT</span></div><div className="role-shortcuts"><button className="secondary-btn" onClick={() => setPage("My Tasks")}>✓ Open my tasks</button><button className="secondary-btn" onClick={() => setPage("Leads")}>♧ View my leads</button><button className="secondary-btn" onClick={() => setPage("Reminders")}>◷ Follow-up schedule</button></div></section>}
          {page === "Dashboard" && <section className="travel-hero">
            <div className="travel-hero-copy">
              <span className="hero-kicker">YOUR NEXT GREAT JOURNEY STARTS HERE</span>
              <h2>Turn every enquiry<br />into an <em>unforgettable trip.</em></h2>
              <p>Keep every traveller, follow-up and booking moving forward — all from one calm, clear workspace.</p>
              <button className="hero-cta" onClick={() => setPage("Leads")}>Explore your pipeline <span>↗</span></button>
              <div className="hero-trust"><span>✦ Thoughtful journeys</span><span>✓ Every lead in view</span></div>
            </div>
            <div className="hero-photo-caption"><span className="caption-dot"></span><div><b>Made for memorable journeys</b><small>From first hello to booked and ready</small></div></div>
          </section>}

          {notice && <div className={`notice ${notice.type}`} role="status">{notice.message}<button onClick={() => setNotice(null)}>×</button></div>}

          {page === "Dashboard" && <>
            <div className="stats-grid">
              <StatCard label="Total leads" value={stats?.totalLeads ?? "—"} hint="All recorded enquiries" />
              <StatCard label="New leads" value={stats?.newLeads ?? "—"} hint="Waiting for first contact" />
              <StatCard label="Follow-ups" value={stats?.followUpLeads ?? "—"} hint="In follow-up stage" />
              <StatCard label="Converted" value={stats?.convertedLeads ?? "—"} hint="Successfully converted" />
              <StatCard label="Lost leads" value={stats?.lostLeads ?? "—"} hint="Closed opportunities" />
              <StatCard label="Conversion rate" value={stats ? `${stats.conversionRate}%` : "—"} hint="Converted ÷ total leads" />
            </div>
            <div className="section-grid">
              <section className="panel"><div className="panel-heading"><div><h2>Recent leads</h2><p>Your latest customer enquiries</p></div><button className="text-btn" onClick={() => setPage("Leads")}>View all →</button></div><LeadTable leads={leads.slice(0, 5)} onDetails={openDetails} onEdit={openEdit} onStatus={changeStatus} compact /></section>
              <section className="panel pipeline-panel"><div className="panel-heading"><div><h2>Pipeline snapshot</h2><p>Lead distribution by stage</p></div></div>{STATUSES.filter(s => s !== "Converted").map(s => {
                const value = stats ? stats[{New:"newLeads", Contacted:"contactedLeads", Interested:"interestedLeads", "Follow-up":"followUpLeads", Lost:"lostLeads"}[s]] : 0;
                const total = Math.max(stats?.totalLeads || 0, 1);
                return <div className="pipeline-row" key={s}><div><span className={`status-dot ${s.toLowerCase().replace(/[^a-z]+/g,"-")}`}></span>{s}<b>{value ?? 0}</b></div><div className="bar"><span style={{width:`${Math.min(100, (value / total) * 100)}%`}}></span></div></div>;
              })}</section>
            </div>
          </>}

          {page === "User Management" && user.role === "Admin" && <section className="panel"><div className="panel-heading"><div><h2>Workspace users</h2><p>Workspace roles and their permitted areas. The backend enforces these permissions for API requests.</p></div><span className="role-chip admin-chip">ADMIN ONLY</span></div><div className="table-wrap"><table><thead><tr><th>USER</th><th>EMAIL</th><th>ROLE</th><th>ACCESS SUMMARY</th><th>STATUS</th></tr></thead><tbody>{workspaceUsers.map(u=><tr key={u.id || u.email}><td><b>{u.name}</b></td><td>{u.email}</td><td><span className={`role-chip ${u.role.toLowerCase()}-chip`}>{u.role}</span></td><td>{u.access}</td><td><span className="pill confirmed">{u.status || "Demo profile"}</span></td></tr>)}</tbody></table></div><p className="muted role-footnote">Demo profiles are read-only here. The backend validates sign-in and enforces role-based API permissions.</p></section>}

          {page === "Team Performance" && user.role !== "Agent" && <><section className="stats-grid"><StatCard label="Team members" value={TEAM.filter(n=>n!=="Unassigned").length} hint="Configured demo agents"/><StatCard label="Open leads" value={leads.filter(l=>!['Converted','Lost'].includes(l.status)).length} hint="Across the visible team data"/><StatCard label="Follow-up stage" value={leads.filter(l=>l.status==="Follow-up").length} hint="Needs timely contact"/><StatCard label="Converted leads" value={leads.filter(l=>l.status==="Converted").length} hint="Successful conversions"/></section><section className="panel"><div className="panel-heading"><div><h2>Agent performance</h2><p>Lead counts are calculated from the currently loaded lead records.</p></div><button className="secondary-btn" onClick={loadData}>↻ Refresh</button></div><div className="table-wrap"><table><thead><tr><th>AGENT</th><th>ASSIGNED LEADS</th><th>OPEN</th><th>FOLLOW-UPS</th><th>CONVERTED</th><th>ACTION</th></tr></thead><tbody>{TEAM.filter(n=>n!=="Unassigned").map(agent=>{const owned=leads.filter(l=>l.assignedTo===agent);return <tr key={agent}><td><b>{agent}</b></td><td>{owned.length}</td><td>{owned.filter(l=>!['Converted','Lost'].includes(l.status)).length}</td><td>{owned.filter(l=>l.status==="Follow-up").length}</td><td>{owned.filter(l=>l.status==="Converted").length}</td><td><button className="secondary-btn compact-btn" onClick={()=>{setTeamFilter(agent);setPage("Leads");}}>View leads</button></td></tr>})}</tbody></table></div></section></>}

          {page === "My Tasks" && user.role === "Agent" && <><section className="stats-grid"><StatCard label="My assigned leads" value={leads.filter(l=>l.assignedTo===user.name).length} hint="Assigned to your demo profile"/><StatCard label="Needs follow-up" value={leads.filter(l=>l.assignedTo===user.name && l.status==="Follow-up").length} hint="Contact these customers next"/><StatCard label="Interested" value={leads.filter(l=>l.assignedTo===user.name && l.status==="Interested").length} hint="Potential travel bookings"/><StatCard label="Converted" value={leads.filter(l=>l.assignedTo===user.name && l.status==="Converted").length} hint="Your successful conversions"/></section><section className="panel"><div className="panel-heading"><div><h2>My assigned leads</h2><p>Quick access to enquiries assigned to {user.name}.</p></div><button className="secondary-btn" onClick={()=>{setTeamFilter(user.name);setPage("Leads");}}>Open lead list</button></div><LeadTable leads={leads.filter(l=>l.assignedTo===user.name)} onDetails={openDetails} onEdit={openEdit} onStatus={changeStatus}/></section><section className="panel"><div className="panel-heading"><div><h2>Next follow-ups</h2><p>Follow-up activities from your assigned leads.</p></div></div>{reminders.filter(r=>leads.some(l=>l._id===r.leadId && l.assignedTo===user.name)).length ? <div className="table-wrap"><table><thead><tr><th>DATE</th><th>CUSTOMER</th><th>PHONE</th><th>NOTE</th><th>ACTION</th></tr></thead><tbody>{reminders.filter(r=>leads.some(l=>l._id===r.leadId && l.assignedTo===user.name)).map((r,i)=><tr key={r._id||i}><td>{date(r.followUpDate)}</td><td>{r.leadName}</td><td>{r.phone}</td><td>{r.note}</td><td><button className="secondary-btn compact-btn" onClick={()=>{const lead=leads.find(l=>l._id===r.leadId);if(lead)openDetails(lead);}}>Open lead</button></td></tr>)}</tbody></table></div>:<EmptyState title="No follow-ups yet" text="Add follow-up dates to your lead activity to see them here."/>}</section></>}

          {page === "WhatsApp Campaigns" && user.role !== "Agent" && <div className="section-grid">
            <section className="panel">
              <div className="panel-heading">
                <div><h2>Select customers</h2><p>{selectedEligibleLeads.length} opted-in customer(s) selected</p></div>
                <span className="role-chip manager-chip">CONSENT REQUIRED</span>
              </div>
              <div className="filters">
                <div className="search-box"><span>⌕</span><input value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} placeholder="Search customer, phone or destination" /></div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 16px",fontWeight:600}}>
                <input
                  type="checkbox"
                  checked={eligibleFilteredLeads.length > 0 && eligibleFilteredLeads.every(lead => selectedCampaignLeads.includes(lead._id))}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedCampaignLeads(current => [...new Set([...current, ...eligibleFilteredLeads.map(lead => lead._id)])]);
                    } else {
                      const visibleIds = new Set(eligibleFilteredLeads.map(lead => lead._id));
                      setSelectedCampaignLeads(current => current.filter(id => !visibleIds.has(id)));
                    }
                  }}
                  disabled={!eligibleFilteredLeads.length}
                />
                Select all eligible customers
              </label>
              {leads.length ? <div className="table-wrap"><table>
                <thead><tr><th>SELECT</th><th>CUSTOMER</th><th>DESTINATION</th><th>WHATSAPP CONSENT</th></tr></thead>
                <tbody>
                  {leads.filter(lead => {
                    const term = campaignSearch.trim().toLowerCase();
                    return `${lead.name || ""} ${lead.phone || ""} ${lead.destination || ""}`.toLowerCase().includes(term);
                  }).map(lead => {
                    const optedIn = lead.whatsappOptIn === true;
                    return <tr key={lead._id}>
                      <td><input type="checkbox" checked={selectedCampaignLeads.includes(lead._id) && optedIn} disabled={!optedIn} onChange={e => setSelectedCampaignLeads(current => e.target.checked ? [...new Set([...current, lead._id])] : current.filter(id => id !== lead._id))} /></td>
                      <td><b>{lead.name}</b><small className="subline">{lead.phone}</small></td>
                      <td>{lead.destination}</td>
                      <td><span className={`pill ${optedIn ? "confirmed" : "lost"}`}>{optedIn ? "Opted in" : "No consent"}</span></td>
                    </tr>;
                  })}
                </tbody>
              </table></div> : <EmptyState title="No customers available" text="Add leads to your CRM before preparing a campaign." />}
              <p className="muted role-footnote">Only customers with recorded WhatsApp opt-in can be selected. Customers without consent remain disabled.</p>
            </section>

            <section className="panel">
              <div className="panel-heading"><div><h2>Prepare campaign</h2><p>Personalize your approved WhatsApp template.</p></div></div>
              <label style={{display:"block",fontWeight:600}}>Message template
                <textarea rows="7" style={{width:"100%",marginTop:8}} value={campaignMessage} onChange={e => setCampaignMessage(e.target.value)} placeholder="Write your approved template text..." />
              </label>
              <div style={{marginTop:20}}>
                <h3>Message preview</h3>
                <div className="notes-box" style={{whiteSpace:"pre-wrap"}}>
                  {previewLead
                    ? campaignMessage.replaceAll("{{name}}", previewLead.name || "Customer").replaceAll("{{destination}}", previewLead.destination || "your preferred destination")
                    : "Select an opted-in customer to preview the personalized message."}
                </div>
                {previewLead && <small className="muted">Preview for {previewLead.name}</small>}
              </div>
              <div className="detail-grid" style={{marginTop:20}}>
                <div><small>Selected recipients</small><b>{selectedEligibleLeads.length}</b></div>
                <div><small>Template status</small><b>Pending approval</b></div>
              </div>
              <button className="primary-btn" style={{marginTop:18}} disabled>
                Send campaign — unavailable
              </button>
              <p className="muted role-footnote">Sending is disabled until the Interakt template is approved and the backend campaign endpoint is secured and connected. This screen does not send messages.</p>
            </section>
          </div>}

          {page === "Leads" && <section className="panel">
            <div className="panel-heading leads-panel-heading"><div><h2>{user.role === "Agent" ? "My assigned leads" : "All leads"}</h2><p>{(user.role === "Agent" ? leads.filter(l => l.assignedTo === user.name) : leads).length} matching enquiry/enquiries · Search, filter, update, or export</p></div><button className="secondary-btn export-btn" onClick={exportLeads}>↓ Export CSV</button></div>
            <div className="filters"><div className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email or destination" />{search && <button className="clear-search" onClick={() => setSearch("")} aria-label="Clear search">×</button>}</div><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>{user.role !== "Agent" && <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}><option value="">All team members</option>{TEAM.map(t => <option key={t}>{t}</option>)}</select>}<button className="filter-reset" onClick={() => { setSearch(""); setStatusFilter(""); setTeamFilter(""); }}>Reset</button></div>
            <LeadTable leads={user.role === "Agent" ? leads.filter(l => l.assignedTo === user.name) : leads} onDetails={openDetails} onEdit={openEdit} onStatus={changeStatus} />
          </section>}

          {page === "Bookings" && <section className="panel"><div className="panel-heading"><div><h2>Converted bookings</h2><p>{bookings.length} booking(s) in the system</p></div><button className="secondary-btn export-btn" onClick={exportBookings}>↓ Export CSV</button></div>{bookings.length ? <div className="table-wrap"><table><thead><tr><th>REFERENCE</th><th>CUSTOMER</th><th>DESTINATION</th><th>TRAVEL DATE</th><th>BUDGET</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{bookings.map(b => <tr key={b._id}><td><b className="reference">{b.bookingReference}</b></td><td><b>{b.customerName}</b><small className="subline">{b.phone}</small></td><td>{b.destination}</td><td>{date(b.travelDate)}</td><td>{money(b.budget)}</td><td><span className={`pill ${(b.status === "Cancelled" || cancelledBookings.includes(String(b._id))) ? "lost" : "confirmed"}`}>{(b.status === "Cancelled" || cancelledBookings.includes(String(b._id))) ? "Cancelled" : b.status}</span></td><td>{!(b.status === "Cancelled" || cancelledBookings.includes(String(b._id))) && <button className="secondary-btn compact-btn" disabled={user.role === "Agent"} onClick={()=>cancelBooking(b)}>Cancel booking</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No bookings yet" text="Convert a lead to create your first booking." action={() => setPage("Leads")} actionText="View leads" />}</section>}
          {page === "Reminders" && <section className="panel"><div className="panel-heading"><div><h2>Upcoming follow-ups</h2><p>Reminders are generated from follow-up dates recorded in lead activity.</p></div><button className="secondary-btn" onClick={loadData}>↻ Refresh</button></div>{reminders.length ? <div className="table-wrap"><table><thead><tr><th>FOLLOW-UP DATE</th><th>CUSTOMER</th><th>DESTINATION</th><th>PHONE</th><th>ACTIVITY NOTE</th><th>ACTION</th></tr></thead><tbody>{reminders.map((r,i)=><tr key={r._id || `${r.leadId}-${i}`}><td><span className="pill follow-up">{date(r.followUpDate)}</span></td><td><b>{r.leadName}</b></td><td>{r.destination}</td><td>{r.phone}</td><td>{r.note}</td><td><button className="secondary-btn compact-btn" onClick={()=>{const lead=leads.find(l=>l._id===r.leadId);if(lead)openDetails(lead);}}>Open lead</button></td></tr>)}</tbody></table></div>:<EmptyState title="No follow-ups scheduled" text="Open a lead and add a follow-up date to see it here." action={()=>setPage("Leads")} actionText="Open leads"/>}</section>}
          {page === "Reports" && <><section className="stats-grid"><StatCard label="Bookings (last 6 months)" value={monthlySales.reduce((a,m)=>a+m.count,0)} hint="Based on booking creation date when available"/><StatCard label="Booking value" value={money(monthlySales.reduce((a,m)=>a+m.revenue,0))} hint="Sum of booking budgets, not recognized revenue"/><StatCard label="Active bookings" value={bookings.filter(b=>!(b.status === "Cancelled" || cancelledBookings.includes(String(b._id)))).length} hint="Excludes cancelled bookings"/></section><section className="panel report-panel"><div className="panel-heading"><div><h2>Monthly booking activity</h2><p>Last six months · bars represent booking count</p></div><button className="secondary-btn export-btn" onClick={()=>exportCSV("tripwise-monthly-report.csv",monthlySales.map(m=>({Month:m.label,Bookings:m.count,Booking_Value_INR:m.revenue})))}>↓ Export report</button></div><div className="chart-bars">{monthlySales.map(m=><div className="chart-column" key={m.label}><b>{m.count}</b><div className="chart-track"><span style={{height:`${Math.max(4,(m.count/Math.max(1,...monthlySales.map(x=>x.count)))*100)}%`}}/></div><strong>{m.label}</strong><small>{money(m.revenue)}</small></div>)}</div></section></>}
          {page === "Notifications" && <section className="panel"><div className="panel-heading"><div><h2>Activity notifications</h2><p>Recent success/error messages saved in this browser.</p></div><div className="notification-actions"><button className="secondary-btn" onClick={enableBrowserNotifications}>Enable browser alerts</button><button className="secondary-btn" onClick={markAllRead}>Mark all read</button></div></div><div className="browser-alert-row"><span>Browser notifications</span><span className={`pill ${browserNotifications ? "confirmed" : "follow-up"}`}>{browserNotifications ? "Enabled this session" : "Not enabled"}</span></div>{notifications.length ? <div className="notification-list">{notifications.map(n=><div className={`notification-item ${n.read?"read":"unread"}`} key={n.id}><span className={`notification-symbol ${n.type}`}>{n.type==="error"?"!":"✓"}</span><div><b>{n.message}</b><small>{new Date(n.createdAt).toLocaleString("en-IN")}</small></div>{!n.read && <span className="unread-dot"/>}</div>)}</div>:<EmptyState title="You're all caught up" text="Actions and system messages will appear here."/>}</section>}
          {loading && <div className="loading-line">Refreshing data…</div>}
          <footer>Tripwise CRM <span>•</span> Travel sales workspace <span>•</span> Exportable reports</footer>
        </section>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <div className={`modal ${modal === "details" ? "wide-modal" : ""}`}>
          <div className="modal-header"><div><div className="eyebrow">{modal === "create" ? "NEW CUSTOMER" : modal === "edit" ? "UPDATE CUSTOMER" : "LEAD ACTIVITY"}</div><h2>{modal === "create" ? "Add a lead" : modal === "edit" ? "Edit lead" : selected?.name}</h2></div><button className="icon-btn" onClick={() => setModal(null)}>×</button></div>
          {modal !== "details" ? <form onSubmit={saveLead} className="form-grid">
            <label>Customer name *<input required value={leadForm.name} onChange={e => setLeadForm({...leadForm, name:e.target.value})} placeholder="e.g. Rahul Sharma" /></label>
            <label>Phone number *<input required value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone:e.target.value})} placeholder="e.g. 9876543210" /></label>
            <label>Email<input type="email" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email:e.target.value})} placeholder="name@example.com" /></label>
            <label>Destination *<input required value={leadForm.destination} onChange={e => setLeadForm({...leadForm, destination:e.target.value})} placeholder="e.g. Goa" /></label>
            <label>Budget (₹)<input type="number" min="0" value={leadForm.budget} onChange={e => setLeadForm({...leadForm, budget:e.target.value})} placeholder="20000" /></label>
            <label>Travel date<input type="date" value={leadForm.travelDate || ""} onChange={e => setLeadForm({...leadForm, travelDate:e.target.value})} /></label>
            {user.role !== "Agent" && <label>Assigned to<select value={leadForm.assignedTo} onChange={e => setLeadForm({...leadForm, assignedTo:e.target.value})}>{TEAM.map(t => <option key={t}>{t}</option>)}</select></label>}
            <label>Status<select value={leadForm.status} onChange={e => setLeadForm({...leadForm, status:e.target.value})}>{STATUSES.filter(s => s !== "Converted").map(s => <option key={s}>{s}</option>)}</select></label>
            <label className="full-field">Notes<textarea rows="3" value={leadForm.notes} onChange={e => setLeadForm({...leadForm, notes:e.target.value})} placeholder="Customer preferences, travel needs, etc." /></label>
            <div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : modal === "edit" ? "Save changes" : "Create lead"}</button></div>
          </form> : <div className="details-content">
            <div className="details-summary"><div><span className="eyebrow">DESTINATION</span><h3>{selected.destination}</h3></div><span className={`pill ${selected.status.toLowerCase().replace(/[^a-z]+/g,"-")}`}>{selected.status}</span></div>
            <div className="detail-grid"><div><small>Phone</small><b>{selected.phone}</b></div><div><small>Email</small><b>{selected.email || "—"}</b></div><div><small>Budget</small><b>{money(selected.budget)}</b></div><div><small>Travel date</small><b>{date(selected.travelDate)}</b></div><div><small>Assigned to</small><b>{selected.assignedTo}</b></div><div><small>Created</small><b>{date(selected.createdAt)}</b></div></div>
            {selected.notes && <div className="notes-box"><b>Lead notes</b><p>{selected.notes}</p></div>}
            <div className="activity-layout"><div><h3>Activity timeline</h3>{selected.activities?.length ? <div className="timeline">{[...selected.activities].reverse().map(a => <div className="timeline-item" key={a._id}><span className="timeline-mark"></span><div><b>{a.type}</b><p>{a.note}</p><small>{date(a.createdAt)}{a.followUpDate ? ` · Follow-up ${date(a.followUpDate)}` : ""}</small></div></div>)}</div> : <p className="muted">No follow-up activities yet.</p>}</div>
            <form onSubmit={addActivity} className="activity-form"><h3>Record follow-up</h3><label>Activity type<select value={activity.type} onChange={e => setActivity({...activity,type:e.target.value})}>{["Call","Email","Meeting","Note","Other"].map(t => <option key={t}>{t}</option>)}</select></label><label>Notes *<textarea required rows="3" value={activity.note} onChange={e => setActivity({...activity,note:e.target.value})} placeholder="What did the customer say?" /></label><label>Next follow-up date<input type="date" value={activity.followUpDate} onChange={e => setActivity({...activity,followUpDate:e.target.value})} /></label><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Save activity"}</button></form></div>
            <div className="details-actions"><label>Update status<select value={selected.status} disabled={selected.status === "Converted"} onChange={async e => { await changeStatus(selected,e.target.value); setSelected({...selected,status:e.target.value}); }}>{STATUSES.filter(s => s !== "Converted").map(s => <option key={s}>{s}</option>)}</select></label><button className="secondary-btn" onClick={() => openEdit(selected)} disabled={selected.status === "Converted"}>Edit lead</button><button className="primary-btn" onClick={() => convertLead(selected)} disabled={["Converted","Lost"].includes(selected.status)}>Convert to booking →</button></div>
          </div>}
        </div>
      </div>}
    </div>
  );
}

function LeadTable({ leads, onDetails, onEdit, onStatus, compact = false }) {
  if (!leads.length) return <EmptyState title="No leads found" text="Create a lead or adjust your filters to get started." />;
  return <div className="table-wrap"><table><thead><tr><th>CUSTOMER</th><th>DESTINATION</th><th>ASSIGNED TO</th><th>STATUS</th><th>BUDGET</th><th>ACTIONS</th></tr></thead><tbody>{leads.map(lead => <tr key={lead._id}><td><div className="customer-cell"><div className="customer-avatar">{lead.name.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase()}</div><div><b>{lead.name}</b><small className="subline">{lead.phone}</small></div></div></td><td>{lead.destination}<small className="subline">{date(lead.travelDate)}</small></td><td>{lead.assignedTo}</td><td><select className={`status-select ${lead.status.toLowerCase().replace(/[^a-z]+/g,"-")}`} value={lead.status} disabled={lead.status === "Converted"} onChange={e => onStatus(lead,e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td><td>{money(lead.budget)}</td><td><div className="row-actions"><button onClick={() => onDetails(lead)} title="View details">View</button>{!compact && <button onClick={() => onEdit(lead)} disabled={lead.status === "Converted"} title="Edit lead">Edit</button>}</div></td></tr>)}</tbody></table></div>;
}

function EmptyState({ title, text, action, actionText }) {
  return <div className="empty-state"><div className="empty-icon">⌕</div><h3>{title}</h3><p>{text}</p>{action && <button className="secondary-btn" onClick={action}>{actionText}</button>}</div>;
}

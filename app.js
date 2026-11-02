const cfg = window.CLIENT_NOTES_CONFIG || {};
const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
const demoClients = [
  { id: "acme", name: "ACME Client", viber_group: "ACME Support Viber group", summary: "Verification and exception handling" },
  { id: "bravo", name: "Bravo Co.", viber_group: "Bravo Co. inquiries", summary: "Billing and account concerns" },
  { id: "cebu", name: "Cebu Partner", viber_group: "Cebu Partner support", summary: "General support" }
];
const demoNotes = [
  { id: "1", client_id: "acme", title: "Verification requires the complete document set", body: "Before escalating a verification concern, confirm that the customer has submitted the required documents. Use the current checklist supplied by the client.", type: "Procedure", status: "resolved", is_pinned: true, created_at: "2026-11-03T08:15:00Z", author_name: "Admin" },
  { id: "2", client_id: "acme", title: "Clarify exception for returning customers", body: "A returning customer asked whether an expired document can be accepted. This was asked in the Viber group and is awaiting confirmation.", type: "Inquiry", status: "waiting", is_pinned: false, created_at: "2026-11-03T07:20:00Z", author_name: "Admin" },
  { id: "3", client_id: "acme", title: "Use the updated turnaround time", body: "Client confirmed that standard verification follows the latest turnaround time stated in their support announcement.", type: "Client update", status: "resolved", is_pinned: false, created_at: "2026-11-01T09:30:00Z", author_name: "Admin" },
  { id: "4", client_id: "bravo", title: "Refund request workflow", body: "Collect the transaction reference before asking the client for a manual review.", type: "Procedure", status: "resolved", is_pinned: true, created_at: "2026-10-30T07:00:00Z", author_name: "Admin" },
];

let state = { clients: demoClients, notes: demoNotes, activeClientId: "acme", query: "", user: null, isAdmin: true, demo: !configured };
let db = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

const icon = (name) => name === "search" ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>` : "";
const formatDate = (value) => new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(new Date(value));
const escapeHtml = (text="") => text.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[c]);
const activeClient = () => state.clients.find(c => c.id === state.activeClientId) || state.clients[0];

async function loadData() {
  if (state.demo) return render();
  const [{ data: clients, error: clientError }, { data: notes, error: noteError }] = await Promise.all([
    db.from("clients").select("*").eq("archived", false).order("name"),
    db.from("notes").select("*").order("created_at", { ascending: false })
  ]);
  if (clientError || noteError) return showError("Could not load your notes. Check your Supabase setup and policies.");
  state.clients = clients || []; state.notes = notes || [];
  state.activeClientId = state.clients.some(c => c.id === state.activeClientId) ? state.activeClientId : state.clients[0]?.id;
  render();
}

function render() {
  const client = activeClient();
  const query = state.query.trim().toLowerCase();
  const visibleClients = state.clients.filter(c => !query || `${c.name} ${c.summary || ""}`.toLowerCase().includes(query) || state.notes.some(n => n.client_id === c.id && `${n.title} ${n.body}`.toLowerCase().includes(query)));
  const clientNotes = state.notes.filter(n => n.client_id === client?.id && (!query || `${n.title} ${n.body} ${n.type}`.toLowerCase().includes(query)));
  const pinned = clientNotes.find(n => n.is_pinned);
  document.querySelector("#app").innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span>CredoPH support</span><h1>Client Notes</h1></div>
      <div class="search-wrap">${icon("search")}<input class="search" id="search" value="${escapeHtml(state.query)}" placeholder="Search notes" aria-label="Search notes" /></div>
      <nav class="client-list" aria-label="Clients">
        ${visibleClients.map(c => `<button class="client-item ${c.id === client?.id ? "active" : ""}" data-client="${c.id}"><span>${escapeHtml(c.name)}</span><small>${state.notes.filter(n => n.client_id === c.id && n.status === "waiting").length || ""}</small></button>`).join("") || `<p class="empty">No matching client.</p>`}
      </nav>
      ${state.isAdmin ? `<button class="button ghost" id="new-client">+ Add client</button>` : ""}
      <div class="sidebar-foot">${state.demo ? "Demo data — connect Supabase to share." : `Signed in as ${escapeHtml(state.user?.email || "viewer")}`}</div>
    </aside>
    <main class="main">
      ${state.demo ? `<div class="notice">You are viewing sample data. Add Supabase credentials in <code>config.js</code> to make this shared and live.</div>` : ""}
      ${client ? `<div class="topbar"><div><p class="eyebrow">${escapeHtml(client.summary || "Client knowledge base")}</p><h2>${escapeHtml(client.name)}</h2>${client.viber_group ? viberMarkup(client.viber_group) : ""}</div><div class="top-actions"><span class="user-menu">${state.isAdmin ? "Admin" : "Read only"}</span>${state.isAdmin ? `<button class="button primary" id="new-note">+ New note</button>` : ""}</div></div>
      ${pinned ? `<section class="pinned"><p class="section-label">Pinned note</p><div class="pinned-note"><span class="pin">●</span><div><strong>${escapeHtml(pinned.title)}</strong><p>${escapeHtml(pinned.body)}</p></div></div></section>` : ""}
      <section class="feed" aria-label="Notes">${clientNotes.filter(n => !n.is_pinned).map(noteHtml).join("") || `<div class="empty">No notes yet for this client.</div>`}</section>` : `<div class="empty">No client has been added yet.</div>`}
    </main>`;
  bindEvents();
}

function noteHtml(n) { return `<article class="note"><div class="note-meta"><span class="tag">${escapeHtml(n.type)}</span><br>${formatDate(n.created_at)}<br>${escapeHtml(n.author_name || "Admin")}</div><div><div class="note-title"><h3>${escapeHtml(n.title)}</h3>${n.status === "waiting" ? `<span class="status waiting">Waiting for client</span>` : `<span class="status resolved">Confirmed</span>`}</div><p>${escapeHtml(n.body)}</p>${n.status === "waiting" ? `<div class="note-controls"><button class="text-button" data-copy="${n.id}">Copy Viber clarification</button></div>` : ""}</div></article>`; }
function viberMarkup(value) { const safe = escapeHtml(value); return /^https?:\/\//i.test(value) ? `<a class="viber-link" href="${safe}" target="_blank" rel="noreferrer">Open Viber group ↗</a>` : `<span class="viber-link">Viber: ${safe}</span>`; }

function bindEvents() {
  document.querySelectorAll("[data-client]").forEach(el => el.onclick = () => { state.activeClientId = el.dataset.client; state.query = ""; render(); });
  document.querySelector("#search")?.addEventListener("input", e => { state.query = e.target.value; render(); document.querySelector("#search")?.focus(); });
  document.querySelector("#new-note")?.addEventListener("click", openNoteModal);
  document.querySelector("#new-client")?.addEventListener("click", openClientModal);
  document.querySelectorAll("[data-copy]").forEach(el => el.onclick = () => copyClarification(el.dataset.copy));
}

function openClientModal() {
  const wrap = document.createElement("div"); wrap.className = "modal-backdrop";
  wrap.innerHTML = `<form class="modal editor" id="client-form"><h3>Add client</h3><label>Client name<input name="name" required maxlength="100" placeholder="Client name" /></label><label>Short description<input name="summary" maxlength="150" placeholder="For example: billing and account concerns" /></label><label>Viber group link or name<input name="viber_group" maxlength="300" placeholder="https://… or group name" /></label><div class="modal-actions"><button class="button" type="button" id="cancel">Cancel</button><button class="button primary" type="submit">Add client</button></div></form>`;
  document.body.append(wrap); wrap.querySelector("#cancel").onclick = () => wrap.remove();
  wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });
  wrap.querySelector("form").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.currentTarget); const client = { id: crypto.randomUUID(), name: f.get("name"), summary: f.get("summary"), viber_group: f.get("viber_group") }; if (state.demo) { state.clients.push(client); state.activeClientId = client.id; wrap.remove(); render(); return; } const { data, error } = await db.from("clients").insert({ name: client.name, summary: client.summary, viber_group: client.viber_group }).select().single(); if (error) return alert("Could not add client: " + error.message); state.activeClientId = data.id; wrap.remove(); loadData(); };
}

function openNoteModal() {
  const wrap = document.createElement("div"); wrap.className = "modal-backdrop";
  wrap.innerHTML = `<form class="modal editor" id="note-form"><h3>New note</h3><label>Title<input name="title" required maxlength="160" placeholder="What should the team know?" /></label><label>Note<textarea name="body" required placeholder="Write the confirmed information or the question that needs an answer."></textarea></label><div class="field-row"><label>Type<select name="type"><option>Client update</option><option>Procedure</option><option>Inquiry</option><option>Important</option></select></label><label>Status<select name="status"><option value="resolved">Confirmed</option><option value="waiting">Waiting for client</option></select></label></div><label><input type="checkbox" name="is_pinned" /> Pin this note</label><div class="modal-actions"><button class="button" type="button" id="cancel">Cancel</button><button class="button primary" type="submit">Save note</button></div></form>`;
  document.body.append(wrap); wrap.querySelector("#cancel").onclick = () => wrap.remove();
  wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });
  wrap.querySelector("form").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.currentTarget); const note = { id: crypto.randomUUID(), client_id: state.activeClientId, title: f.get("title"), body: f.get("body"), type: f.get("type"), status: f.get("status"), is_pinned: f.get("is_pinned") === "on", created_at: new Date().toISOString(), author_name: state.user?.email || "Admin" }; if (state.demo) { state.notes.unshift(note); wrap.remove(); render(); return; } const { error } = await db.from("notes").insert({ client_id: note.client_id, title: note.title, body: note.body, type: note.type, status: note.status, is_pinned: note.is_pinned }); if (error) return alert("Could not save: " + error.message); wrap.remove(); loadData(); };
}

function copyClarification(id) { const n = state.notes.find(x => x.id === id); const c = activeClient(); navigator.clipboard.writeText(`Hi team, may we clarify this for ${c.name}?\n\n${n.title}\n${n.body}`).then(() => alert("Clarification copied. You can paste it into Viber.")); }
function showError(message) { document.querySelector("#app").innerHTML = `<div class="login"><h1>Client Notes</h1><p>${escapeHtml(message)}</p></div>`; }

async function init() {
  if (!configured) return render();
  const { data: { session } } = await db.auth.getSession();
  if (!session) return renderLogin();
  state.user = session.user; state.isAdmin = cfg.adminEmails.includes(session.user.email); loadData();
}
function renderLogin() { document.querySelector("#app").innerHTML = `<div class="login"><span class="eyebrow">CredoPH support</span><h1>Client Notes</h1><p>Sign in with your approved work email to read the latest client information.</p><form id="login-form"><input type="email" required name="email" placeholder="you@company.com" aria-label="Email address"/><button class="button primary">Send link</button></form></div>`; document.querySelector("#login-form").onsubmit = async e => { e.preventDefault(); const email = new FormData(e.currentTarget).get("email"); const { error } = await db.auth.signInWithOtp({email, options:{emailRedirectTo:cfg.appUrl || location.origin}}); if (error) return alert(error.message); e.currentTarget.outerHTML = `<p>Check your email for a secure sign-in link.</p>`; }; }
init();

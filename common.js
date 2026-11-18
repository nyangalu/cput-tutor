// ============================================================
//  Shared code: data layer (Firebase or demo), tutor prompt,
//  AI call, helpers. Used by index.html and dashboard.html.
// ============================================================
(function () {
  const CFG = window.TUTOR_CONFIG;
  const DEMO = !CFG.firebase.apiKey || CFG.firebase.apiKey.startsWith("YOUR_");

  // ---------- helpers ----------
  const H = {
    esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
    md(s) {
      const html = window.marked ? window.marked.parse(String(s || ""), { breaks: true }) : H.esc(s)
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
        .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>");
      return window.DOMPurify ? window.DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }) : html;
    },
    fmtDate(t) { if (!t) return "—"; const d = new Date(t); return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }); },
    ago(t) {
      if (!t) return "never"; const s = (Date.now() - t) / 1000;
      if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
      if (s < 86400) return Math.floor(s / 3600) + " h ago"; return Math.floor(s / 86400) + " d ago";
    },
    snValid(sn) { return /^\d{8,10}$/.test(String(sn).trim()); },
    toArr(obj) { return Object.entries(obj || {}).map(([id, v]) => ({ id, ...v })); },
    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
  };

  const TOPICS = {
    maths: "Maths", physics: "Physics/Science", programming: "Programming/IT", design: "Engineering design/drawing",
    "other-academic": "Other academic", planning: "Study planning", money: "Money/NSFAS", transport: "Transport",
    "campus-life": "Campus & social life", wellbeing: "Wellbeing (private)", other: "Other"
  };

  // ---------- tutor system prompt ----------
  function buildSystemPrompt(profile, settings, announcements) {
    const today = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const ann = (announcements || [])
      .filter(a => !a.due || new Date(a.due) >= new Date(Date.now() - 86400000))
      .sort((a, b) => String(a.due || "9").localeCompare(String(b.due || "9")))
      .slice(0, 25)
      .map(a => `- ${a.due ? a.due + " — " : ""}${a.module ? "[" + a.module + "] " : ""}${a.title}${a.body ? ": " + a.body : ""}`).join("\n") || "- (none posted yet)";
    const p = profile || {};
    const type = p.type || "student";
    const who = type === "staff"
      ? `- This user is a CPUT STAFF MEMBER (staff no. ${p.staffNo || "?"}${p.department ? ", " + p.department : ""}) attending a workshop. Treat them as a colleague: give direct, complete answers and full worked solutions (the academic-integrity limits for graded student work do not apply), and do not assume NSFAS or student budgets.`
      : type === "visitor"
      ? `- This user is a VISITOR from outside CPUT (${p.org || "organisation not given"}) attending a workshop. Help with the workshop content and their questions and give complete answers. CPUT student services (NSFAS, residences, Student Counselling, shuttles) may not apply to them; for wellbeing give the national helplines.`
      : `- A CPUT first-year student (student no. ${p.sn || "?"}).`;
    return `You are "${CFG.appName}", a friendly tutor and study-life guide mainly for FIRST-YEAR ENGINEERING students (you are also used in workshops by CPUT staff and visitors) at Cape Peninsula University of Technology (CPUT), Faculty of Engineering and the Built Environment, Cape Town, South Africa. The class is ${CFG.courseCode}; the lecturer is ${CFG.lecturerName}. Today is ${today}.

THE PERSON YOU ARE TALKING TO
- Name: ${p.first || "?"} ${p.last || ""}
${who}
- Preferred language: ${p.language || "English"}
- Campus: ${p.campus || "not given"} | Lives: ${p.living || "not given"} | Usually travels by: ${p.transport || "not given"}${p.station ? " (nearest station: " + p.station + ")" : ""}

LANGUAGE
- Reply in the SAME language the student writes in (English, isiXhosa, Afrikaans, isiZulu, etc.). If they mix languages, mirror them.
- In isiXhosa, keep standard technical terms in English (e.g. "derivative", "free-body diagram", "loop") and explain them in isiXhosa. Use simple, clear sentences.

1) ACADEMIC HELP (most important)
- Help with first-year engineering work: engineering maths (algebra, trig, functions, limits, differentiation, integration, differentials, hyperbolic functions, vectors, complex numbers), physics/mechanics, chemistry, engineering drawing & design (incl. IED150S design projects and reports), computer literacy, Excel/VBA and Python programming, academic writing and referencing.
- Teach, don't just tell. Be Socratic: ask what they have tried, give one hint at a time, check understanding with a quick follow-up question, and show worked EXAMPLES that are similar to (not the same as) their problem.
- ACADEMIC INTEGRITY: if something looks like a graded assignment, test or project deliverable, do NOT produce the finished answer, full code or full report. Guide them step by step so they do the work themselves. Remind them of the CPUT Student AI Practice Guide when relevant.
- Write maths in plain text that reads well on a phone, e.g. d/dx (x^2) = 2x, sinh(x) = (e^x − e^(−x))/2. Use short code blocks for code.

2) STUDY PLANNING
- Build realistic weekly timetables and revision plans around lectures, travel time and part-time work. Use short blocks (e.g. 45 min study + 10 min break), spaced repetition and past-paper practice.
- Use the deadlines below. Count the days remaining from today. Prioritise what is due soonest and what carries the most marks.
- Encourage using lecturer consultation times, tutorials and study groups.

3) MONEY (most students depend on NSFAS and have very little money)
- Always suggest free or very cheap options first (CPUT library and computer labs, campus Wi-Fi, free software, free online resources such as Khan Academy, second-hand textbooks, study groups, cooking in bulk).
- For NSFAS allowance amounts, payment dates or appeals, do NOT guess numbers: refer them to https://www.nsfas.org.za and the CPUT Financial Aid office. Give simple budgeting tips (weekly budget, track spending, avoid loan sharks and gambling apps).

4) CAMPUS & SOCIAL LIFE
- Encourage belonging: First Year Experience (FYE) workshops, Student Affairs, SRC, societies, sport, faith and cultural groups, residence life, peer mentors and making friends in class.
- FYE page (First Year Guide, handbook, student activities, shuttle services, student support links): https://www.cput.ac.za/student/campus-life/fye
- Give safety tips: travel in groups especially early morning/after dark, keep phones out of sight, use campus Protection Services.
- Never make up CPUT event dates, room numbers or contacts. Point to the FYE page or the relevant office.

5) TRANSPORT (Cape Town trains)
- Use https://cttrains.co.za — a free community timetable site (not Metrorail). Key pages:
  • Any station to any station: https://cttrains.co.za/train-form.php
  • Northern Line (Bellville, Kraaifontein, Eerste River, Stellenbosch, Wellington): https://cttrains.co.za/ns_bell_route_select.php
  • Central Line (Cape Town, Langa, Nyanga, Chris Hani, Mutual–Bellville): https://cttrains.co.za/CT_KYL_route_select.php
  • Cape Flats Line: https://cttrains.co.za/cf_route_select.php | Southern Line: https://cttrains.co.za/ss_route_select.php
  • Delays & updates: https://cttrains.co.za/status2.php | Fare calculator: https://cttrains.co.za/fare-calculator.php
- Trains normally do not run on Sundays or public holidays. Do NOT invent train times — send them to the right page, and tell them to check "Updates & delays" before leaving. Transport Information Centre: 0800 65 64 63.
- Help them plan: leave early enough for an 08:00 class, have a backup (bus/taxi), use the CPUT shuttle where available (see FYE page > Shuttle Services).

6) WELLBEING & SAFETY
- Be warm and non-judgemental. For stress, homesickness, relationships or feeling overwhelmed, listen first, then suggest CPUT Student Counselling (Student-Counselling@cput.ac.za; Bellville 021 959 6182; District Six 021 460 3237) and Higher Health 24-hour helpline 0800 36 36 36.
- If a student mentions self-harm, suicide, abuse or being in danger: respond with care, encourage them to reach someone right now, and give: SADAG Suicide Crisis Helpline 0800 567 567, Higher Health 0800 36 36 36, GBV Command Centre 0800 428 428, emergency 10111 / 112 from a cellphone. Encourage them to also tell someone they trust.

LECTURER NOTES (trust these)
${settings?.notes || "(none)"}

DEADLINES & ANNOUNCEMENTS
${ann}

STYLE
- Keep answers short and phone-friendly (usually under 250 words) with headings or bullets only when helpful. Be encouraging and practical. Use the student's first name occasionally.
- If you are unsure of a fact, say so and point to where to check.

FINAL LINE (required)
End EVERY reply with a final line exactly like <<topic:KEY>> where KEY is ONE of: ${Object.keys(TOPICS).join(", ")}. The student does not see this line.`;
  }

  function splitTopic(text) {
    const m = String(text).match(/<<\s*topic\s*:\s*([a-z\-]+)\s*>>\s*$/i);
    const topic = m && TOPICS[m[1].toLowerCase()] ? m[1].toLowerCase() : "other";
    const clean = String(text).replace(/<<\s*topic\s*:[^>]*>>\s*$/i, "").trim();
    return { clean, topic };
  }

  // ======================================================
  //  DEMO STORE (localStorage) — mirrors the Firebase tree
  // ======================================================
  function demoStore() {
    const KEY = "cputTutorDemo_v1";
    const listeners = [];
    let authUser = null;
    const authCbs = [];
    function load() {
      let d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
      if (!d) {
        d = {
          allow: { "230000001": { last: "DEMO", first: "A" }, "230000002": { last: "MBEKI", first: "T" }, "230000003": { last: "VAN WYK", first: "S" } },
          accounts: { "lecturer@demo": { pw: "demo1234", uid: "lect1", verified: true } },
          admins: { lect1: true }, students: {}, chats: {}, asks: {}, access: { open: false, code: "" },
          announcements: {
            a1: { title: "IED150S design project report due", module: "IED150S", due: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10), body: "Submit on Blackboard as PDF.", t: Date.now() },
            a2: { title: "Maths class test 3", module: "MAT", due: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), body: "Differentials & hyperbolic functions.", t: Date.now() }
          },
          settings: { notes: "Demo mode: consultation hours Tue & Thu 13:00–14:00.", model: "claude-haiku-4-5" }
        };
      }
      return d;
    }
    let D = load();
    const sync = () => { D = load(); };
    window.addEventListener("storage", e => { if (e.key === KEY) { D = load(); listeners.forEach(f => f()); } });
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { } listeners.forEach(f => f()); };
    const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const setAuth = u => { authUser = u; try { sessionStorage.setItem(KEY + "_auth", JSON.stringify(u)); } catch (e) { } authCbs.forEach(cb => cb(u)); };
    try { authUser = JSON.parse(sessionStorage.getItem(KEY + "_auth")); } catch (e) { }
    const watch = (fn) => { listeners.push(fn); fn(); return () => listeners.splice(listeners.indexOf(fn), 1); };

    return {
      demo: true,
      onAuth(cb) { authCbs.push(cb); setTimeout(() => cb(authUser), 0); },
      async register(p, pw) { sync();
        const type = p.type || "student";
        const email = type === "student" ? p.sn + "@" + CFG.emailDomain : String(p.email).toLowerCase();
        if (D.accounts[email]) throw new Error("ALREADY_REGISTERED");
        if (type === "staff" && !email.endsWith("@" + CFG.staffEmailDomain)) throw new Error("STAFF_EMAIL");
        D.staffLogin ||= {};
        if (type === "staff" && D.staffLogin[p.staffNo]) throw new Error("STAFF_TAKEN");
        const a = type === "student" && D.allow[p.sn];
        const onList = a && a.last === p.last.toUpperCase();
        const byCode = D.access && D.access.open && p.joinCode && p.joinCode === D.access.code;
        if (!onList && !byCode) throw new Error(type === "student" ? "NOT_ON_LIST" : "BAD_CODE");
        if (type === "staff") D.staffLogin[p.staffNo] = email;
        const uid = "u" + id();
        D.accounts[email] = { pw, uid, verified: true };
        D.students[uid] = { ...p, registeredAt: Date.now(), lastSeen: Date.now() };
        save(); setAuth({ uid, email, emailVerified: true });
      },
      async resolveEmail(type, idv) { sync(); idv = String(idv).trim();
        if (type === "visitor" || idv.includes("@")) return idv.toLowerCase();
        if (type === "staff") { const e = (D.staffLogin || {})[idv]; if (!e) throw new Error("BAD_LOGIN"); return e; }
        return idv + "@" + CFG.emailDomain; },
      async login(emailOrSn, pw) { sync();
        const email = emailOrSn.includes("@") ? emailOrSn.toLowerCase() : emailOrSn + "@" + CFG.emailDomain;
        const a = D.accounts[email];
        if (!a || a.pw !== pw) throw new Error("BAD_LOGIN");
        setAuth({ uid: a.uid, email, emailVerified: true });
      },
      async resetPassword() { sync(); return true; },
      async resendVerification() { sync(); return true; },
      async reloadUser() { sync(); return authUser; },
      async logout() { sync(); setAuth(null); },
      async getIdToken() { sync(); return "demo"; },
      async isAdmin(uid) { sync(); return !!D.admins[uid]; },
      async getProfile(uid) { sync(); return D.students[uid] || null; },
      async updateProfile(uid, patch) { sync(); D.students[uid] = { ...D.students[uid], ...patch }; save(); },
      async addChat(uid, m) { sync(); (D.chats[uid] ||= {})[id()] = m; save(); },
      async getChats(uid, n) { sync(); return H.toArr(D.chats[uid]).sort((a, b) => a.t - b.t).slice(-(n || 60)); },
      async addAsk(uid, text) { sync(); (D.asks[uid] ||= {})[id()] = { text, t: Date.now() }; save(); },
      onAsks(uid, cb) { return watch(() => cb(H.toArr(D.asks[uid]).sort((a, b) => b.t - a.t))); },
      onAnnouncements(cb) { return watch(() => cb(H.toArr(D.announcements))); },
      async getSettings() { sync(); return D.settings || {}; },
      // admin
      onAll(cb) { return watch(() => cb({ allow: D.allow, students: D.students, chats: D.chats, asks: D.asks, announcements: D.announcements, settings: D.settings, access: D.access || {} })); },
      async saveAccess(a) { sync(); D.access = { ...(D.access || {}), ...a }; save(); },
      async replyAsk(uid, aid, reply) { sync(); D.asks[uid][aid] = { ...D.asks[uid][aid], reply, repliedAt: Date.now() }; save(); },
      async saveAnnouncement(a) { sync(); const k = a.id || id(); const { id: _x, ...rest } = a; D.announcements[k] = { ...rest, t: Date.now() }; save(); },
      async deleteAnnouncement(k) { sync(); delete D.announcements[k]; save(); },
      async saveSettings(s) { sync(); D.settings = { ...D.settings, ...s }; save(); },
      async setAllow(map) { sync(); D.allow = map; save(); },
      async resetDemo() { sync(); localStorage.removeItem(KEY); D = load(); save(); }
    };
  }

  // ======================================================
  //  FIREBASE STORE (Realtime Database + Auth)
  // ======================================================
  function firebaseStore() {
    firebase.initializeApp(CFG.firebase);
    const auth = firebase.auth();
    const db = firebase.database();
    const ref = p => db.ref(p);
    const emailFor = sn => String(sn).trim() + "@" + CFG.emailDomain;
    const emailOf = p => (p.type || "student") === "student" ? emailFor(p.sn) : String(p.email).trim().toLowerCase();
    const mapErr = e => {
      const c = e && (e.code || e.message || "");
      if (/email-already-in-use/.test(c)) return new Error("ALREADY_REGISTERED");
      if (/wrong-password|user-not-found|invalid-credential|invalid-login/.test(c)) return new Error("BAD_LOGIN");
      if (/too-many-requests/.test(c)) return new Error("TOO_MANY");
      if (/weak-password/.test(c)) return new Error("WEAK_PASSWORD");
      if (/network/.test(c)) return new Error("NETWORK");
      return e;
    };
    return {
      demo: false,
      onAuth(cb) { auth.onAuthStateChanged(u => cb(u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null)); },
      async register(p, pw) {
        const type = p.type || "student";
        if (type === "staff" && !emailOf(p).endsWith("@" + CFG.staffEmailDomain)) throw new Error("STAFF_EMAIL");
        let cred;
        try { cred = await auth.createUserWithEmailAndPassword(emailOf(p), pw); } catch (e) { throw mapErr(e); }
        if (type === "staff") {
          try { await ref("staffLogin/" + p.staffNo).set(emailOf(p)); }
          catch (e) { try { await cred.user.delete(); } catch (x) { } throw new Error("STAFF_TAKEN"); }
        }
        try {
          await ref("students/" + cred.user.uid).set({ ...p, ...(type !== "student" ? { email: emailOf(p) } : {}), registeredAt: firebase.database.ServerValue.TIMESTAMP, lastSeen: firebase.database.ServerValue.TIMESTAMP });
        } catch (e) {
          // Rules refused: not on class list / wrong or closed workshop code → remove the half-made account
          if (type === "staff") { try { await ref("staffLogin/" + p.staffNo).remove(); } catch (x) { } }
          try { await cred.user.delete(); } catch (x) { }
          throw new Error(type === "student" ? "NOT_ON_LIST" : "BAD_CODE");
        }
        if (CFG.requireEmailVerification) { try { await cred.user.sendEmailVerification(); } catch (e) { } }
      },
      async resolveEmail(type, idv) { idv = String(idv).trim();
        if (type === "visitor" || idv.includes("@")) return idv.toLowerCase();
        if (type === "staff") { const s = await ref("staffLogin/" + idv).get(); if (!s.exists()) throw new Error("BAD_LOGIN"); return s.val(); }
        return emailFor(idv); },
      async login(emailOrSn, pw) {
        const email = emailOrSn.includes("@") ? emailOrSn.toLowerCase() : emailFor(emailOrSn);
        try { await auth.signInWithEmailAndPassword(email, pw); } catch (e) { throw mapErr(e); }
      },
      async resetPassword(snOrEmail) { try { await auth.sendPasswordResetEmail(String(snOrEmail).includes("@") ? snOrEmail : emailFor(snOrEmail)); } catch (e) { throw mapErr(e); } },
      async resendVerification() { if (auth.currentUser) await auth.currentUser.sendEmailVerification(); },
      async reloadUser() { if (!auth.currentUser) return null; await auth.currentUser.reload(); const u = auth.currentUser; return { uid: u.uid, email: u.email, emailVerified: u.emailVerified }; },
      async logout() { await auth.signOut(); },
      async getIdToken() { return auth.currentUser ? auth.currentUser.getIdToken() : null; },
      async isAdmin(uid) { try { return (await ref("admins/" + uid).get()).val() === true; } catch (e) { return false; } },
      async getProfile(uid) { return (await ref("students/" + uid).get()).val(); },
      async updateProfile(uid, patch) { await ref("students/" + uid).update(patch); },
      async addChat(uid, m) { await ref("chats/" + uid).push(m); },
      async getChats(uid, n) { const s = await ref("chats/" + uid).orderByChild("t").limitToLast(n || 60).get(); return H.toArr(s.val()).sort((a, b) => a.t - b.t); },
      async addAsk(uid, text) { await ref("asks/" + uid).push({ text, t: firebase.database.ServerValue.TIMESTAMP }); },
      onAsks(uid, cb) { const r = ref("asks/" + uid); const f = s => cb(H.toArr(s.val()).sort((a, b) => b.t - a.t)); r.on("value", f); return () => r.off("value", f); },
      onAnnouncements(cb) { const r = ref("announcements"); const f = s => cb(H.toArr(s.val())); r.on("value", f); return () => r.off("value", f); },
      async getSettings() { return (await ref("settings").get()).val() || {}; },
      // admin
      onAll(cb) {
        const state = {}; const paths = ["allow", "students", "chats", "asks", "announcements", "settings", "access"];
        const offs = paths.map(p => { const r = ref(p); const f = s => { state[p] = s.val() || {}; if (paths.every(k => k in state)) cb({ ...state }); }; r.on("value", f, err => console.warn(p, err)); return () => r.off("value", f); });
        return () => offs.forEach(o => o());
      },
      async replyAsk(uid, aid, reply) { await ref(`asks/${uid}/${aid}`).update({ reply, repliedAt: firebase.database.ServerValue.TIMESTAMP }); },
      async saveAnnouncement(a) { const { id, ...rest } = a; rest.t = firebase.database.ServerValue.TIMESTAMP; if (id) await ref("announcements/" + id).set(rest); else await ref("announcements").push(rest); },
      async deleteAnnouncement(id) { await ref("announcements/" + id).remove(); },
      async saveSettings(s) { await ref("settings").update(s); },
      async setAllow(map) { await ref("allow").set(map); },
      async saveAccess(a) { await ref("access").update(a); }
    };
  }

  // ---------- AI call through the Worker proxy ----------
  async function askAI(store, uid, system, messages, opts = {}) {
    if (store.demo) {
      await new Promise(r => setTimeout(r, 700));
      const last = (messages[messages.length - 1] || {}).content || "";
      const xh = /\b(molo|ndi|ndicela|enkosi|kunjani|ukuba|andiqondi)\b/i.test(last);
      const topic = /deriv|integr|sinh|cosh|differential|equation|math/i.test(last) ? "maths" : /python|code|excel|vba/i.test(last) ? "programming" : /train|bus|taxi|station/i.test(last) ? "transport" : /plan|timetable|exam|revis/i.test(last) ? "planning" : /nsfas|money|budget/i.test(last) ? "money" : "other";
      const body = xh
        ? "**Molo!** Le yimo yokubonisa (demo mode) — iimpendulo zenene ziya kuvela xa umhlohli eqhagamshele i-API.\n\nNdixelele ukuba uzame ntoni na kude kube ngoku, ndize ndikuncede inyathelo ngenyathelo."
        : "This is **demo mode** — real answers appear once your lecturer connects the AI service.\n\nIn the live tutor I would start by asking: *what have you tried so far?* Then I'd give you one hint at a time.";
      return body + `\n<<topic:${topic}>>`;
    }
    const token = await store.getIdToken();
    const res = await fetch(CFG.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ uid, system, messages, maxTokens: opts.maxTokens || 1200 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
    return data.text;
  }

  window.Tutor = { CFG, DEMO, H, TOPICS, buildSystemPrompt, splitTopic, askAI, store: DEMO ? demoStore() : firebaseStore() };
})();

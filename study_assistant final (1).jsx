import { useState, useRef, useEffect } from "react";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

async function callClaude(messages, system = "") {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "";
}

const SUBJECTS = [
  "Data Structures & Algorithms",
  "Operating Systems",
  "Database Management",
  "Web Development",
  "Machine Learning",
  "Computer Networks",
  "Software Engineering",
  "Cloud Computing",
];

const DEFAULT_PROGRESS = Object.fromEntries(SUBJECTS.map(s => [s, 0]));
const DEFAULT_STATS = { sessions: 0, flashcards: 0, summaries: 0, concepts: 0 };

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "assistant", label: "AI Assistant", icon: "🤖" },
  { id: "flashcards", label: "Flashcards", icon: "🃏" },
  { id: "summarizer", label: "Summarizer", icon: "📝" },
  { id: "concepts", label: "Concepts", icon: "💡" },
];

const accent = "#6C63FF";
const accentLight = "#EAE8FF";
const accentDark = "#4B44CC";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F7F6FF; color: #1a1a2e; }
  .app { display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 230px; background: #1a1a2e; display: flex; flex-direction: column; padding: 24px 16px; gap: 6px; flex-shrink: 0; }
  .sidebar-logo { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 24px; padding: 0 8px; letter-spacing: -0.5px; line-height: 1.3; }
  .sidebar-logo span { color: ${accent}; }
  .nav-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: none; background: none; color: #8888aa; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; text-align: left; width: 100%; }
  .nav-btn:hover { background: rgba(108,99,255,0.12); color: #fff; }
  .nav-btn.active { background: ${accent}; color: #fff; }
  .nav-icon { font-size: 16px; }
  .main { flex: 1; overflow-y: auto; padding: 32px; background: #F7F6FF; }
  .page-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; color: #1a1a2e; margin-bottom: 24px; letter-spacing: -0.5px; }
  .card { background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #ECEAF8; margin-bottom: 16px; }
  .btn { padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; transition: all 0.18s; }
  .btn-primary { background: ${accent}; color: #fff; }
  .btn-primary:hover { background: ${accentDark}; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-outline { background: transparent; border: 1.5px solid ${accent}; color: ${accent}; }
  .btn-outline:hover { background: ${accentLight}; }
  .input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #ECEAF8; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border 0.18s; background: #fff; }
  .input:focus { border-color: ${accent}; }
  textarea.input { resize: vertical; min-height: 100px; }
  .select { padding: 10px 14px; border-radius: 10px; border: 1.5px solid #ECEAF8; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; background: #fff; cursor: pointer; }
  .select:focus { border-color: ${accent}; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .badge-purple { background: ${accentLight}; color: ${accent}; }
  .badge-green { background: #E8F8F0; color: #1a8a4a; }
  .badge-amber { background: #FFF4E0; color: #c07800; }
  .loading { display: flex; align-items: center; gap: 8px; color: #8888aa; font-size: 14px; }
  .dot-anim { display: flex; gap: 4px; }
  .dot-anim span { width: 6px; height: 6px; border-radius: 50%; background: ${accent}; animation: bounce 1.2s infinite; }
  .dot-anim span:nth-child(2) { animation-delay: 0.2s; }
  .dot-anim span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #ECEAF8; }
  .stat-num { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; color: ${accent}; }
  .stat-label { font-size: 13px; color: #8888aa; margin-top: 4px; }
  .progress-bar-wrap { background: #ECEAF8; border-radius: 8px; height: 8px; overflow: hidden; }
  .progress-bar { height: 100%; background: linear-gradient(90deg, ${accent}, #a855f7); border-radius: 8px; transition: width 0.4s; }
  .chat-wrap { display: flex; flex-direction: column; height: 55vh; }
  .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-bottom: 8px; }
  .msg { max-width: 80%; padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
  .msg-user { align-self: flex-end; background: ${accent}; color: #fff; border-radius: 14px 14px 4px 14px; }
  .msg-ai { align-self: flex-start; background: #fff; border: 1px solid #ECEAF8; border-radius: 14px 14px 14px 4px; color: #1a1a2e; }
  .chat-input-row { display: flex; gap: 10px; margin-top: 14px; }
  .flashcard { perspective: 800px; cursor: pointer; }
  .flashcard-inner { position: relative; width: 100%; height: 200px; transform-style: preserve-3d; transition: transform 0.5s; }
  .flashcard-inner.flipped { transform: rotateY(180deg); }
  .flashcard-face { position: absolute; inset: 0; border-radius: 16px; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; padding: 24px; text-align: center; }
  .flashcard-front { background: ${accent}; color: #fff; font-size: 16px; font-weight: 500; }
  .flashcard-back { background: #1a1a2e; color: #fff; font-size: 14px; transform: rotateY(180deg); }
  .subject-pill { padding: 6px 14px; border-radius: 20px; border: 1.5px solid #ECEAF8; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.18s; white-space: nowrap; }
  .subject-pill.active { background: ${accent}; color: #fff; border-color: ${accent}; }
  .result-box { background: #F7F6FF; border-radius: 12px; padding: 18px; font-size: 14px; line-height: 1.8; color: #1a1a2e; white-space: pre-wrap; border-left: 4px solid ${accent}; }
  .progress-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .progress-subject { font-size: 13px; font-weight: 500; width: 190px; flex-shrink: 0; }
  .progress-pct { font-size: 13px; color: #8888aa; width: 40px; text-align: right; }
  .flashcard-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
  .fc-counter { font-size: 14px; color: #8888aa; font-weight: 500; }

  /* Login */
  .login-wrap { min-height: 100vh; background: #F7F6FF; display: flex; align-items: center; justify-content: center; }
  .login-card { background: #fff; border-radius: 20px; padding: 44px 40px; border: 1px solid #ECEAF8; width: 100%; max-width: 420px; }
  .login-logo { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 6px; }
  .login-logo span { color: ${accent}; }
  .login-sub { font-size: 14px; color: #8888aa; margin-bottom: 32px; }
  .login-label { font-size: 13px; color: #8888aa; display: block; margin-bottom: 6px; }
  .login-error { font-size: 13px; color: #e44; margin-top: 8px; }
  .user-chip { display: flex; align-items: center; gap: 8px; background: rgba(108,99,255,0.10); border-radius: 10px; padding: 8px 10px; }
  .user-avatar { width: 30px; height: 30px; border-radius: 50%; background: ${accent}; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; flex-shrink: 0; }
`;

// ── Storage helpers (per-user, keyed by email) ───────────────────────────────
function storageKey(email) {
  return "sa_user_" + email.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

async function loadUserData(email) {
  try {
    const result = await window.storage.get(storageKey(email));
    if (result) return JSON.parse(result.value);
  } catch {}
  return { stats: { ...DEFAULT_STATS }, progress: { ...DEFAULT_PROGRESS } };
}

async function saveUserData(email, data) {
  try {
    await window.storage.set(storageKey(email), JSON.stringify(data));
  } catch {}
}

// ── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    const data = await loadUserData(trimmed);
    onLogin(trimmed, data);
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Study <span>Assistant</span></div>
        <div className="login-sub">Your personal AI-powered software engineering study companion. Enter your email to load your saved progress.</div>
        <label className="login-label">Email address</label>
        <input
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}
          style={{ width: "100%", marginTop: 20, padding: 13 }}>
          {loading ? "Loading your progress..." : "Continue →"}
        </button>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 14, textAlign: "center" }}>
          Each email address has its own saved progress across sessions.
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ stats, progress, email }) {
  const name = email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{initials}</div>
        <div>
          <div className="page-title" style={{ marginBottom: 2 }}>Welcome back, {name}! 👋</div>
          <div style={{ fontSize: 13, color: "#8888aa" }}>{email}</div>
        </div>
      </div>
      <div className="stat-grid">
        {[
          { num: stats.sessions, label: "AI sessions" },
          { num: stats.flashcards, label: "Flashcards reviewed" },
          { num: stats.summaries, label: "Notes summarized" },
          { num: stats.concepts, label: "Concepts explained" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 18 }}>Subject Progress</div>
        {Object.entries(progress).map(([subj, pct]) => (
          <div className="progress-row" key={subj}>
            <div className="progress-subject">{subj}</div>
            <div style={{ flex: 1 }}>
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="progress-pct">{pct}%</div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: "#8888aa", marginTop: 8 }}>Progress is saved automatically to your account.</div>
      </div>
    </div>
  );
}

// ── AI Assistant ─────────────────────────────────────────────────────────────
function Assistant({ onSession, onProgressUpdate }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your AI study assistant for software engineering. Ask me anything — DSA, OS concepts, databases, web dev, ML, networking, or exam tips. Let's go! 🚀" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    const apiMessages = history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    const system = `You are a knowledgeable and friendly study assistant for college students studying software engineering. The current subject is: ${subject}. Explain concepts clearly, use code examples when helpful, and be encouraging. Keep responses concise but thorough.`;
    const reply = await callClaude(apiMessages, system);
    setMessages(prev => [...prev, { role: "ai", text: reply }]);
    setLoading(false);
    onSession();
    onProgressUpdate(subject, 5);
  };

  return (
    <div>
      <div className="page-title">AI Assistant 🤖</div>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#8888aa", whiteSpace: "nowrap" }}>Subject:</span>
          <select className="select" value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="chat-wrap">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-ai"}`}>{m.text}</div>
            ))}
            {loading && (
              <div className="msg msg-ai loading">
                <div className="dot-anim"><span /><span /><span /></div> Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-row">
            <input className="input" placeholder="Ask anything about software engineering..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
            <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Flashcards ───────────────────────────────────────────────────────────────
function Flashcards({ onReview, onProgressUpdate }) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ know: 0, dontKnow: 0 });

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setCards([]); setIdx(0); setFlipped(false); setScore({ know: 0, dontKnow: 0 });
    const prompt = `Generate 8 flashcard Q&A pairs about "${topic}" for a software engineering student studying ${subject}. Return ONLY a JSON array: [{"q":"...","a":"..."}]. No markdown, no explanation, just raw JSON.`;
    const raw = await callClaude([{ role: "user", content: prompt }]);
    try {
      setCards(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch {
      setCards([{ q: "Could not generate cards. Please try again.", a: "Try a more specific topic." }]);
    }
    setLoading(false);
    onReview();
    onProgressUpdate(subject, 8);
  };

  const next = (knew) => {
    setScore(prev => ({ ...prev, [knew ? "know" : "dontKnow"]: prev[knew ? "know" : "dontKnow"] + 1 }));
    setFlipped(false);
    setTimeout(() => setIdx(i => i + 1), 200);
  };

  const done = idx >= cards.length && cards.length > 0;

  return (
    <div>
      <div className="page-title">Flashcards 🃏</div>
      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <select className="select" value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="Topic (e.g. Binary Trees, REST APIs, Deadlocks...)" value={topic}
            onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} />
          <button className="btn btn-primary" onClick={generate} disabled={loading || !topic.trim()} style={{ whiteSpace: "nowrap" }}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
        {loading && <div className="loading"><div className="dot-anim"><span /><span /><span /></div> Creating flashcards...</div>}
      </div>

      {cards.length > 0 && !done && (
        <div className="card">
          <div className="flashcard" onClick={() => setFlipped(f => !f)}>
            <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
              <div className="flashcard-face flashcard-front">
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Question</div>
                  {cards[idx]?.q}
                </div>
              </div>
              <div className="flashcard-face flashcard-back">
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Answer</div>
                  {cards[idx]?.a}
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: 12, color: "#8888aa", margin: "8px 0" }}>Click card to flip</div>
          <div className="flashcard-nav">
            {flipped ? (
              <>
                <button className="btn btn-outline" onClick={() => next(false)}>❌ Still learning</button>
                <div className="fc-counter">{idx + 1} / {cards.length}</div>
                <button className="btn btn-primary" onClick={() => next(true)}>✅ Got it!</button>
              </>
            ) : (
              <div className="fc-counter">{idx + 1} / {cards.length} — Flip to reveal</div>
            )}
          </div>
        </div>
      )}

      {done && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Session Complete!</div>
          <div style={{ color: "#8888aa", marginBottom: 24 }}>You finished all {cards.length} flashcards</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24 }}>
            <span className="badge badge-green">✅ {score.know} knew</span>
            <span className="badge badge-amber">📚 {score.dontKnow} still learning</span>
          </div>
          <button className="btn btn-primary" onClick={() => { setIdx(0); setFlipped(false); setScore({ know: 0, dontKnow: 0 }); }}>Review Again</button>
        </div>
      )}
    </div>
  );
}

// ── Summarizer ───────────────────────────────────────────────────────────────
function Summarizer({ onSummarize, onProgressUpdate }) {
  const [notes, setNotes] = useState("");
  const [style, setStyle] = useState("concise");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const summarize = async () => {
    if (!notes.trim()) return;
    setLoading(true); setSummary("");
    const styleMap = {
      concise: "a concise bullet-point summary (5-7 key points)",
      detailed: "a detailed structured summary with main ideas and sub-points",
      exam: "an exam-focused summary highlighting key terms, definitions, and important facts to remember",
    };
    const prompt = `Summarize these ${subject} notes into ${styleMap[style]}.\n\nNotes:\n${notes}`;
    const result = await callClaude([{ role: "user", content: prompt }], "You are a study assistant helping software engineering students summarize their notes clearly and effectively.");
    setSummary(result);
    setLoading(false);
    onSummarize();
    onProgressUpdate(subject, 6);
  };

  return (
    <div>
      <div className="page-title">Note Summarizer 📝</div>
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <select className="select" value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <label style={{ fontSize: 13, color: "#8888aa", display: "block", marginBottom: 6 }}>Paste your notes or lecture content</label>
        <textarea className="input" placeholder="Paste your notes here..." value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 160, marginBottom: 14 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#8888aa" }}>Style:</span>
          {[["concise", "Concise"], ["detailed", "Detailed"], ["exam", "Exam Ready"]].map(([val, label]) => (
            <button key={val} className={`subject-pill ${style === val ? "active" : ""}`} onClick={() => setStyle(val)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={summarize} disabled={loading || !notes.trim()}>
          {loading ? "Summarizing..." : "Summarize Notes"}
        </button>
      </div>
      {loading && <div className="card loading"><div className="dot-anim"><span /><span /><span /></div> Analysing your notes...</div>}
      {summary && !loading && (
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            Summary <span className="badge badge-purple">{style}</span>
          </div>
          <div className="result-box">{summary}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn btn-outline" onClick={() => navigator.clipboard.writeText(summary)}>📋 Copy</button>
            <button className="btn btn-outline" onClick={() => setSummary("")}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Concepts ─────────────────────────────────────────────────────────────────
function Concepts({ onExplain, onProgressUpdate }) {
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState("college");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const explain = async () => {
    if (!concept.trim()) return;
    setLoading(true); setExplanation("");
    const levelMap = {
      simple: "a simple, plain-English explanation with a real-world analogy",
      college: "a thorough college-level explanation with key concepts and code/examples where relevant",
      advanced: "an advanced, technical deep-dive with nuances, trade-offs, and edge cases",
    };
    const prompt = `Explain the concept of "${concept}" (${subject}) as ${levelMap[level]}. Structure your explanation clearly.`;
    const result = await callClaude([{ role: "user", content: prompt }], "You are an expert software engineering professor who explains concepts clearly at any level requested.");
    setExplanation(result);
    setLoading(false);
    onExplain();
    onProgressUpdate(subject, 7);
  };

  return (
    <div>
      <div className="page-title">Concept Explainer 💡</div>
      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <select className="select" value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="e.g. Deadlock, HashMap, TCP/IP, Gradient Descent..." value={concept}
            onChange={e => setConcept(e.target.value)} onKeyDown={e => e.key === "Enter" && explain()} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#8888aa" }}>Depth:</span>
          {[["simple", "🟢 Simple"], ["college", "🟡 College"], ["advanced", "🔴 Advanced"]].map(([val, label]) => (
            <button key={val} className={`subject-pill ${level === val ? "active" : ""}`} onClick={() => setLevel(val)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={explain} disabled={loading || !concept.trim()}>
          {loading ? "Explaining..." : "Explain Concept"}
        </button>
      </div>
      {loading && <div className="card loading"><div className="dot-anim"><span /><span /><span /></div> Crafting your explanation...</div>}
      {explanation && !loading && (
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            {concept} <span className="badge badge-purple">{level}</span>
          </div>
          <div className="result-box">{explanation}</div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => navigator.clipboard.writeText(explanation)}>📋 Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({ ...DEFAULT_STATS });
  const [progress, setProgress] = useState({ ...DEFAULT_PROGRESS });
  const saveTimer = useRef(null);

  const handleLogin = (email, data) => {
    setUser(email);
    setStats(data.stats);
    setProgress(data.progress);
  };

  const persist = (newStats, newProgress) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveUserData(user, { stats: newStats, progress: newProgress });
    }, 800);
  };

  const inc = (key) => {
    setStats(prev => {
      const updated = { ...prev, [key]: prev[key] + 1 };
      persist(updated, progress);
      return updated;
    });
  };

  const updateProgress = (subject, pts) => {
    setProgress(prev => {
      const updated = { ...prev, [subject]: Math.min(100, (prev[subject] || 0) + pts) };
      persist(stats, updated);
      return updated;
    });
  };

  const handleLogout = () => {
    setUser(null);
    setTab("dashboard");
    setStats({ ...DEFAULT_STATS });
    setProgress({ ...DEFAULT_PROGRESS });
  };

  if (!user) return (
    <>
      <style>{styles}</style>
      <Login onLogin={handleLogin} />
    </>
  );

  const initials = user.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">Study <span>Assistant</span></div>
          {TABS.map(t => (
            <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="nav-icon">{t.icon}</span> {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* User chip + sign out */}
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user}</div>
            </div>
            <button onClick={handleLogout}
              style={{ background: "rgba(255,80,80,0.15)", border: "none", borderRadius: 6, color: "#ff6b6b", fontSize: 11, padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="main">
          {tab === "dashboard"  && <Dashboard stats={stats} progress={progress} email={user} />}
          {tab === "assistant"  && <Assistant onSession={() => inc("sessions")} onProgressUpdate={updateProgress} />}
          {tab === "flashcards" && <Flashcards onReview={() => inc("flashcards")} onProgressUpdate={updateProgress} />}
          {tab === "summarizer" && <Summarizer onSummarize={() => inc("summaries")} onProgressUpdate={updateProgress} />}
          {tab === "concepts"   && <Concepts onExplain={() => inc("concepts")} onProgressUpdate={updateProgress} />}
        </main>
      </div>
    </>
  );
}

import { useState, useEffect, useCallback } from "react";

const PIN_KEY       = "qnotes_pin";
const NOTES_KEY     = "qnotes_data";
const REMINDERS_KEY = "qnotes_reminders";
const DARK_KEY      = "qnotes_dark";
const DEFAULT_PIN   = "1234";
const CATEGORIES    = ["All", "Personal", "Shopping", "Work", "Templates"];

const CAT_COLORS = {
  Personal:  { bg: "#ede9fe", bgD: "#2e1065", text: "#5b21b6", textD: "#c4b5fd", dot: "#7c3aed" },
  Shopping:  { bg: "#fce7f3", bgD: "#500724", text: "#9d174d", textD: "#f9a8d4", dot: "#ec4899" },
  Work:      { bg: "#dbeafe", bgD: "#1e3a5f", text: "#1e40af", textD: "#93c5fd", dot: "#3b82f6" },
  Templates: { bg: "#d1fae5", bgD: "#064e3b", text: "#065f46", textD: "#6ee7b7", dot: "#10b981" },
  All:       { bg: "#f3f4f6", bgD: "#1f2937", text: "#374151", textD: "#9ca3af", dot: "#6b7280" },
};

const SAMPLE_NOTES = [
  { id: 1, title: "Home Address", category: "Templates", content: "123 Maple Street, Vancouver, BC V6B 1A1", type: "copy", pinned: true, created: Date.now() - 86400000, items: [], reminder: null },
  { id: 2, title: "Weekly Groceries", category: "Shopping", content: "", type: "checklist", pinned: false, created: Date.now() - 3600000, items: [{ id: 1, text: "Apples 10kg", done: false }, { id: 2, text: "Bananas", done: true }, { id: 3, text: "4L Milk", done: false }, { id: 4, text: "Organic Eggs", done: false }, { id: 5, text: "Olive Oil", done: true }], reminder: null },
  { id: 3, title: "Work Email Sign-off", category: "Work", content: "Best regards,\nYour Name\nyour@email.com", type: "copy", pinned: false, created: Date.now() - 7200000, items: [], reminder: null },
];

function getDefaultTitle(notes, type) {
  const base = type === "checklist" ? "My Checklist" : "My Note";
  const existing = notes.map(n => n.title);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

function encodeNote(note) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify({ title: note.title, content: note.content, type: note.type, category: note.category, items: note.items.map(i => ({ id: i.id, text: i.text, done: false })) })))); }
  catch { return null; }
}
function decodeNote(str) {
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
  catch { return null; }
}

// ── Theme helper ─────────────────────────────────────────────────────────────
const T = (dark, light, d) => dark ? d : light;

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#fff", padding: "10px 20px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      ✅ {msg}
    </div>
  );
}

// ── Import Popup ─────────────────────────────────────────────────────────────
function ImportPopup({ note, onAdd, onDismiss, dark }) {
  const col = CAT_COLORS[note.category] || CAT_COLORS.Personal;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: dark ? "#1f2937" : "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📨</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: dark ? "#f9fafb" : "#111" }}>Note Received!</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: dark ? "#9ca3af" : "#6b7280" }}>Someone shared a note with you</p>
        </div>
        <div style={{ background: dark ? col.bgD : col.bg, border: `2px solid ${col.dot}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: dark ? "#f9fafb" : "#111", marginBottom: 6 }}>{note.title}</div>
          {note.type === "copy"
            ? <div style={{ fontSize: 13, color: dark ? "#d1d5db" : "#374151", lineHeight: 1.6, maxHeight: 80, overflow: "hidden" }}>{note.content || "Empty note"}</div>
            : <div>{note.items.slice(0, 4).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: dark ? "#d1d5db" : "#374151" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid #d1d5db", flexShrink: 0 }} />{item.text}
                </div>
              ))}
              {note.items.length > 4 && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>+{note.items.length - 4} more...</div>}
            </div>
          }
        </div>
        <button onClick={onAdd} style={{ width: "100%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 10 }}>➕ Add to My QuickNotes</button>
        <button onClick={onDismiss} style={{ width: "100%", background: dark ? "#374151" : "#f3f4f6", color: dark ? "#d1d5db" : "#6b7280", border: "none", borderRadius: 12, padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Just View It</button>
      </div>
    </div>
  );
}

// ── PIN Screen ───────────────────────────────────────────────────────────────
function PinScreen({ onUnlock, isSetup }) {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const stored = localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
  const press = (d) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (isSetup) {
          if (!confirm) { setConfirm(next.join("")); setDigits([]); }
          else if (confirm === next.join("")) { localStorage.setItem(PIN_KEY, next.join("")); onUnlock(); }
          else { setShake(true); setDigits([]); setConfirm(null); setTimeout(() => setShake(false), 500); }
        } else {
          if (next.join("") === stored) onUnlock();
          else { setShake(true); setDigits([]); setTimeout(() => setShake(false), 500); }
        }
      }, 100);
    }
  };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
      <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>QuickNotes</h2>
      <p style={{ color: "#a5b4fc", fontSize: 13, margin: "0 0 36px" }}>{isSetup ? (confirm ? "Confirm your PIN" : "Set a 4-digit PIN") : "Enter your PIN"}</p>
      <div style={{ display: "flex", gap: 16, marginBottom: 40, animation: shake ? "shake 0.4s" : "none" }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < digits.length ? "#818cf8" : "transparent", border: "2px solid #818cf8", transition: "background 0.15s" }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,72px)", gap: 12 }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i) => (
          <button key={i} onClick={() => k === "⌫" ? setDigits(d => d.slice(0,-1)) : k !== "" && press(String(k))} disabled={k === ""}
            style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: k === "" ? "transparent" : k === "⌫" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)", color: "#fff", fontSize: k === "⌫" ? 20 : 24, fontWeight: 600, cursor: k === "" ? "default" : "pointer" }}
          >{k}</button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ── Reminder Modal ────────────────────────────────────────────────────────────
function ReminderModal({ note, onSave, onClose, dark }) {
  const [type, setType] = useState(note.reminder?.type || "once");
  const [datetime, setDatetime] = useState(note.reminder?.datetime || "");
  const [phone, setPhone] = useState(note.reminder?.phone || "");
  const [message, setMessage] = useState(note.reminder?.message || `🎉 ${note.title}\n\nJust a reminder!`);
  const [label, setLabel] = useState(note.reminder?.label || "Reminder");

  const inp = { background: dark ? "#374151" : "#f9fafb", border: `1px solid ${dark ? "#4b5563" : "#e5e7eb"}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: dark ? "#f9fafb" : "#111", fontFamily: "inherit", width: "100%", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: dark ? "#1f2937" : "#fff", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: dark ? "#f9fafb" : "#111" }}>🔔 Set Reminder</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>×</button>
        </div>

        {/* Reminder type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: dark ? "#9ca3af" : "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Type</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["once","One Time"],["birthday","🎂 Birthday"],["anniversary","💍 Anniversary"],["daily","Daily"],["weekly","Weekly"]].map(([v,l]) => (
              <button key={v} onClick={() => setType(v)} style={{ padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: type === v ? "#4f46e5" : dark ? "#374151" : "#f3f4f6", color: type === v ? "#fff" : dark ? "#d1d5db" : "#6b7280", fontWeight: 600, fontSize: 13 }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: dark ? "#9ca3af" : "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Mom's Birthday" style={inp} />
        </div>

        {/* Date/Time */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: dark ? "#9ca3af" : "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>
            {type === "birthday" || type === "anniversary" ? "Date (year optional)" : "Date & Time"}
          </label>
          <input
            type={type === "birthday" || type === "anniversary" ? "date" : "datetime-local"}
            value={datetime}
            onChange={e => setDatetime(e.target.value)}
            style={inp}
          />
        </div>

        {/* WhatsApp phone */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: dark ? "#9ca3af" : "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>📱 WhatsApp Number (optional)</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 604 123 4567" style={inp} />
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>When reminder fires, opens WhatsApp with message ready to send</div>
        </div>

        {/* Message */}
        {phone && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: dark ? "#9ca3af" : "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Message to Send</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              style={{ ...inp, resize: "vertical" }}
              placeholder="Happy Birthday! 🎂 Wishing you all the best!"
            />
            {/* Quick message templates */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {[
                ["🎂 Birthday", "🎂 Happy Birthday! Wishing you a wonderful day filled with joy and happiness! 🎉"],
                ["💍 Anniversary", "💍 Happy Anniversary! Wishing you both many more years of love and happiness! ❤️"],
                ["🎉 Custom", `🎉 ${note.title || "Reminder"}! Just thinking of you today. Hope you have a great day!`]
              ].map(([l, m]) => (
                <button key={l} onClick={() => setMessage(m)} style={{ padding: "4px 10px", borderRadius: 12, border: "none", cursor: "pointer", background: dark ? "#374151" : "#f3f4f6", color: dark ? "#d1d5db" : "#374151", fontSize: 11, fontWeight: 600 }}>{l}</button>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => onSave({ type, datetime, phone: phone.replace(/\s/g, ""), message, label, active: true })}
          style={{ width: "100%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          🔔 Save Reminder
        </button>
      </div>
    </div>
  );
}

// ── Note Editor ───────────────────────────────────────────────────────────────
function NoteEditor({ note, onSave, onClose, allNotes, dark }) {
  const [title, setTitle] = useState(note?.title || getDefaultTitle(allNotes, note?.type || "copy"));
  const [content, setContent] = useState(note?.content || "");
  const [type, setType] = useState(note?.type || "copy");
  const [category, setCategory] = useState(note?.category || "Personal");
  const [items, setItems] = useState(note?.items || []);
  const [newItem, setNewItem] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [reminder, setReminder] = useState(note?.reminder || null);

  useEffect(() => { if (!note?.id) setTitle(getDefaultTitle(allNotes, type)); }, [type]);

  const addItem = () => { if (!newItem.trim()) return; setItems(p => [...p, { id: Date.now(), text: newItem.trim(), done: false }]); setNewItem(""); };
  const save = () => onSave({ id: note?.id || Date.now(), title: title.trim() || getDefaultTitle(allNotes, type), content, type, category, items, pinned: note?.pinned || false, created: note?.created || Date.now(), reminder });

  const bg = dark ? "#111827" : "#fff";
  const textColor = dark ? "#f9fafb" : "#111";
  const borderCol = dark ? "#374151" : "#e5e7eb";
  const subText = dark ? "#9ca3af" : "#6b7280";

  return (
    <div style={{ position: "fixed", inset: 0, background: bg, zIndex: 100, display: "flex", flexDirection: "column" }}>
      {showReminder && <ReminderModal note={{ title, reminder }} onSave={r => { setReminder(r); setShowReminder(false); }} onClose={() => setShowReminder(false)} dark={dark} />}

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${borderCol}` }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: subText, padding: 4 }}>←</button>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..."
          style={{ flex: 1, border: "none", outline: "none", fontSize: 17, fontWeight: 700, color: textColor, fontFamily: "inherit", background: "transparent" }} />
        <button onClick={() => setShowReminder(true)} style={{ background: reminder ? "#4f46e5" : dark ? "#374151" : "#f3f4f6", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>🔔</button>
        <button onClick={save} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Save</button>
      </div>

      {reminder && (
        <div style={{ background: "#ede9fe", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#5b21b6", fontWeight: 600 }}>🔔 {reminder.label} — {reminder.datetime ? new Date(reminder.datetime).toLocaleDateString() : "Date not set"}</span>
          <button onClick={() => setReminder(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["copy","checklist"].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer", background: type === t ? "#4f46e5" : dark ? "#374151" : "#f3f4f6", color: type === t ? "#fff" : subText, fontWeight: 600, fontSize: 13 }}>
              {t === "copy" ? "📋 Copy mode" : "☑️ Checklist"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {CATEGORIES.filter(c => c !== "All").map(c => {
            const col = CAT_COLORS[c];
            return <button key={c} onClick={() => setCategory(c)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: category === c ? col.dot : dark ? col.bgD : col.bg, color: category === c ? "#fff" : dark ? col.textD : col.text, fontWeight: 600, fontSize: 12 }}>{c}</button>;
          })}
        </div>
        {type === "copy" ? (
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your note here..." rows={10}
            style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${borderCol}`, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "inherit", resize: "vertical", outline: "none", color: textColor, lineHeight: 1.6, background: dark ? "#1f2937" : "#fff" }} />
        ) : (
          <div>
            {items.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${borderCol}` }}>
                <span style={{ color: subText, fontSize: 13, width: 20, textAlign: "center" }}>{idx+1}</span>
                <input value={item.text} onChange={e => setItems(p => p.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))}
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 15, fontFamily: "inherit", color: textColor, background: "transparent" }} />
                <button onClick={() => setItems(p => p.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", color: "#f87171", fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="Add item..."
                style={{ flex: 1, border: `2px solid ${borderCol}`, borderRadius: 10, padding: "10px 14px", fontSize: 15, fontFamily: "inherit", outline: "none", color: textColor, background: dark ? "#1f2937" : "#fff" }} />
              <button onClick={addItem} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 18, cursor: "pointer" }}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reminders Screen ──────────────────────────────────────────────────────────
function RemindersScreen({ notes, onOpenNote, onClose, dark }) {
  const bg = dark ? "#111827" : "#f5f3ff";
  const card = dark ? "#1f2937" : "#fff";
  const textColor = dark ? "#f9fafb" : "#111";
  const subText = dark ? "#9ca3af" : "#6b7280";

  const reminders = notes
    .filter(n => n.reminder?.datetime)
    .sort((a, b) => new Date(a.reminder.datetime) - new Date(b.reminder.datetime));

  const openWhatsApp = (phone, message) => {
    const clean = phone.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: bg, zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#4f46e5)", padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#fff" }}>←</button>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 800 }}>🔔 Reminders & Events</h2>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {reminders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: subText }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <div style={{ fontWeight: 600 }}>No reminders yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Open any note and tap 🔔 to add a reminder</div>
          </div>
        ) : reminders.map(note => {
          const r = note.reminder;
          const date = new Date(r.datetime);
          const isPast = date < new Date();
          const typeEmoji = r.type === "birthday" ? "🎂" : r.type === "anniversary" ? "💍" : r.type === "daily" ? "🔁" : r.type === "weekly" ? "📅" : "🔔";
          return (
            <div key={note.id} style={{ background: card, borderRadius: 14, marginBottom: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: isPast ? "2px solid #fca5a5" : "2px solid transparent" }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{typeEmoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{r.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: subText }}>Note: {note.title}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isPast ? "#ef4444" : "#4f46e5", marginTop: 4 }}>
                      {isPast ? "⚠️ Overdue — " : "📅 "}{date.toLocaleDateString("en-CA", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      {r.type !== "birthday" && r.type !== "anniversary" && ` at ${date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  </div>
                  <button onClick={() => onOpenNote(note)} style={{ background: dark ? "#374151" : "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>✏️</button>
                </div>
              </div>
              {r.phone && (
                <button onClick={() => openWhatsApp(r.phone, r.message)} style={{ width: "100%", background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", border: "none", padding: "11px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>💬</span> Send WhatsApp to {r.phone}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function QuickNotes() {
  const [locked, setLocked]       = useState(true);
  const [setupPin, setSetupPin]   = useState(!localStorage.getItem(PIN_KEY));
  const [dark, setDark]           = useState(() => localStorage.getItem(DARK_KEY) === "true");
  const [notes, setNotes]         = useState(() => { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || SAMPLE_NOTES; } catch { return SAMPLE_NOTES; } });
  const [toast, setToast]         = useState(null);
  const [search, setSearch]       = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [editing, setEditing]     = useState(null);
  const [isNew, setIsNew]         = useState(false);
  const [globalCopy, setGlobalCopy] = useState(true);
  const [importNote, setImportNote] = useState(null);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("note");
    if (shared) { const d = decodeNote(shared); if (d) setImportNote(d); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(DARK_KEY, dark); }, [dark]);

  // Request notification permission and schedule reminders
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    const checkReminders = () => {
      const now = new Date();
      notes.forEach(note => {
        if (!note.reminder?.datetime || !note.reminder?.active) return;
        const rem = new Date(note.reminder.datetime);
        const diff = rem - now;
        if (diff > 0 && diff < 60000) {
          setTimeout(() => {
            if (Notification.permission === "granted") {
              const n = new Notification(`🔔 ${note.reminder.label}`, { body: note.title, icon: "/icon.svg" });
              if (note.reminder.phone) n.onclick = () => { window.open(`https://wa.me/${note.reminder.phone.replace(/[^0-9+]/g,"")}?text=${encodeURIComponent(note.reminder.message)}`, "_blank"); };
            }
          }, diff);
        }
      });
    };
    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [notes]);

  const showToast = (msg) => setToast(msg);

  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); showToast("Copied!"); } catch { showToast("Copy failed"); }
    document.body.removeChild(ta);
  };

  const copyNote = (note) => {
    const text = note.type === "checklist" ? note.items.map(i => `${i.done ? "✓" : "○"} ${i.text}`).join("\n") : note.content;
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => showToast("Copied!")).catch(() => fallbackCopy(text));
    else fallbackCopy(text);
  };

  const shareNote = async (note) => {
    const encoded = encodeNote(note);
    const base = window.location.href.split("?")[0];
    const longUrl = encoded ? `${base}?note=${encoded}` : null;
    const plainText = note.type === "checklist" ? note.items.map(i => `${i.done?"✓":"○"} ${i.text}`).join("\n") : note.content;
    let shareUrl = longUrl;
    if (longUrl) {
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        if (res.ok) shareUrl = await res.text();
      } catch { shareUrl = longUrl; }
    }
    if (navigator.share && shareUrl) {
      try { await navigator.share({ title: note.title, text: `📋 ${note.title}\n\nTap to add this note to your QuickNotes 👇`, url: shareUrl }); }
      catch (e) { if (e.name !== "AbortError") fallbackCopy(shareUrl); }
    } else if (shareUrl) { fallbackCopy(shareUrl); showToast("Short link copied!"); }
    else { fallbackCopy(plainText); showToast("Copied!"); }
  };

  const addImportedNote = () => {
    const n = { ...importNote, id: Date.now(), pinned: false, created: Date.now(), reminder: null, items: (importNote.items||[]).map(i=>({...i,done:false})) };
    setNotes(p => [n, ...p]); setImportNote(null); showToast(`"${n.title}" added!`);
  };

  const toggleItem = (noteId, itemId) => setNotes(p => p.map(n => n.id === noteId ? { ...n, items: n.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : n));
  const togglePin  = (id) => setNotes(p => p.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const deleteNote = (id) => setNotes(p => p.filter(n => n.id !== id));
  const saveNote   = (note) => { setNotes(p => p.find(n => n.id === note.id) ? p.map(n => n.id === note.id ? note : n) : [note,...p]); setEditing(null); };

  const reminderCount = notes.filter(n => n.reminder?.active).length;

  const filtered = notes
    .filter(n => activeCat === "All" || n.category === activeCat)
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));

  // Theme colors
  const bg       = dark ? "#111827" : "#f5f3ff";
  const card     = dark ? "#1f2937" : "#fff";
  const textColor= dark ? "#f9fafb" : "#111";
  const subText  = dark ? "#9ca3af" : "#6b7280";
  const borderCol= dark ? "#374151" : "#f3f4f6";

  if (locked) return <PinScreen isSetup={setupPin} onUnlock={() => { setLocked(false); setSetupPin(false); }} />;
  if (showReminders) return <RemindersScreen notes={notes} onOpenNote={n => { setShowReminders(false); setEditing(n); setIsNew(false); }} onClose={() => setShowReminders(false)} dark={dark} />;
  if (editing !== null) return <NoteEditor note={isNew ? null : editing} onSave={saveNote} onClose={() => setEditing(null)} allNotes={notes} dark={dark} />;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Inter','Segoe UI',sans-serif", transition: "background 0.3s" }}>
      {importNote && <ImportPopup note={importNote} onAdd={addImportedNote} onDismiss={() => setImportNote(null)} dark={dark} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#3730a3 70%,#4f46e5 100%)", padding: "20px 16px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 800 }}>📋 QuickNotes</h1>
            <p style={{ color: "#a5b4fc", margin: 0, fontSize: 12 }}>{notes.length} notes</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Reminders button */}
            <button onClick={() => setShowReminders(true)} style={{ position: "relative", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>
              🔔
              {reminderCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{reminderCount}</span>}
            </button>
            {/* Dark mode toggle */}
            <button onClick={() => setDark(p => !p)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>
              {dark ? "☀️" : "🌙"}
            </button>
            {/* Copy mode toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 600 }}>Copy</span>
              <div onClick={() => setGlobalCopy(p => !p)} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", background: globalCopy ? "#818cf8" : "#4b5563", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 2, left: globalCopy ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 14px 10px 36px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
        {CATEGORIES.map(c => {
          const col = CAT_COLORS[c];
          const count = c === "All" ? notes.length : notes.filter(n => n.category === c).length;
          return (
            <button key={c} onClick={() => setActiveCat(c)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: activeCat === c ? col.dot : card, color: activeCat === c ? "#fff" : dark ? col.textD : col.text, fontWeight: 600, fontSize: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              {c} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <div style={{ padding: "0 16px 100px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: subText }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 600 }}>No notes yet</div>
            <div style={{ fontSize: 13 }}>Tap + to create your first note</div>
          </div>
        ) : filtered.map(note => {
          const col = CAT_COLORS[note.category];
          const doneCount = note.items.filter(i => i.done).length;
          const totalCount = note.items.length;
          return (
            <div key={note.id} style={{ background: card, borderRadius: 16, marginBottom: 12, boxShadow: dark ? "0 2px 10px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.06)", border: note.pinned ? "2px solid #818cf8" : `2px solid ${borderCol}`, overflow: "hidden", transition: "background 0.3s" }}>

              <div style={{ padding: "14px 14px 10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {note.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                      {note.reminder?.active && <span style={{ fontSize: 12 }}>🔔</span>}
                      <span style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{note.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ background: dark ? col.bgD : col.bg, color: dark ? col.textD : col.text, borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{note.category}</span>
                      <span style={{ background: note.type === "checklist" ? (dark?"#500724":"#fce7f3") : (dark?"#2e1065":"#ede9fe"), color: note.type === "checklist" ? (dark?"#f9a8d4":"#9d174d") : (dark?"#c4b5fd":"#5b21b6"), borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        {note.type === "checklist" ? "☑️ Checklist" : "📋 Copy"}
                      </span>
                      {note.reminder?.active && (
                        <span style={{ background: dark?"#1e3a5f":"#dbeafe", color: dark?"#93c5fd":"#1e40af", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                          🔔 {note.reminder.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => togglePin(note.id)} style={{ background: note.pinned ? "#ede9fe" : dark?"#374151":"#f9fafb", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>📌</button>
                    <button onClick={() => { setEditing(note); setIsNew(false); }} style={{ background: dark?"#374151":"#f9fafb", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>✏️</button>
                    <button onClick={() => deleteNote(note.id)} style={{ background: dark?"#450a0a":"#fff1f2", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>🗑️</button>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 14px 14px" }}>
                {note.type === "copy" ? (
                  <div style={{ background: dark?"#111827":"#f9fafb", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: dark?"#d1d5db":"#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>
                    {note.content || <span style={{ color: "#9ca3af" }}>Empty note</span>}
                  </div>
                ) : (
                  <div>
                    {totalCount > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: subText }}>Progress</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>{doneCount}/{totalCount}</span>
                        </div>
                        <div style={{ background: dark?"#374151":"#f3f4f6", borderRadius: 8, height: 6 }}>
                          <div style={{ height: "100%", borderRadius: 8, transition: "width 0.3s", width: `${totalCount > 0 ? (doneCount/totalCount)*100 : 0}%`, background: doneCount === totalCount ? "#10b981" : "#818cf8" }} />
                        </div>
                      </div>
                    )}
                    {note.items.slice(0,5).map(item => (
                      <div key={item.id} onClick={() => toggleItem(note.id, item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${borderCol}`, cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: item.done ? "#4f46e5" : "transparent", border: item.done ? "2px solid #4f46e5" : `2px solid ${dark?"#4b5563":"#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                          {item.done && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: item.done ? "#9ca3af" : textColor, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
                      </div>
                    ))}
                    {note.items.length > 5 && <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>+{note.items.length-5} more items...</div>}
                  </div>
                )}
              </div>

              <div style={{ display: "flex" }}>
                {globalCopy && (
                  <button onClick={() => copyNote(note)} style={{ flex: 1, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRight: "1px solid rgba(255,255,255,0.2)" }}>
                    📋 Copy
                  </button>
                )}
                <button onClick={() => shareNote(note)} style={{ flex: 1, background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  📤 Share
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => { setEditing({}); setIsNew(true); }} style={{ position: "fixed", bottom: 24, right: 20, width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 20px rgba(79,70,229,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

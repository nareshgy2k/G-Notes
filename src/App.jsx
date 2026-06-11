import { useState, useEffect } from "react";

const PIN_KEY = "qnotes_pin";
const NOTES_KEY = "qnotes_data";
const DEFAULT_PIN = "1234";
const CATEGORIES = ["All", "Personal", "Shopping", "Work", "Templates"];

const CAT_COLORS = {
  Personal:  { bg: "#ede9fe", text: "#5b21b6", dot: "#7c3aed" },
  Shopping:  { bg: "#fce7f3", text: "#9d174d", dot: "#ec4899" },
  Work:      { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  Templates: { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  All:       { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" },
};

const SAMPLE_NOTES = [
  {
    id: 1, title: "Home Address", category: "Templates",
    content: "123 Maple Street, Vancouver, BC V6B 1A1",
    type: "copy", pinned: true, created: Date.now() - 86400000, items: []
  },
  {
    id: 2, title: "Weekly Groceries", category: "Shopping",
    content: "", type: "checklist", pinned: false, created: Date.now() - 3600000,
    items: [
      { id: 1, text: "Apples 10kg", done: false },
      { id: 2, text: "Bananas", done: true },
      { id: 3, text: "4L Milk", done: false },
      { id: 4, text: "Organic Eggs", done: false },
      { id: 5, text: "Olive Oil", done: true },
    ]
  },
  {
    id: 3, title: "Work Email Sign-off", category: "Work",
    content: "Best regards,\nYour Name\nnaresh@company.com",
    type: "copy", pinned: false, created: Date.now() - 7200000, items: []
  },
];

// ── Default name generator ───────────────────────────────────────────────────
function getDefaultTitle(notes, type) {
  const base = type === "checklist" ? "My Checklist" : "My Note";
  const existing = notes.map(n => n.title);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

// ── Encode / decode note into URL ────────────────────────────────────────────
function encodeNote(note) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify({
      title: note.title, content: note.content,
      type: note.type, category: note.category,
      items: note.items.map(i => ({ id: i.id, text: i.text, done: false }))
    }))));
  } catch { return null; }
}
function decodeNote(str) {
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
  catch { return null; }
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
      background: "#1a1a2e", color: "#fff", padding: "10px 20px", borderRadius: 24,
      fontSize: 13, fontWeight: 600, zIndex: 9999,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap"
    }}>
      ✅ {msg}
    </div>
  );
}

// ── Import Note Popup ────────────────────────────────────────────────────────
function ImportPopup({ note, onAdd, onDismiss }) {
  const col = CAT_COLORS[note.category] || CAT_COLORS.Personal;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 200, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 24,
        width: "100%", maxWidth: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📨</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111" }}>Note Received!</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>Someone shared a note with you</p>
        </div>

        <div style={{
          background: col.bg, border: `2px solid ${col.dot}`,
          borderRadius: 14, padding: 16, marginBottom: 20
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 6 }}>{note.title}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <span style={{ background: col.dot, color: "#fff", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{note.category}</span>
            <span style={{
              background: note.type === "checklist" ? "#fce7f3" : "#ede9fe",
              color: note.type === "checklist" ? "#9d174d" : "#5b21b6",
              borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600
            }}>
              {note.type === "checklist" ? "☑️ Checklist" : "📋 Copy note"}
            </span>
          </div>
          {note.type === "copy" ? (
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, maxHeight: 80, overflow: "hidden" }}>
              {note.content || "Empty note"}
            </div>
          ) : (
            <div>
              {note.items.slice(0, 4).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: "#374151" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid #d1d5db", flexShrink: 0 }} />
                  {item.text}
                </div>
              ))}
              {note.items.length > 4 && (
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>+{note.items.length - 4} more items...</div>
              )}
            </div>
          )}
        </div>

        <button onClick={onAdd} style={{
          width: "100%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff", border: "none", borderRadius: 12, padding: 14,
          fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 10
        }}>
          ➕ Add to My QuickNotes
        </button>
        <button onClick={onDismiss} style={{
          width: "100%", background: "#f3f4f6", color: "#6b7280",
          border: "none", borderRadius: 12, padding: 12,
          fontWeight: 600, fontSize: 14, cursor: "pointer"
        }}>
          Just View It
        </button>
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
          else if (confirm === next.join("")) {
            localStorage.setItem(PIN_KEY, next.join(""));
            onUnlock();
          } else {
            setShake(true); setDigits([]); setConfirm(null);
            setTimeout(() => setShake(false), 500);
          }
        } else {
          if (next.join("") === stored) onUnlock();
          else { setShake(true); setDigits([]); setTimeout(() => setShake(false), 500); }
        }
      }, 100);
    }
  };
  const del = () => setDigits(d => d.slice(0, -1));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0c29, #302b63, #24243e)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
      <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>QuickNotes</h2>
      <p style={{ color: "#a5b4fc", fontSize: 13, margin: "0 0 36px" }}>
        {isSetup ? (confirm ? "Confirm your PIN" : "Set a 4-digit PIN") : "Enter your PIN"}
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 40, animation: shake ? "shake 0.4s" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: i < digits.length ? "#818cf8" : "transparent",
            border: "2px solid #818cf8", transition: "background 0.15s"
          }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12 }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
          <button key={i}
            onClick={() => k === "⌫" ? del() : k !== "" && press(String(k))}
            disabled={k === ""}
            style={{
              width: 72, height: 72, borderRadius: "50%", border: "none",
              background: k === "" ? "transparent" : k === "⌫" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
              color: "#fff", fontSize: k === "⌫" ? 20 : 24,
              fontWeight: 600, cursor: k === "" ? "default" : "pointer"
            }}
          >{k}</button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ── Note Editor ──────────────────────────────────────────────────────────────
function NoteEditor({ note, onSave, onClose, allNotes }) {
  // If no title provided (new note), auto-generate default name
  const [title, setTitle] = useState(
    note?.title || getDefaultTitle(allNotes, note?.type || "copy")
  );
  const [content, setContent] = useState(note?.content || "");
  const [type, setType] = useState(note?.type || "copy");
  const [category, setCategory] = useState(note?.category || "Personal");
  const [items, setItems] = useState(note?.items || []);
  const [newItem, setNewItem] = useState("");

  // When type changes on a new note, update default title accordingly
  useEffect(() => {
    if (!note?.id) setTitle(getDefaultTitle(allNotes, type));
  }, [type]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems(p => [...p, { id: Date.now(), text: newItem.trim(), done: false }]);
    setNewItem("");
  };
  const removeItem = (id) => setItems(p => p.filter(i => i.id !== id));

  const save = () => {
    onSave({
      id: note?.id || Date.now(),
      title: title.trim() || getDefaultTitle(allNotes, type),
      content, type, category, items,
      pinned: note?.pinned || false,
      created: note?.created || Date.now()
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280", padding: 4 }}>←</button>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title (auto-filled if empty)"
          style={{ flex: 1, border: "none", outline: "none", fontSize: 17, fontWeight: 700, color: "#111", fontFamily: "inherit" }}
        />
        <button onClick={save} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Save</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {/* Type toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["copy", "checklist"].map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer",
              background: type === t ? "#4f46e5" : "#f3f4f6",
              color: type === t ? "#fff" : "#6b7280",
              fontWeight: 600, fontSize: 13
            }}>
              {t === "copy" ? "📋 Copy mode" : "☑️ Checklist"}
            </button>
          ))}
        </div>

        {/* Category */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {CATEGORIES.filter(c => c !== "All").map(c => {
            const col = CAT_COLORS[c];
            return (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                background: category === c ? col.dot : col.bg,
                color: category === c ? "#fff" : col.text,
                fontWeight: 600, fontSize: 12
              }}>{c}</button>
            );
          })}
        </div>

        {/* Content */}
        {type === "copy" ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={10}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "2px solid #e5e7eb", borderRadius: 12,
              padding: 14, fontSize: 15, fontFamily: "inherit",
              resize: "vertical", outline: "none", color: "#111", lineHeight: 1.6
            }}
          />
        ) : (
          <div>
            {items.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                <span style={{ color: "#9ca3af", fontSize: 13, width: 20, textAlign: "center" }}>{idx + 1}</span>
                <input
                  value={item.text}
                  onChange={e => setItems(p => p.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))}
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 15, fontFamily: "inherit", color: "#111" }}
                />
                <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 18, cursor: "pointer", padding: 4 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addItem()}
                placeholder="Add item..."
                style={{ flex: 1, border: "2px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 15, fontFamily: "inherit", outline: "none", color: "#111" }}
              />
              <button onClick={addItem} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 18, cursor: "pointer" }}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function QuickNotes() {
  const [locked, setLocked] = useState(true);
  const [setupPin, setSetupPin] = useState(!localStorage.getItem(PIN_KEY));
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || SAMPLE_NOTES; }
    catch { return SAMPLE_NOTES; }
  });
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [globalCopy, setGlobalCopy] = useState(true);
  const [importNote, setImportNote] = useState(null);

  // Check URL for shared note
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("note");
    if (shared) {
      const decoded = decodeNote(shared);
      if (decoded) setImportNote(decoded);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);

  const showToast = (msg) => setToast(msg);

  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); showToast("Copied to clipboard!"); }
    catch { showToast("Copy failed — try long-pressing"); }
    document.body.removeChild(ta);
  };

  const copyNote = (note) => {
    const text = note.type === "checklist"
      ? note.items.map(i => `${i.done ? "✓" : "○"} ${i.text}`).join("\n")
      : note.content;
    if (navigator.clipboard && window.isSecureContext)
      navigator.clipboard.writeText(text).then(() => showToast("Copied!")).catch(() => fallbackCopy(text));
    else fallbackCopy(text);
  };

  const shareNote = async (note) => {
    const encoded = encodeNote(note);
    const base = window.location.href.split("?")[0];
    const shareUrl = encoded ? `${base}?note=${encoded}` : null;
    const plainText = note.type === "checklist"
      ? note.items.map(i => `${i.done ? "✓" : "○"} ${i.text}`).join("\n")
      : note.content;
    const shareText = `📋 ${note.title}\n\n${plainText}`;

    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: note.title,
          text: shareText + "\n\nTap the link to add this note to your QuickNotes 👇",
          url: shareUrl
        });
      } catch (e) { if (e.name !== "AbortError") fallbackCopy(shareUrl); }
    } else if (shareUrl) {
      fallbackCopy(shareUrl);
      showToast("Share link copied — paste in WhatsApp!");
    } else {
      fallbackCopy(shareText);
      showToast("Copied — paste into WhatsApp!");
    }
  };

  const addImportedNote = () => {
    const newNote = {
      ...importNote, id: Date.now(), pinned: false, created: Date.now(),
      items: (importNote.items || []).map(i => ({ ...i, done: false }))
    };
    setNotes(prev => [newNote, ...prev]);
    setImportNote(null);
    showToast(`"${newNote.title}" added!`);
  };

  const toggleItem = (noteId, itemId) =>
    setNotes(prev => prev.map(n => n.id === noteId
      ? { ...n, items: n.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
      : n));

  const togglePin = (id) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));
  const saveNote = (note) => {
    setNotes(prev => prev.find(n => n.id === note.id)
      ? prev.map(n => n.id === note.id ? note : n)
      : [note, ...prev]);
    setEditing(null);
  };

  const filtered = notes
    .filter(n => activeCat === "All" || n.category === activeCat)
    .filter(n => !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (locked) return <PinScreen isSetup={setupPin} onUnlock={() => { setLocked(false); setSetupPin(false); }} />;
  if (editing !== null) return <NoteEditor note={isNew ? null : editing} onSave={saveNote} onClose={() => setEditing(null)} allNotes={notes} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ff", fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {importNote && <ImportPopup note={importNote} onAdd={addImportedNote} onDismiss={() => setImportNote(null)} />}

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 70%, #4f46e5 100%)",
        padding: "20px 16px 16px", position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 800 }}>📋 QuickNotes</h1>
            <p style={{ color: "#a5b4fc", margin: 0, fontSize: 12 }}>{notes.length} notes</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#a5b4fc", fontSize: 12, fontWeight: 600 }}>Copy Mode</span>
            <div onClick={() => setGlobalCopy(p => !p)} style={{
              width: 44, height: 24, borderRadius: 12, cursor: "pointer",
              position: "relative", background: globalCopy ? "#818cf8" : "#4b5563",
              transition: "background 0.2s"
            }}>
              <div style={{
                position: "absolute", top: 3, left: globalCopy ? 23 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
              }} />
            </div>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
              padding: "10px 14px 10px 36px", color: "#fff",
              fontSize: 14, outline: "none", fontFamily: "inherit"
            }}
          />
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
        {CATEGORIES.map(c => {
          const col = CAT_COLORS[c];
          const count = c === "All" ? notes.length : notes.filter(n => n.category === c).length;
          return (
            <button key={c} onClick={() => setActiveCat(c)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none",
              cursor: "pointer", whiteSpace: "nowrap",
              background: activeCat === c ? col.dot : "#fff",
              color: activeCat === c ? "#fff" : col.text,
              fontWeight: 600, fontSize: 12,
              boxShadow: activeCat === c ? "0 2px 8px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.07)"
            }}>
              {c} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Notes list */}
      <div style={{ padding: "0 16px 100px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 600, color: "#6b7280" }}>No notes yet</div>
            <div style={{ fontSize: 13 }}>Tap + to create your first note</div>
          </div>
        ) : filtered.map(note => {
          const col = CAT_COLORS[note.category];
          const doneCount = note.items.filter(i => i.done).length;
          const totalCount = note.items.length;
          return (
            <div key={note.id} style={{
              background: "#fff", borderRadius: 16, marginBottom: 12,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: note.pinned ? "2px solid #818cf8" : "2px solid transparent",
              overflow: "hidden"
            }}>
              {/* Card header */}
              <div style={{ padding: "14px 14px 10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {note.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{note.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ background: col.bg, color: col.text, borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{note.category}</span>
                      <span style={{
                        background: note.type === "checklist" ? "#fce7f3" : "#ede9fe",
                        color: note.type === "checklist" ? "#9d174d" : "#5b21b6",
                        borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 600
                      }}>
                        {note.type === "checklist" ? "☑️ Checklist" : "📋 Copy"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => togglePin(note.id)} style={{ background: note.pinned ? "#ede9fe" : "#f9fafb", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>📌</button>
                    <button onClick={() => { setEditing(note); setIsNew(false); }} style={{ background: "#f9fafb", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>✏️</button>
                    <button onClick={() => deleteNote(note.id)} style={{ background: "#fff1f2", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14 }}>🗑️</button>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "0 14px 14px" }}>
                {note.type === "copy" ? (
                  <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>
                    {note.content || <span style={{ color: "#9ca3af" }}>Empty note</span>}
                  </div>
                ) : (
                  <div>
                    {totalCount > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>Progress</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>{doneCount}/{totalCount}</span>
                        </div>
                        <div style={{ background: "#f3f4f6", borderRadius: 8, height: 6 }}>
                          <div style={{
                            height: "100%", borderRadius: 8, transition: "width 0.3s",
                            width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                            background: doneCount === totalCount ? "#10b981" : "#818cf8"
                          }} />
                        </div>
                      </div>
                    )}
                    {note.items.slice(0, 5).map(item => (
                      <div key={item.id} onClick={() => toggleItem(note.id, item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f9fafb", cursor: "pointer" }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: item.done ? "#4f46e5" : "#fff",
                          border: item.done ? "2px solid #4f46e5" : "2px solid #d1d5db",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s"
                        }}>
                          {item.done && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: item.done ? "#9ca3af" : "#111", textDecoration: item.done ? "line-through" : "none", transition: "all 0.15s" }}>{item.text}</span>
                      </div>
                    ))}
                    {note.items.length > 5 && <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>+{note.items.length - 5} more items...</div>}
                  </div>
                )}
              </div>

              {/* Copy + Share buttons */}
              <div style={{ display: "flex" }}>
                {globalCopy && (
                  <button onClick={() => copyNote(note)} style={{
                    flex: 1, background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#fff", border: "none", padding: "12px", fontWeight: 700,
                    fontSize: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    borderRight: "1px solid rgba(255,255,255,0.2)"
                  }}>
                    📋 Copy
                  </button>
                )}
                <button onClick={() => shareNote(note)} style={{
                  flex: 1, background: "linear-gradient(135deg, #059669, #10b981)",
                  color: "#fff", border: "none", padding: "12px", fontWeight: 700,
                  fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}>
                  📤 Share
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing({}); setIsNew(true); }}
        style={{
          position: "fixed", bottom: 24, right: 20,
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff", fontSize: 28, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(79,70,229,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
      >+</button>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

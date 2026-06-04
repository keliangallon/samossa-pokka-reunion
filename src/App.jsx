import { useState, useEffect, useCallback } from "react";
import { fbGet, fbSet, fbPatch, fbListen } from "./firebase";

/* ── Données par défaut ── */
const DEFAULT_SAMOSSAS = [
  { id: 1, name: "Samossa bœuf épicé",       vendor: "Marché de Saint-Paul",        lat: -21.0122, lng: 55.2743, ratings: {}, emoji: "🥟" },
  { id: 2, name: "Samossa poulet citron",     vendor: "Snack Ti'Bo – Saint-Denis",   lat: -20.8823, lng: 55.4504, ratings: {}, emoji: "🥟" },
  { id: 3, name: "Samossa légumes cari",      vendor: "Boulangerie du Port",          lat: -20.9333, lng: 55.2906, ratings: {}, emoji: "🥟" },
  { id: 4, name: "Samossa thon fromage",      vendor: "Chez Mamie Louise – Tampon",  lat: -21.2724, lng: 55.5189, ratings: {}, emoji: "🥟" },
  { id: 5, name: "Samossa crevettes rougail", vendor: "Snack Doudou – Saint-Leu",    lat: -21.1597, lng: 55.2843, ratings: {}, emoji: "🥟" },
];
const DEFAULT_POKKAS = [
  { id: 1, name: "Pokka bœuf carottes",      vendor: "Snack du Port",                lat: -20.9333, lng: 55.2906, ratings: {}, emoji: "🥙" },
  { id: 2, name: "Pokka poulet sauce",        vendor: "Resto Ti'Coin – Saint-Pierre", lat: -21.3393, lng: 55.4781, ratings: {}, emoji: "🥙" },
  { id: 3, name: "Pokka végétarien",          vendor: "Marché Forain – Cilaos",       lat: -21.1366, lng: 55.4764, ratings: {}, emoji: "🥙" },
  { id: 4, name: "Pokka crevettes rougail",   vendor: "Chez Doudou – Sainte-Rose",    lat: -21.1247, lng: 55.7986, ratings: {}, emoji: "🥙" },
];

/* ── Carte SVG ── */
const REUNION_PATH = "M 200,30 C 240,20 290,30 330,60 C 370,90 390,130 395,170 C 400,210 385,255 360,285 C 335,315 300,335 265,345 C 230,355 190,350 160,335 C 130,320 105,295 90,265 C 75,235 70,200 75,170 C 80,140 95,115 115,90 C 135,65 165,40 200,30 Z";
function latLngToSVG(lat, lng) {
  return {
    x: ((lng - 55.1) / (55.9 - 55.1)) * 430 + 20,
    y: ((-20.8 - lat) / (-20.8 - -21.5)) * 380 + 20,
  };
}

/* ── Helpers ── */
function avgRating(item) {
  const vals = Object.values(item.ratings || {});
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function toArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return Object.values(obj);
}
const STARS = [1, 2, 3, 4, 5];

/* ── StarRow ── */
function StarRow({ value, onRate }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {STARS.map(s => (
        <button key={s} onClick={() => onRate(s)}
          onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1, padding: "1px",
            color: s <= (hov || Math.round(value)) ? "#F5A623" : "#ccc",
            transform: hov === s ? "scale(1.2)" : "scale(1)", transition: "all .12s" }}>★</button>
      ))}
    </div>
  );
}

/* ── RankCard ── */
function RankCard({ item, rank, players, currentPlayer, onRate }) {
  const avg = avgRating(item);
  const ratings = item.ratings || {};
  const myRating = ratings[currentPlayer] || 0;
  const medals = ["🥇", "🥈", "🥉"];
  const voteCount = Object.keys(ratings).length;
  const hasVotes = voteCount > 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16,
      display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.1rem", minWidth: 28, fontWeight: 600 }}>
          {hasVotes && rank < 3 ? medals[rank] : `#${rank + 1}`}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{item.emoji} {item.name}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📍 {item.vendor}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: hasVotes ? "#F5A623" : "#d1d5db" }}>
            {hasVotes ? avg.toFixed(1) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{voteCount} vote{voteCount !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {players.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {players.map(p => (
            <span key={p.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6,
              background: p.id === currentPlayer ? "#dbeafe" : "#f3f4f6",
              color: p.id === currentPlayer ? "#1d4ed8" : "#374151",
              border: "1px solid " + (p.id === currentPlayer ? "#93c5fd" : "#e5e7eb") }}>
              {p.name}: {ratings[p.id] ? "★".repeat(ratings[p.id]) : "—"}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#6b7280", flexShrink: 0 }}>
          {players.find(p => p.id === currentPlayer)?.name || "?"} :
        </span>
        <StarRow value={myRating} onRate={s => onRate(item.id, s)} />
        {myRating > 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>({myRating}/5)</span>}
      </div>
    </div>
  );
}

/* ── Carte Réunion ── */
function ReunionMap({ items, onSelectVendor, selectedId }) {
  const [tooltip, setTooltip] = useState(null);
  return (
    <div>
      <svg viewBox="0 0 480 430" style={{ width: "100%", maxWidth: 480, display: "block", margin: "0 auto" }}>
        <path d={REUNION_PATH} fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        {items.map(item => {
          const pos = latLngToSVG(item.lat, item.lng);
          const avg = avgRating(item);
          const isSel = selectedId === item.id;
          return (
            <g key={item.id} onClick={() => onSelectVendor(item.id)}
              onMouseEnter={() => setTooltip(item)} onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}>
              <circle cx={pos.x} cy={pos.y} r={isSel ? 14 : 10}
                fill={isSel ? "#F5A623" : avg > 3 ? "#16a34a" : avg > 0 ? "#2563eb" : "#fff"}
                stroke={isSel ? "#b45309" : "#374151"} strokeWidth={isSel ? 2 : 1} />
              <text x={pos.x} y={pos.y + 4.5} textAnchor="middle"
                fontSize={isSel ? 11 : 9} fontWeight="600"
                fill={isSel || avg > 0 ? "white" : "#6b7280"}>
                {avg > 0 ? avg.toFixed(1) : "?"}
              </text>
            </g>
          );
        })}
        {tooltip && (() => {
          const pos = latLngToSVG(tooltip.lat, tooltip.lng);
          const tx = pos.x > 300 ? pos.x - 135 : pos.x + 14;
          const ty = pos.y > 300 ? pos.y - 55 : pos.y - 12;
          return (
            <g>
              <rect x={tx} y={ty} width={130} height={44} rx={4} fill="white" stroke="#d1d5db" strokeWidth="0.5" />
              <text x={tx+8} y={ty+16} fontSize="10" fontWeight="600" fill="#111827">
                {tooltip.emoji} {tooltip.name.length > 14 ? tooltip.name.slice(0,14)+"…" : tooltip.name}
              </text>
              <text x={tx+8} y={ty+30} fontSize="9" fill="#6b7280">
                {tooltip.vendor.length > 20 ? tooltip.vendor.slice(0,20)+"…" : tooltip.vendor}
              </text>
            </g>
          );
        })()}
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: 11, color: "#6b7280", flexWrap: "wrap" }}>
        <span><span style={{ color: "#16a34a" }}>●</span> Note &gt; 3</span>
        <span><span style={{ color: "#2563eb" }}>●</span> Note ≤ 3</span>
        <span style={{ color: "#9ca3af" }}>● Pas noté</span>
        <span><span style={{ color: "#F5A623" }}>●</span> Sélectionné</span>
      </div>
    </div>
  );
}

/* ── App principale ── */
export default function App() {
  const [tab, setTab]           = useState("samossa");
  const [samossas, setSamossas] = useState(DEFAULT_SAMOSSAS);
  const [pokkas, setPokkas]     = useState(DEFAULT_POKKAS);
  const [players, setPlayers]   = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [showMap, setShowMap]   = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [showAddItem, setShowAddItem]   = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newItemName, setNewItemName]   = useState("");
  const [newItemVendor, setNewItemVendor] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [nextId, setNextId]     = useState(200);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [fbError, setFbError]   = useState(false);

  /* ── Chargement initial ── */
  useEffect(() => {
    async function load() {
      try {
        const [fbS, fbP, fbPl] = await Promise.all([
          fbGet("samossas"), fbGet("pokkas"), fbGet("players"),
        ]);

        if (fbS) setSamossas(toArray(fbS));
        else { await fbSet("samossas", Object.fromEntries(DEFAULT_SAMOSSAS.map(s => [s.id, s]))); }

        if (fbP) setPokkas(toArray(fbP));
        else { await fbSet("pokkas", Object.fromEntries(DEFAULT_POKKAS.map(p => [p.id, p]))); }

        const playerList = fbPl ? toArray(fbPl) : [];
        setPlayers(playerList);

        const saved = localStorage.getItem("currentPlayerId");
        const found = playerList.find(p => p.id === saved);
        if (found) setCurrentPlayer(saved);
        else if (playerList.length > 0) setCurrentPlayer(playerList[0].id);

      } catch (e) {
        console.error("Firebase load error:", e);
        setFbError(true);
        // Mode dégradé : fonctionne sans Firebase
        setPlayers([{ id: "local", name: "Moi" }]);
        setCurrentPlayer("local");
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ── Temps réel ── */
  useEffect(() => {
    if (fbError) return;
    const u1 = fbListen("samossas", d => { if (d) setSamossas(toArray(d)); });
    const u2 = fbListen("pokkas",   d => { if (d) setPokkas(toArray(d)); });
    const u3 = fbListen("players",  d => { if (d) setPlayers(toArray(d)); });
    return () => { u1(); u2(); u3(); };
  }, [fbError]);

  /* ── Vote ── */
  const handleRate = useCallback(async (itemId, stars) => {
    if (!currentPlayer) return;
    const path = tab === "samossa" ? "samossas" : "pokkas";
    // Mise à jour locale immédiate
    const setFn = tab === "samossa" ? setSamossas : setPokkas;
    setFn(prev => prev.map(it =>
      it.id === itemId ? { ...it, ratings: { ...(it.ratings||{}), [currentPlayer]: stars } } : it
    ));
    // Sync Firebase
    setSyncing(true);
    await fbPatch(`${path}/${itemId}/ratings`, { [currentPlayer]: stars });
    setSyncing(false);
  }, [currentPlayer, tab]);

  /* ── Ajouter item ── */
  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    const id = nextId;
    setNextId(n => n + 1);
    const newItem = {
      id, name: newItemName.trim(),
      vendor: newItemVendor.trim() || "Vendeur inconnu",
      lat: -21.09 + (Math.random() - 0.5) * 0.4,
      lng: 55.53 + (Math.random() - 0.5) * 0.4,
      ratings: {}, emoji: tab === "samossa" ? "🥟" : "🥙",
    };
    const setFn = tab === "samossa" ? setSamossas : setPokkas;
    setFn(prev => [...prev, newItem]);
    await fbSet(`${tab === "samossa" ? "samossas" : "pokkas"}/${id}`, newItem);
    setNewItemName(""); setNewItemVendor(""); setShowAddItem(false);
  };

  /* ── Ajouter joueur ── */
  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    const id = "p" + Date.now();
    const player = { id, name: newPlayerName.trim() };
    setPlayers(prev => [...prev, player]);
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
    await fbSet(`players/${id}`, player);
    setNewPlayerName(""); setShowAddPlayer(false);
  };

  const switchPlayer = (id) => {
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
  };

  const items = tab === "samossa" ? samossas : pokkas;
  const sortedItems = [...items].sort((a, b) => avgRating(b) - avgRating(a));
  const playerScores = players.map(p => {
    const vals = items.flatMap(it => (it.ratings||{})[p.id] ? [(it.ratings||{})[p.id]] : []);
    return { ...p, avg: vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "—", count: vals.length };
  });

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", gap: 12, fontFamily: "system-ui" }}>
      <div style={{ fontSize: 48 }}>🥟</div>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Chargement…</div>
    </div>
  );

  /* ── Rendu principal ── */
  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", marginBottom: 12 };

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "24px 16px 64px", fontFamily: "system-ui, sans-serif", background: "#f9fafb", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40 }}>🌴</div>
        <h1 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 700, color: "#111827" }}>Classement Réunion</h1>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", letterSpacing: "0.1em" }}>SAMOSSAS & POKKAS</p>
        {fbError && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#ef4444" }}>⚠️ Mode hors-ligne (vérifie les règles Firebase)</p>}
        {syncing && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>⏳ Sauvegarde…</p>}
      </div>

      {/* Joueurs */}
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, fontWeight: 600 }}>👥 Joueurs — clique sur ton prénom :</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {players.map(p => (
            <button key={p.id} onClick={() => switchPlayer(p.id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              background: p.id === currentPlayer ? "#dbeafe" : "#f3f4f6",
              border: "1px solid " + (p.id === currentPlayer ? "#93c5fd" : "#e5e7eb"),
              borderRadius: 10, cursor: "pointer",
            }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                background: p.id === currentPlayer ? "#1d4ed8" : "#d1d5db",
                color: p.id === currentPlayer ? "white" : "#6b7280",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.name.slice(0,2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: p.id === currentPlayer ? 600 : 400,
                color: p.id === currentPlayer ? "#1d4ed8" : "#374151" }}>{p.name}</span>
            </button>
          ))}
          {showAddPlayer ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                placeholder="Ton prénom" autoFocus
                onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
                style={{ width: 130, padding: "7px 10px", fontSize: 13, borderRadius: 8, border: "1px solid #d1d5db" }} />
              <button onClick={handleAddPlayer} style={{ padding: "7px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #93c5fd", background: "#dbeafe", color: "#1d4ed8", fontWeight: 600 }}>OK</button>
              <button onClick={() => setShowAddPlayer(false)} style={{ padding: "7px 10px", fontSize: 13, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowAddPlayer(true)} style={{ padding: "8px 14px", fontSize: 13, borderRadius: 10,
              border: "1px dashed #d1d5db", background: "transparent", color: "#9ca3af", cursor: "pointer" }}>
              + Joueur
            </button>
          )}
        </div>

        {players.length > 1 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[...playerScores].sort((a,b) => (parseFloat(b.avg)||0) - (parseFloat(a.avg)||0)).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}>
                <span>{i===0?"🏆":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: "#6b7280" }}>moy. {p.avg} · {p.count}/{items.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["samossa","pokka"].map(t => (
          <button key={t} onClick={() => { setTab(t); setShowMap(false); }} style={{
            flex: 1, padding: 12, borderRadius: 10, cursor: "pointer", fontSize: 14,
            background: tab===t ? "#dbeafe" : "#fff",
            border: "1px solid " + (tab===t ? "#93c5fd" : "#e5e7eb"),
            color: tab===t ? "#1d4ed8" : "#6b7280", fontWeight: tab===t ? 600 : 400 }}>
            {t==="samossa" ? "🥟 Samossas" : "🥙 Pokkas"}
          </button>
        ))}
      </div>

      {/* Bouton carte */}
      {tab === "samossa" && (
        <button onClick={() => setShowMap(m => !m)} style={{
          width: "100%", padding: 10, marginBottom: 12, borderRadius: 10, cursor: "pointer",
          background: showMap ? "#f0fdf4" : "#fff", border: "1px solid " + (showMap ? "#86efac" : "#e5e7eb"),
          color: showMap ? "#16a34a" : "#6b7280", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          🗺️ {showMap ? "Masquer la carte" : "Carte des vendeurs"}
        </button>
      )}

      {/* Carte */}
      {showMap && tab === "samossa" && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <ReunionMap items={samossas} onSelectVendor={id => setSelectedPin(selectedPin===id?null:id)} selectedId={selectedPin} />
          {selectedPin && (() => {
            const item = samossas.find(s => s.id === selectedPin);
            return item ? (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#f9fafb", border: "1px solid #e5e7eb",
                borderRadius: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.emoji} {item.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>📍 {item.vendor}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Voter :</span>
                  <StarRow value={(item.ratings||{})[currentPlayer]||0} onRate={s => handleRate(item.id, s)} />
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Classement */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sortedItems.map((item, idx) => (
          <RankCard key={item.id} item={item} rank={idx}
            players={players} currentPlayer={currentPlayer} onRate={handleRate} />
        ))}
      </div>

      {/* Ajouter item */}
      <div style={{ marginTop: 12 }}>
        {showAddItem ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Ajouter {tab==="samossa" ? "un samossa 🥟" : "un pokka 🥙"}
            </div>
            {[
              { label:"Nom", val:newItemName, set:setNewItemName, ph: tab==="samossa"?"Ex: Samossa bœuf épicé":"Ex: Pokka crevettes" },
              { label:"Vendeur / Snack", val:newItemVendor, set:setNewItemVendor, ph:"Ex: Marché de Saint-Paul" },
            ].map(({ label, val, set, ph }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <label style={{ display:"block", fontSize:12, color:"#6b7280", marginBottom:4 }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  style={{ width:"100%", padding:"8px 12px", fontSize:14, borderRadius:8, border:"1px solid #d1d5db", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={() => setShowAddItem(false)}
                style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #e5e7eb", background:"#f9fafb", cursor:"pointer", fontSize:13 }}>
                Annuler
              </button>
              <button onClick={handleAddItem}
                style={{ flex:2, padding:10, borderRadius:8, border:"1px solid #93c5fd", background:"#dbeafe", color:"#1d4ed8", fontWeight:600, cursor:"pointer", fontSize:13 }}>
                Ajouter
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddItem(true)}
            style={{ width:"100%", padding:12, borderRadius:10, border:"1px dashed #d1d5db",
              background:"transparent", color:"#9ca3af", cursor:"pointer", fontSize:13,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            + Ajouter {tab==="samossa" ? "un samossa" : "un pokka"}
          </button>
        )}
      </div>

      <p style={{ textAlign:"center", fontSize:11, color:"#9ca3af", marginTop:32 }}>
        🔥 Sauvegarde temps réel Firebase · chaque joueur vote une fois par item
      </p>
    </div>
  );
}

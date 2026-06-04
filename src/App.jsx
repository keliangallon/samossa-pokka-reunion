import { useState, useEffect, useCallback } from "react";
import { fbGet, fbSet, fbPatch, fbListen } from "./firebase";

/* ───────────────── DONNÉES PAR DÉFAUT ───────────────── */
const DEFAULT_SAMOSSAS = [
  { id: 1, name: "Samossa bœuf épicé",      vendor: "Marché de Saint-Paul",        lat: -21.0122, lng: 55.2743, ratings: {}, emoji: "🥟" },
  { id: 2, name: "Samossa poulet citron",    vendor: "Snack Ti'Bo – Saint-Denis",   lat: -20.8823, lng: 55.4504, ratings: {}, emoji: "🥟" },
  { id: 3, name: "Samossa légumes cari",     vendor: "Boulangerie du Port",          lat: -20.9333, lng: 55.2906, ratings: {}, emoji: "🥟" },
  { id: 4, name: "Samossa thon fromage",     vendor: "Chez Mamie Louise – Tampon",  lat: -21.2724, lng: 55.5189, ratings: {}, emoji: "🥟" },
  { id: 5, name: "Samossa crevettes rougail",vendor: "Snack Doudou – Saint-Leu",    lat: -21.1597, lng: 55.2843, ratings: {}, emoji: "🥟" },
];
const DEFAULT_POKKAS = [
  { id: 1, name: "Pokka bœuf carottes",     vendor: "Snack du Port",                lat: -20.9333, lng: 55.2906, ratings: {}, emoji: "🥙" },
  { id: 2, name: "Pokka poulet sauce",       vendor: "Resto Ti'Coin – Saint-Pierre", lat: -21.3393, lng: 55.4781, ratings: {}, emoji: "🥙" },
  { id: 3, name: "Pokka végétarien",         vendor: "Marché Forain – Cilaos",       lat: -21.1366, lng: 55.4764, ratings: {}, emoji: "🥙" },
  { id: 4, name: "Pokka crevettes rougail",  vendor: "Chez Doudou – Sainte-Rose",    lat: -21.1247, lng: 55.7986, ratings: {}, emoji: "🥙" },
];

/* ───────────────── SVG MAP ───────────────── */
const REUNION_PATH = "M 200,30 C 240,20 290,30 330,60 C 370,90 390,130 395,170 C 400,210 385,255 360,285 C 335,315 300,335 265,345 C 230,355 190,350 160,335 C 130,320 105,295 90,265 C 75,235 70,200 75,170 C 80,140 95,115 115,90 C 135,65 165,40 200,30 Z";

function latLngToSVG(lat, lng) {
  const x = ((lng - 55.1) / (55.9 - 55.1)) * 430 + 20;
  const y = ((-20.8 - lat) / (-20.8 - -21.5)) * 380 + 20;
  return { x, y };
}

/* ───────────────── HELPERS ───────────────── */
function avgRating(item) {
  const vals = Object.values(item.ratings || {});
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function sortedByRating(items) {
  return [...items].sort((a, b) => avgRating(b) - avgRating(a));
}
const STARS = [1, 2, 3, 4, 5];

/* ───────────────── COMPOSANTS ───────────────── */
function StarRow({ value, onRate }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {STARS.map((s) => (
        <button key={s} onClick={() => onRate(s)}
          onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem",
            color: s <= (hov || Math.round(value)) ? "#F5A623" : "var(--color-border-secondary)",
            transform: hov === s ? "scale(1.2)" : "scale(1)", transition: "all .12s", padding: "1px", lineHeight: 1 }}>★</button>
      ))}
    </div>
  );
}

function RankCard({ item, rank, players, currentPlayer, onRate }) {
  const avg = avgRating(item);
  const myRating = (item.ratings || {})[currentPlayer] || 0;
  const medals = ["🥇", "🥈", "🥉"];
  const hasVotes = Object.keys(item.ratings || {}).length > 0;
  const voteCount = Object.keys(item.ratings || {}).length;
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.1rem", minWidth: 28, fontWeight: 500 }}>
          {hasVotes && rank < 3 ? medals[rank] : `#${rank + 1}`}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>{item.emoji} {item.name}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>📍 {item.vendor}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: hasVotes ? "#F5A623" : "var(--color-text-tertiary)" }}>
            {hasVotes ? avg.toFixed(1) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{voteCount} vote{voteCount !== 1 ? "s" : ""}</div>
        </div>
      </div>
      {players.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {players.map(p => (
            <span key={p.id} style={{ fontSize: 11, padding: "2px 8px",
              background: p.id === currentPlayer ? "var(--color-background-info)" : "var(--color-background-secondary)",
              color: p.id === currentPlayer ? "var(--color-text-info)" : "var(--color-text-secondary)",
              borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              {p.name}: {(item.ratings || {})[p.id] ? "★".repeat((item.ratings || {})[p.id]) : "—"}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flexShrink: 0 }}>
          {players.find(p => p.id === currentPlayer)?.name} :
        </span>
        <StarRow value={myRating} onRate={(s) => onRate(item.id, s)} />
        {myRating > 0 && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>({myRating}/5)</span>}
      </div>
    </div>
  );
}

function ReunionMap({ items, onSelectVendor, selectedId }) {
  const [tooltip, setTooltip] = useState(null);
  return (
    <div>
      <svg viewBox="0 0 480 430" style={{ width: "100%", maxWidth: 480, display: "block", margin: "0 auto" }}>
        <path d={REUNION_PATH} fill="var(--color-background-secondary)" stroke="var(--color-border-primary)" strokeWidth="1.5" />
        <path d="M 200,80 C 220,100 240,120 245,150 C 248,170 240,190 228,205" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="1" />
        {items.map((item) => {
          const pos = latLngToSVG(item.lat, item.lng);
          const avg = avgRating(item);
          const isSel = selectedId === item.id;
          return (
            <g key={item.id} onClick={() => onSelectVendor(item.id)}
              onMouseEnter={() => setTooltip(item)} onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}>
              <circle cx={pos.x} cy={pos.y} r={isSel ? 14 : 10}
                fill={isSel ? "#F5A623" : avg > 3 ? "#1D9E75" : avg > 0 ? "#378ADD" : "var(--color-background-primary)"}
                stroke={isSel ? "#c47d00" : "var(--color-border-primary)"} strokeWidth={isSel ? 2 : 1} />
              <text x={pos.x} y={pos.y + 4.5} textAnchor="middle" fontSize={isSel ? 11 : 9} fontWeight="500"
                fill={isSel || avg > 0 ? "white" : "var(--color-text-secondary)"}>
                {avg > 0 ? avg.toFixed(1) : "?"}
              </text>
            </g>
          );
        })}
        {tooltip && (() => {
          const pos = latLngToSVG(tooltip.lat, tooltip.lng);
          const tx = pos.x > 300 ? pos.x - 130 : pos.x + 14;
          const ty = pos.y > 300 ? pos.y - 55 : pos.y - 12;
          return (
            <g>
              <rect x={tx} y={ty} width={130} height={44} rx="4"
                fill="var(--color-background-primary)" stroke="var(--color-border-secondary)" strokeWidth="0.5" />
              <text x={tx+8} y={ty+16} fontSize="10" fontWeight="500" fill="var(--color-text-primary)">
                {tooltip.emoji} {tooltip.name.length > 15 ? tooltip.name.slice(0,15)+"…" : tooltip.name}
              </text>
              <text x={tx+8} y={ty+30} fontSize="9" fill="var(--color-text-secondary)">
                {tooltip.vendor.length > 20 ? tooltip.vendor.slice(0,20)+"…" : tooltip.vendor}
              </text>
            </g>
          );
        })()}
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: 11, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
        <span><span style={{ color: "#1D9E75" }}>●</span> Note &gt; 3</span>
        <span><span style={{ color: "#378ADD" }}>●</span> Note ≤ 3</span>
        <span><span style={{ color: "var(--color-text-tertiary)" }}>●</span> Pas noté</span>
        <span><span style={{ color: "#F5A623" }}>●</span> Sélectionné</span>
      </div>
    </div>
  );
}

function PlayerBadge({ player, isActive, onClick }) {
  const initials = player.name.slice(0, 2).toUpperCase();
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
      background: isActive ? "var(--color-background-info)" : "var(--color-background-secondary)",
      border: isActive ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)", cursor: "pointer" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%",
        background: isActive ? "#185FA5" : "var(--color-border-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 500, color: isActive ? "white" : "var(--color-text-secondary)", flexShrink: 0 }}>
        {initials}
      </div>
      <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400,
        color: isActive ? "var(--color-text-info)" : "var(--color-text-primary)" }}>
        {player.name}
      </span>
    </button>
  );
}

/* ───────────────── APP PRINCIPALE ───────────────── */
export default function App() {
  const [tab, setTab]             = useState("samossa");
  const [samossas, setSamossas]   = useState(DEFAULT_SAMOSSAS);
  const [pokkas, setPokkas]       = useState(DEFAULT_POKKAS);
  const [players, setPlayers]     = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [showMap, setShowMap]     = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newItemName, setNewItemName]   = useState("");
  const [newItemVendor, setNewItemVendor] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [nextId, setNextId]       = useState(100);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);

  /* ── Chargement initial depuis Firebase ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [fbSamossas, fbPokkas, fbPlayers] = await Promise.all([
        fbGet("samossas"), fbGet("pokkas"), fbGet("players"),
      ]);
      if (fbSamossas) setSamossas(Object.values(fbSamossas));
      else await fbSet("samossas", Object.fromEntries(DEFAULT_SAMOSSAS.map(s => [s.id, s])));

      if (fbPokkas) setPokkas(Object.values(fbPokkas));
      else await fbSet("pokkas", Object.fromEntries(DEFAULT_POKKAS.map(p => [p.id, p])));

      if (fbPlayers) {
        const list = Object.values(fbPlayers);
        setPlayers(list);
        // Restaurer le joueur courant depuis localStorage
        const saved = localStorage.getItem("currentPlayerId");
        const found = list.find(p => p.id === saved);
        setCurrentPlayer(found ? saved : list[0]?.id ?? null);
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ── Écoute temps réel ── */
  useEffect(() => {
    const unsub1 = fbListen("samossas", (data) => {
      if (data) setSamossas(Object.values(data));
    });
    const unsub2 = fbListen("pokkas", (data) => {
      if (data) setPokkas(Object.values(data));
    });
    const unsub3 = fbListen("players", (data) => {
      if (data) setPlayers(Object.values(data));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  /* ── Vote ── */
  const handleRate = useCallback(async (itemId, stars) => {
    if (!currentPlayer) return;
    const path = tab === "samossa" ? "samossas" : "pokkas";
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
      lat: -21.09 + (Math.random() - 0.5) * 0.5,
      lng: 55.53 + (Math.random() - 0.5) * 0.5,
      ratings: {}, emoji: tab === "samossa" ? "🥟" : "🥙",
    };
    const path = tab === "samossa" ? "samossas" : "pokkas";
    setSyncing(true);
    await fbSet(`${path}/${id}`, newItem);
    setSyncing(false);
    setNewItemName(""); setNewItemVendor(""); setShowAddItem(false);
  };

  /* ── Ajouter joueur ── */
  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    const id = "p" + Date.now();
    const player = { id, name: newPlayerName.trim() };
    setSyncing(true);
    await fbSet(`players/${id}`, player);
    setSyncing(false);
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
    setNewPlayerName(""); setShowAddPlayer(false);
  };

  const switchPlayer = (id) => {
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
  };

  const items = tab === "samossa" ? samossas : pokkas;
  const sortedItems = sortedByRating(items);
  const playerScores = players.map(p => {
    const vals = items.flatMap(it => (it.ratings||{})[p.id] ? [(it.ratings||{})[p.id]] : []);
    return { ...p, avg: vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "—", count: vals.length };
  });

  /* ── Rendu ── */
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100vh", gap: 16, color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
      <div style={{ fontSize: 40 }}>🥟</div>
      <div style={{ fontSize: 14 }}>Chargement depuis Firebase…</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem 3rem", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>🌴</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>
          Classement Réunion
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>
          SAMOSSAS & POKKAS
        </p>
        {syncing && <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>⏳ Sauvegarde…</p>}
      </div>

      {/* Joueurs */}
      <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)", padding: "12px 16px", marginBottom: "1rem" }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500 }}>
          👥 Joueurs — clique sur ton prénom pour voter :
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {players.map(p => (
            <PlayerBadge key={p.id} player={p} isActive={p.id === currentPlayer} onClick={() => switchPlayer(p.id)} />
          ))}
          {showAddPlayer ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                placeholder="Ton prénom" autoFocus
                onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
                style={{ width: 140, fontSize: 13 }} />
              <button onClick={handleAddPlayer} style={{ fontSize: 13, padding: "6px 10px" }}>OK</button>
              <button onClick={() => setShowAddPlayer(false)} style={{ fontSize: 13, padding: "6px 10px" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowAddPlayer(true)} style={{ display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", fontSize: 13, background: "none",
              border: "0.5px dashed var(--color-border-secondary)",
              borderRadius: "var(--border-radius-lg)", cursor: "pointer", color: "var(--color-text-secondary)" }}>
              + Joueur
            </button>
          )}
        </div>

        {players.length > 1 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)",
            display: "flex", flexWrap: "wrap", gap: 8 }}>
            {playerScores.sort((a,b) => parseFloat(b.avg)||0 - parseFloat(a.avg)||0).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8,
                background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)", padding: "6px 12px" }}>
                <span style={{ fontSize: 13 }}>{i===0?"🏆":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  moy. {p.avg} · {p.count}/{items.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        {["samossa","pokka"].map(t => (
          <button key={t} onClick={() => { setTab(t); setShowMap(false); }} style={{
            flex: 1, padding: "12px",
            background: tab===t ? "var(--color-background-info)" : "var(--color-background-secondary)",
            border: tab===t ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", cursor: "pointer",
            color: tab===t ? "var(--color-text-info)" : "var(--color-text-secondary)",
            fontWeight: tab===t ? 500 : 400, fontSize: 14 }}>
            {t==="samossa" ? "🥟 Samossas" : "🥙 Pokkas"}
          </button>
        ))}
      </div>

      {/* Bouton carte (samossas seulement) */}
      {tab === "samossa" && (
        <button onClick={() => setShowMap(m => !m)} style={{ width: "100%", padding: "10px",
          background: showMap ? "var(--color-background-success)" : "var(--color-background-secondary)",
          border: showMap ? "0.5px solid var(--color-border-success)" : "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)", cursor: "pointer",
          color: showMap ? "var(--color-text-success)" : "var(--color-text-secondary)",
          fontSize: 13, fontWeight: 500, marginBottom: "1rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          🗺️ {showMap ? "Masquer la carte" : "Voir la carte des vendeurs"}
        </button>
      )}

      {/* Carte */}
      {showMap && tab === "samossa" && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)", padding: "16px", marginBottom: "1rem" }}>
          <ReunionMap items={samossas} onSelectVendor={id => setSelectedPin(selectedPin===id?null:id)} selectedId={selectedPin} />
          {selectedPin && (() => {
            const item = samossas.find(s => s.id === selectedPin);
            return item ? (
              <div style={{ marginTop: 12, padding: "12px 16px", background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{item.emoji} {item.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📍 {item.vendor}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Voter :</span>
                  <StarRow value={(item.ratings||{})[currentPlayer]||0} onRate={s => handleRate(item.id, s)} />
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Liste classement */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sortedItems.map((item, idx) => (
          <RankCard key={item.id} item={item} rank={idx}
            players={players} currentPlayer={currentPlayer} onRate={handleRate} />
        ))}
      </div>

      {/* Ajouter item */}
      <div style={{ marginTop: "1rem" }}>
        {showAddItem ? (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
              Ajouter {tab==="samossa" ? "un samossa 🥟" : "un pokka 🥙"}
            </div>
            {[
              { label:"Nom", val:newItemName, set:setNewItemName, ph:tab==="samossa"?"Ex: Samossa bœuf":"Ex: Pokka crevettes" },
              { label:"Vendeur / Snack", val:newItemVendor, set:setNewItemVendor, ph:"Ex: Marché de Saint-Paul" },
            ].map(({ label, val, set, ph }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <label style={{ display:"block", fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width:"100%", fontSize:14 }} />
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={() => setShowAddItem(false)} style={{ flex:1, fontSize:13 }}>Annuler</button>
              <button onClick={handleAddItem} style={{ flex:2, fontSize:13, fontWeight:500,
                background:"var(--color-background-info)", color:"var(--color-text-info)",
                border:"0.5px solid var(--color-border-info)" }}>Ajouter</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddItem(true)} style={{ width:"100%", padding:"12px",
            background:"none", border:"0.5px dashed var(--color-border-secondary)",
            borderRadius:"var(--border-radius-lg)", cursor:"pointer",
            color:"var(--color-text-secondary)", fontSize:13,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            + Ajouter {tab==="samossa" ? "un samossa" : "un pokka"}
          </button>
        )}
      </div>

      <p style={{ textAlign:"center", fontSize:11, color:"var(--color-text-tertiary)", marginTop:"2rem" }}>
        🔥 Données sauvegardées en temps réel sur Firebase · chaque joueur vote une fois par item
      </p>
    </div>
  );
}

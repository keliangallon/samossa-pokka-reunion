import { useEffect, useMemo, useState } from "react";
import { fbGet, fbListen, fbSet } from "./firebase";

// ─── CRITÈRES (définis en premier, avant toute fonction qui les utilise) ────
const CRITERIA = {
  samossa: [
    ["taste",      "Goût",           "Appréciation générale de la saveur du samossa.",      false],
    ["crispiness", "Croustillant",   "La pâte est-elle bien dorée et croustillante ?",      false],
    ["filling",    "Farce",          "Qualité et générosité de la garniture.",               false],
    ["value",      "Qualité / prix", "Le rapport entre le prix payé et le plaisir obtenu.", false],
  ],
  pokka: [
    ["taste",        "Goût global",          "Appréciation générale de la saveur.",                                                       false],
    ["balance",      "Équilibre",            "Harmonie entre le thé et le fruit.",                                                        false],
    ["aroma",        "Intensité aromatique", "Force et présence du parfum.",                                                              false],
    ["authenticity", "Authenticité",         "Le fruit rappelle-t-il son goût naturel ?",                                                 false],
    ["drinkability", "Risque d'écœurement",  "Curseur haut = très écœurant = mauvaise note. Score affiché = 20 − valeur du curseur.",    true],
  ],
};

// ─── DONNÉES PAR DÉFAUT ─────────────────────────────────────────────────────
const DEFAULT_SAMOSSAS = [
  { id: 1, name: "Samossa bœuf épicé",        vendor: "Marché de Saint-Paul",       ratings: {}, emoji: "🥟" },
  { id: 2, name: "Samossa poulet citron",      vendor: "Snack Ti'Bo – Saint-Denis",  ratings: {}, emoji: "🥟" },
  { id: 3, name: "Samossa légumes cari",       vendor: "Boulangerie du Port",         ratings: {}, emoji: "🥟" },
  { id: 4, name: "Samossa thon fromage",       vendor: "Chez Mamie Louise – Tampon", ratings: {}, emoji: "🥟" },
  { id: 5, name: "Samossa crevettes rougail",  vendor: "Snack Doudou – Saint-Leu",   ratings: {}, emoji: "🥟" },
];

const DEFAULT_POKKAS = [
  { id: 1, name: "Pokka bœuf carottes",     vendor: "Snack du Port",                ratings: {}, emoji: "🥤" },
  { id: 2, name: "Pokka poulet sauce",       vendor: "Resto Ti'Coin – Saint-Pierre", ratings: {}, emoji: "🥤" },
  { id: 3, name: "Pokka végétarien",         vendor: "Marché Forain – Cilaos",       ratings: {}, emoji: "🥤" },
  { id: 4, name: "Pokka crevettes rougail",  vendor: "Chez Doudou – Sainte-Rose",    ratings: {}, emoji: "🥤" },
];

// ─── SCORE ──────────────────────────────────────────────────────────────────
// Calcule la note /20 d'un objet {key: valeurSlider}
// Critère inversé → score = 20 − valeurSlider
function ratingScore(rating, type) {
  if (!rating || typeof rating !== "object") return 0;
  const criteria = CRITERIA[type];
  if (!criteria) return 0;
  const vals = criteria
    .map(([key, , , inverted]) => {
      const v = rating[key];
      if (typeof v !== "number") return null;
      return inverted ? 20 - v : v;
    })
    .filter(v => v !== null);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Un rating est considéré "rempli" si au moins un critère a été modifié (≠ 0)
function hasRating(rating) {
  if (!rating || typeof rating !== "object") return false;
  return Object.values(rating).some(v => typeof v === "number" && v !== 0);
}

function avgRating(item, type) {
  const scores = Object.values(item.ratings || {})
    .filter(r => hasRating(r))
    .map(r => ratingScore(r, type));
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

function displayedRating(item, rankingPlayers, type) {
  const allRatings = item.ratings || {};
  const ids = rankingPlayers === "all"
    ? Object.keys(allRatings)
    : Array.isArray(rankingPlayers) ? rankingPlayers : [rankingPlayers];
  const scores = ids
    .filter(id => hasRating(allRatings[id]))
    .map(id => ratingScore(allRatings[id], type));
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

function toArray(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : Object.values(value);
  return values.filter(item => item && typeof item === "object");
}

// ─── COMPOSANTS ─────────────────────────────────────────────────────────────
function FloatingFood() {
  const floaters = [
    ["🥟", "float-left-right",    "8%",  "0s"],
    ["🥤", "float-right-left",    "20%", "-4s"],
    ["🥟", "float-bottom-top",    "14%", "-7s"],
    ["🥤", "float-top-bottom",    "82%", "-2s"],
    ["🥟", "float-diagonal-down", "42%", "-9s"],
    ["🥤", "float-diagonal-up",   "68%", "-5s"],
  ];
  return (
    <div className="floating-food" aria-hidden="true">
      {floaters.map(([emoji, animation, position, delay], index) => (
        <span key={index} className={animation} style={{ "--position": position, "--delay": delay }}>{emoji}</span>
      ))}
      <span className="float-boss">Kélian le boss ultime</span>
    </div>
  );
}

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 5 }}>
      <button
        onClick={e => { e.stopPropagation(); setVisible(v => !v); }}
        style={{
          width: 16, height: 16, borderRadius: "50%", padding: 0, border: "1px solid #93c5fd",
          background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700,
          cursor: "pointer", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >i</button>
      {visible && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "white", fontSize: 11, padding: "6px 10px",
          borderRadius: 8, zIndex: 10, maxWidth: 220, whiteSpace: "normal",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", lineHeight: 1.4,
        }}>
          {text}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            borderWidth: 5, borderStyle: "solid", borderColor: "#1e293b transparent transparent transparent",
          }} />
        </span>
      )}
    </span>
  );
}

function ScoreInput({ label, description, sliderValue, onChange, inverted }) {
  // Ce que l'utilisateur voit comme "score" est l'inverse si inverted
  const displayedScore = inverted ? 20 - sliderValue : sliderValue;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center" }}>
        {label}
        {description && <InfoTooltip text={description} />}
      </span>
      <input
        type="range"
        min="0"
        max="20"
        value={sliderValue}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: inverted ? "#ef4444" : "#1d4ed8" }}
      />
      <strong style={{ textAlign: "right", fontSize: 13, color: inverted ? "#ef4444" : "#1d4ed8" }}>
        {displayedScore}/20{inverted ? " 🔻" : ""}
      </strong>
    </div>
  );
}

function buildDraft(criteria, savedRating) {
  return Object.fromEntries(
    criteria.map(([key]) => [
      key,
      typeof savedRating === "object" && savedRating !== null && typeof savedRating[key] === "number"
        ? savedRating[key]
        : 0,  // défaut à 0
    ])
  );
}

function RankCard({ item, rank, type, players, currentPlayer, rankingPlayers, onSave, onDelete }) {
  const criteria = CRITERIA[type];
  const savedRating = item.ratings?.[currentPlayer] ?? null;

  const [draft, setDraft] = useState(() => buildDraft(criteria, savedRating));
  const [savedMsg, setSavedMsg] = useState(false);
  const [open, setOpen] = useState(false);

  // Resync quand le joueur change ou quand Firebase met à jour
  useEffect(() => {
    setDraft(buildDraft(criteria, item.ratings?.[currentPlayer] ?? null));
    setSavedMsg(false);
  }, [currentPlayer, item.id, JSON.stringify(item.ratings?.[currentPlayer])]);

  const total = ratingScore(draft, type);
  const average = displayedRating(item, rankingPlayers, type);

  const allIds = rankingPlayers === "all"
    ? players.map(p => p.id)
    : Array.isArray(rankingPlayers) ? rankingPlayers : [rankingPlayers];
  const visiblePlayers = players.filter(p => allIds.includes(p.id));

  const voteCount = rankingPlayers === "all"
    ? Object.values(item.ratings || {}).filter(r => hasRating(r)).length
    : allIds.filter(id => hasRating(item.ratings?.[id])).length;

  const medals = ["🥇", "🥈", "🥉"];

  async function save() {
    await onSave(item.id, draft);
    setSavedMsg(true);
  }

  return (
    <article style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
      {/* Header cliquable */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 10, padding: 16,
          cursor: "pointer", userSelect: "none",
          background: open ? "#f8faff" : "#fff",
        }}
      >
        <span style={{ minWidth: 28, fontWeight: 700 }}>
          {voteCount > 0 && rank < 3 ? medals[rank] : `#${rank + 1}`}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{item.emoji} {item.name}</div>
          {type === "samossa" && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>📍 {item.vendor}</div>
          )}
        </div>
        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <strong style={{ fontSize: 22, color: voteCount > 0 ? "#f59e0b" : "#d1d5db" }}>
              {voteCount > 0 ? average.toFixed(1) : "—"}/20
            </strong>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{voteCount} avis</div>
          </div>
          <span style={{
            fontSize: 14, color: "#9ca3af", display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s",
          }}>▾</span>
        </div>
      </div>

      {/* Panneau de notation */}
      {open && (
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "14px 16px", display: "grid", gap: 12 }}>
          {currentPlayer ? (
            <>
              {criteria.map(([key, label, description, inverted]) => (
                <ScoreInput
                  key={key}
                  label={label}
                  description={description}
                  inverted={inverted}
                  sliderValue={draft[key]}
                  onChange={v => { setDraft(prev => ({ ...prev, [key]: v })); setSavedMsg(false); }}
                />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                <strong style={{ marginRight: "auto", fontSize: 14 }}>
                  Note globale : {total.toFixed(1)}/20
                </strong>
                {savedMsg && <span style={{ fontSize: 12, color: "#16a34a" }}>✓ Sauvegardé</span>}
                <button
                  onClick={save}
                  style={{ background: "#1d4ed8", color: "white", borderColor: "#1d4ed8", fontWeight: 700 }}
                >
                  Sauvegarder
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Ajoute un joueur pour noter.</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visiblePlayers.map(player => {
              const r = item.ratings?.[player.id];
              if (!hasRating(r)) return null;
              return (
                <span key={player.id} style={{ fontSize: 11, background: "#f3f4f6", borderRadius: 6, padding: "3px 8px" }}>
                  {player.name} : {ratingScore(r, type).toFixed(1)}/20
                </span>
              );
            })}
            <button
              onClick={() => onDelete(item)}
              style={{ marginLeft: "auto", padding: "4px 9px", fontSize: 11, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                   = useState("samossa");
  const [samossas, setSamossas]         = useState(DEFAULT_SAMOSSAS);
  const [pokkas, setPokkas]             = useState(DEFAULT_POKKAS);
  const [players, setPlayers]           = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [rankingPlayers, setRankingPlayers] = useState("all");
  const [newPlayerName, setNewPlayerName]   = useState("");
  const [newItemName, setNewItemName]       = useState("");
  const [newItemVendor, setNewItemVendor]   = useState("");
  const [showAddItem, setShowAddItem]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);

  useEffect(() => {
    async function load() {
      const [storedSamossas, storedPokkas, storedPlayers] = await Promise.all([
        fbGet("samossas"), fbGet("pokkas"), fbGet("players"),
      ]);
      if (storedSamossas) setSamossas(toArray(storedSamossas));
      else await fbSet("samossas", Object.fromEntries(DEFAULT_SAMOSSAS.map(i => [i.id, i])));
      if (storedPokkas) setPokkas(toArray(storedPokkas).map(i => ({ ...i, emoji: "🥤" })));
      else await fbSet("pokkas", Object.fromEntries(DEFAULT_POKKAS.map(i => [i.id, i])));
      const playerList = toArray(storedPlayers);
      setPlayers(playerList);
      const savedId = localStorage.getItem("currentPlayerId");
      setCurrentPlayer(playerList.some(p => p.id === savedId) ? savedId : playerList[0]?.id || null);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const s1 = fbListen("samossas", d => setSamossas(toArray(d)));
    const s2 = fbListen("pokkas",   d => setPokkas(toArray(d).map(i => ({ ...i, emoji: "🥤" }))));
    const s3 = fbListen("players",  d => setPlayers(toArray(d)));
    return () => { s1(); s2(); s3(); };
  }, []);

  const items = tab === "samossa" ? samossas : pokkas;
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => displayedRating(b, rankingPlayers, tab) - displayedRating(a, rankingPlayers, tab)),
    [items, rankingPlayers, tab],
  );

  async function saveRating(itemId, rating) {
    if (!currentPlayer) return;
    const path = tab === "samossa" ? "samossas" : "pokkas";
    const setter = tab === "samossa" ? setSamossas : setPokkas;
    setter(prev => prev.map(i => i.id === itemId
      ? { ...i, ratings: { ...(i.ratings || {}), [currentPlayer]: rating } }
      : i));
    setSyncing(true);
    await fbSet(`${path}/${itemId}/ratings/${currentPlayer}`, rating);
    setSyncing(false);
  }

  async function deleteItem(item) {
    if (!window.confirm(`Supprimer "${item.name}" ?`)) return;
    const path = tab === "samossa" ? "samossas" : "pokkas";
    const setter = tab === "samossa" ? setSamossas : setPokkas;
    setter(prev => prev.filter(i => i.id !== item.id));
    await fbSet(`${path}/${item.id}`, null);
  }

  async function addItem() {
    if (!newItemName.trim()) return;
    const id = Date.now();
    const item = {
      id, name: newItemName.trim(),
      vendor: newItemVendor.trim() || "Vendeur inconnu",
      ratings: {}, emoji: tab === "samossa" ? "🥟" : "🥤",
    };
    const path = tab === "samossa" ? "samossas" : "pokkas";
    const setter = tab === "samossa" ? setSamossas : setPokkas;
    setter(prev => [...prev, item]);
    await fbSet(`${path}/${id}`, item);
    setNewItemName(""); setNewItemVendor(""); setShowAddItem(false);
  }

  async function addPlayer() {
    if (!newPlayerName.trim()) return;
    const id = `p${Date.now()}`;
    const player = { id, name: newPlayerName.trim() };
    setPlayers(prev => [...prev, player]);
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
    await fbSet(`players/${id}`, player);
    setNewPlayerName("");
  }

  function switchPlayer(id) {
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
  }

  async function resetPokkaRatings() {
    if (!window.confirm("Effacer toutes les notes Pokka ? Irréversible.")) return;
    const reset = pokkas.map(p => ({ ...p, ratings: {} }));
    setPokkas(reset);
    await Promise.all(reset.map(p => fbSet(`pokkas/${p.id}/ratings`, {})));
  }

  if (loading) return <div style={{ textAlign: "center", padding: 80, fontFamily: "system-ui" }}>🥟 Chargement…</div>;

  const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 };

  return (
    <>
      <FloatingFood />
      <main style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "system-ui", minHeight: "100vh" }}>

        <header style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 42 }}>🌴</div>
          <h1 style={{ fontSize: 24, margin: "6px 0" }}>Sampok</h1>
          <p style={{ color: "#6b7280", fontSize: 13 }}>Samossas & Pokkas · notation sur 20</p>
          {syncing && <p style={{ color: "#6b7280", fontSize: 11 }}>Sauvegarde…</p>}
        </header>

        {/* Qui note */}
        <section style={{ ...card, marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>Qui note ?</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {players.map(p => (
              <button key={p.id} onClick={() => switchPlayer(p.id)} style={{
                background: p.id === currentPlayer ? "#dbeafe" : "#f3f4f6",
                color: p.id === currentPlayer ? "#1d4ed8" : "#374151",
                borderColor: p.id === currentPlayer ? "#93c5fd" : "#e5e7eb",
                fontWeight: p.id === currentPlayer ? 700 : 400,
              }}>{p.name}</button>
            ))}
            <input
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPlayer()}
              placeholder="Nouveau joueur"
              style={{ width: 150 }}
            />
            <button onClick={addPlayer}>+ Ajouter</button>
          </div>
        </section>

        {/* Onglets */}
        <nav style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setTab("samossa")} style={{ flex: 1, padding: 12, background: tab === "samossa" ? "#dbeafe" : "#fff" }}>
            🥟 Samossas
          </button>
          <button onClick={() => setTab("pokka")} style={{ flex: 1, padding: 12, background: tab === "pokka" ? "#dbeafe" : "#fff" }}>
            🥤 Pokkas
          </button>
        </nav>

        {/* Sélection équipe */}
        <section style={{ ...card, marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>Équipe — classement affiché pour :</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => setRankingPlayers("all")}
              style={{
                background: rankingPlayers === "all" ? "#dcfce7" : "#f3f4f6",
                color: rankingPlayers === "all" ? "#16a34a" : "#374151",
                borderColor: rankingPlayers === "all" ? "#86efac" : "#e5e7eb",
                fontWeight: rankingPlayers === "all" ? 700 : 400,
              }}
            >👥 Tous</button>
            {players.map(p => {
              const sel = Array.isArray(rankingPlayers) && rankingPlayers.includes(p.id);
              return (
                <button key={p.id} style={{
                  background: sel ? "#dbeafe" : "#f3f4f6",
                  color: sel ? "#1d4ed8" : "#374151",
                  borderColor: sel ? "#93c5fd" : "#e5e7eb",
                  fontWeight: sel ? 700 : 400,
                }} onClick={() => setRankingPlayers(prev => {
                  const cur = Array.isArray(prev) ? prev : [];
                  if (cur.includes(p.id)) {
                    const next = cur.filter(id => id !== p.id);
                    return next.length === 0 ? "all" : next;
                  }
                  return [...cur, p.id];
                })}>👤 {p.name}</button>
              );
            })}
          </div>
          <p style={{ color: "#6b7280", fontSize: 11, marginTop: 8 }}>
            {rankingPlayers === "all" ? "Moyenne de tous les joueurs."
              : Array.isArray(rankingPlayers) && rankingPlayers.length === 1
                ? `Notes de ${players.find(p => p.id === rankingPlayers[0])?.name}.`
                : `Moyenne des ${rankingPlayers.length} joueurs sélectionnés.`}
          </p>
        </section>

        {/* Liste */}
        <section style={{ display: "grid", gap: 12 }}>
          {sortedItems.map((item, index) => (
            <RankCard
              key={`${item.id}-${currentPlayer}`}
              item={item} rank={index} type={tab}
              players={players} currentPlayer={currentPlayer}
              rankingPlayers={rankingPlayers}
              onSave={saveRating} onDelete={deleteItem}
            />
          ))}
        </section>

        {/* Ajouter */}
        <section style={{ ...card, marginTop: 14 }}>
          {showAddItem ? (
            <div style={{ display: "grid", gap: 10 }}>
              <strong>Ajouter {tab === "samossa" ? "un samossa 🥟" : "un pokka 🥤"}</strong>
              <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nom" />
              <input value={newItemVendor} onChange={e => setNewItemVendor(e.target.value)} placeholder="Vendeur / snack" />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowAddItem(false)} style={{ flex: 1 }}>Annuler</button>
                <button onClick={addItem} style={{ flex: 2, background: "#1d4ed8", color: "white" }}>Ajouter</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddItem(true)} style={{ width: "100%", borderStyle: "dashed" }}>
              + Ajouter {tab === "samossa" ? "un samossa" : "un pokka"}
            </button>
          )}
        </section>

        {/* Reset pokka */}
        {tab === "pokka" && (
          <section style={{ marginTop: 14, padding: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: "#991b1b", margin: "0 0 10px" }}>
              ⚠️ Si les anciennes notes semblent inversées, clique ici pour tout remettre à zéro.
            </p>
            <button onClick={resetPokkaRatings} style={{ background: "#b91c1c", color: "white", borderColor: "#b91c1c", fontWeight: 700, fontSize: 13 }}>
              🗑️ Remettre à zéro les notes Pokka
            </button>
          </section>
        )}

      </main>
    </>
  );
}

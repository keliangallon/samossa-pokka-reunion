import { useEffect, useMemo, useState } from "react";
import { fbGet, fbListen, fbSet } from "./firebase";

const DEFAULT_SAMOSSAS = [
  { id: 1, name: "Samossa bœuf épicé", vendor: "Marché de Saint-Paul", ratings: {}, emoji: "🥟" },
  { id: 2, name: "Samossa poulet citron", vendor: "Snack Ti'Bo – Saint-Denis", ratings: {}, emoji: "🥟" },
  { id: 3, name: "Samossa légumes cari", vendor: "Boulangerie du Port", ratings: {}, emoji: "🥟" },
  { id: 4, name: "Samossa thon fromage", vendor: "Chez Mamie Louise – Tampon", ratings: {}, emoji: "🥟" },
  { id: 5, name: "Samossa crevettes rougail", vendor: "Snack Doudou – Saint-Leu", ratings: {}, emoji: "🥟" },
];

const DEFAULT_POKKAS = [
  { id: 1, name: "Pokka bœuf carottes", vendor: "Snack du Port", ratings: {}, emoji: "🥤" },
  { id: 2, name: "Pokka poulet sauce", vendor: "Resto Ti'Coin – Saint-Pierre", ratings: {}, emoji: "🥤" },
  { id: 3, name: "Pokka végétarien", vendor: "Marché Forain – Cilaos", ratings: {}, emoji: "🥤" },
  { id: 4, name: "Pokka crevettes rougail", vendor: "Chez Doudou – Sainte-Rose", ratings: {}, emoji: "🥤" },
];

const CRITERIA = {
  samossa: [
    ["taste",      "Goût",           "Appréciation générale de la saveur du samossa.",              false],
    ["crispiness", "Croustillant",   "La pâte est-elle bien dorée et croustillante ?",              false],
    ["filling",    "Farce",          "Qualité et générosité de la garniture.",                      false],
    ["value",      "Qualité / prix", "Le rapport entre le prix payé et le plaisir obtenu.",         false],
  ],
  pokka: [
    ["taste",         "Goût global",            "Appréciation générale de la saveur.",                                                        false],
    ["balance",       "Équilibre",              "Harmonie entre le thé et le fruit.",                                                         false],
    ["aroma",         "Intensité aromatique",   "Force et présence du parfum.",                                                               false],
    ["authenticity",  "Authenticité",           "Le fruit rappelle-t-il son goût naturel ?",                                                  false],
    ["drinkability",  "Risque d'écœurement",    "Plus le curseur monte, plus la boisson est écœurante — la note finale est inversée (20 − valeur).", true],
  ],
};

function toArray(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : Object.values(value);
  return values.filter(item => item && typeof item === "object");
}

function ratingScore(rating, type) {
  if (!rating || typeof rating !== "object") return 0;
  const criteria = CRITERIA[type || "samossa"];
  const scores = criteria.map(([key, , , inverted]) => {
    const v = rating[key];
    if (typeof v !== "number") return null;
    // Si critère inversé : 0 slider → 20 pts, 20 slider → 0 pts
    return inverted ? (20 - v) : v;
  }).filter(v => v !== null);
  return scores.length ? scores.reduce((sum, v) => sum + v, 0) / scores.length : 0;
}

function avgRating(item, type) {
  const scores = Object.values(item.ratings || {})
    .map(r => ratingScore(r, type))
    .filter(v => typeof v === "number" && !isNaN(v) && v > 0);
  return scores.length ? scores.reduce((sum, v) => sum + v, 0) / scores.length : 0;
}

function displayedRating(item, rankingPlayers, type) {
  if (rankingPlayers === "all") return avgRating(item, type);
  const ids = Array.isArray(rankingPlayers) ? rankingPlayers : [rankingPlayers];
  const scores = ids
    .map(id => ratingScore(item.ratings?.[id], type))
    .filter(v => typeof v === "number" && !isNaN(v) && v > 0);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

function FloatingFood() {
  const floaters = [
    ["🥟", "float-left-right", "8%", "0s"],
    ["🥤", "float-right-left", "20%", "-4s"],
    ["🥟", "float-bottom-top", "14%", "-7s"],
    ["🥤", "float-top-bottom", "82%", "-2s"],
    ["🥟", "float-diagonal-down", "42%", "-9s"],
    ["🥤", "float-diagonal-up", "68%", "-5s"],
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
        onClick={() => setVisible(v => !v)}
        style={{
          width: 16, height: 16, borderRadius: "50%", padding: 0, border: "1px solid #93c5fd",
          background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700,
          cursor: "pointer", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
        aria-label="Plus d'infos"
      >i</button>
      {visible && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "white", fontSize: 11, padding: "6px 10px",
          borderRadius: 8, whiteSpace: "nowrap", zIndex: 10, maxWidth: 220, whiteSpace: "normal",
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

function ScoreInput({ label, description, value, onChange, inverted }) {
  const displayed = inverted ? 20 - value : value;
  return (
    <label style={{ display: "grid", gridTemplateColumns: "1fr 1fr 54px", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center" }}>
        {label}
        {description && <InfoTooltip text={description} />}
      </span>
      <input
        type="range"
        min="0"
        max="20"
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        style={{ width: "100%", accentColor: inverted ? "#ef4444" : "#1d4ed8" }}
      />
      <strong style={{ textAlign: "right", color: inverted ? "#ef4444" : "#1d4ed8" }}>
        {displayed}/20{inverted ? " 🔻" : ""}
      </strong>
    </label>
  );
}

function RankCard({ item, rank, type, players, currentPlayer, rankingPlayers, onSave, onDelete }) {
  const criteria = CRITERIA[type];

  function buildDraft(ratings, player) {
    const saved = ratings?.[player];
    return Object.fromEntries(
      criteria.map(([key]) => [key, typeof saved === "object" && typeof saved[key] === "number" ? saved[key] : 10])
    );
  }

  const [draft, setDraft] = useState(() => buildDraft(item.ratings, currentPlayer));
  const [savedMessage, setSavedMessage] = useState(false);
  const [open, setOpen] = useState(false);

  // Resync draft quand Firebase met à jour les données ou qu'on change de joueur
  useEffect(() => {
    setDraft(buildDraft(item.ratings, currentPlayer));
    setSavedMessage(false);
  }, [currentPlayer, item.id, JSON.stringify(item.ratings?.[currentPlayer])]);

  const total = ratingScore(draft, type);
  const average = displayedRating(item, rankingPlayers, type);
  const allIds = Array.isArray(rankingPlayers) ? rankingPlayers : (rankingPlayers === "all" ? players.map(p => p.id) : [rankingPlayers]);
  const visiblePlayers = players.filter(p => allIds.includes(p.id));
  const voteCount = rankingPlayers === "all"
    ? Object.keys(item.ratings || {}).length
    : allIds.filter(id => item.ratings?.[id]).length;
  const medals = ["🥇", "🥈", "🥉"];

  async function save() {
    await onSave(item.id, draft);
    setSavedMessage(true);
  }

  return (
    <article style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
      {/* Header cliquable */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 16, cursor: "pointer",
          userSelect: "none", transition: "background .15s",
          background: open ? "#f8faff" : "#fff" }}
      >
        <span style={{ minWidth: 28, fontWeight: 700 }}>{voteCount && rank < 3 ? medals[rank] : `#${rank + 1}`}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{item.emoji || (type === "samossa" ? "🥟" : "🥤")} {item.name}</div>
          {type === "samossa" && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>📍 {item.vendor}</div>}
        </div>
        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <strong style={{ fontSize: 22, color: voteCount ? "#f59e0b" : "#d1d5db" }}>
              {voteCount ? average.toFixed(1) : "—"}/20
            </strong>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{voteCount} avis</div>
          </div>
          <span style={{ fontSize: 14, color: "#9ca3af", transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
        </div>
      </div>

      {/* Section notation — masquée par défaut */}
      {open && (
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "14px 16px", display: "grid", gap: 10 }}>
          {currentPlayer ? (
            <>
              {criteria.map(([key, label, description, inverted]) => (
                <ScoreInput
                  key={key}
                  label={label}
                  description={description}
                  inverted={inverted}
                  value={draft[key]}
                  onChange={value => {
                    setDraft(previous => ({ ...previous, [key]: value }));
                    setSavedMessage(false);
                  }}
                />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <strong style={{ marginRight: "auto" }}>Ta note globale : {total.toFixed(1)}/20</strong>
                {savedMessage && <span style={{ fontSize: 12, color: "#16a34a" }}>✓ Sauvegardé</span>}
                <button onClick={save} style={{ background: "#1d4ed8", color: "white", borderColor: "#1d4ed8", fontWeight: 700 }}>
                  Sauvegarder
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Ajoute un joueur pour noter.</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {visiblePlayers.map(player => {
              const score = ratingScore(item.ratings?.[player.id], type);
              return score ? (
                <span key={player.id} style={{ fontSize: 11, background: "#f3f4f6", borderRadius: 6, padding: "3px 8px" }}>
                  {player.name} : {score.toFixed(1)}/20
                </span>
              ) : null;
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

export default function App() {
  const [tab, setTab] = useState("samossa");
  const [samossas, setSamossas] = useState(DEFAULT_SAMOSSAS);
  const [pokkas, setPokkas] = useState(DEFAULT_POKKAS);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [rankingPlayers, setRankingPlayers] = useState("all");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemVendor, setNewItemVendor] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      const [storedSamossas, storedPokkas, storedPlayers] = await Promise.all([
        fbGet("samossas"), fbGet("pokkas"), fbGet("players"),
      ]);
      if (storedSamossas) setSamossas(toArray(storedSamossas));
      else await fbSet("samossas", Object.fromEntries(DEFAULT_SAMOSSAS.map(item => [item.id, item])));
      if (storedPokkas) setPokkas(toArray(storedPokkas).map(item => ({ ...item, emoji: "🥤" })));
      else await fbSet("pokkas", Object.fromEntries(DEFAULT_POKKAS.map(item => [item.id, item])));

      const playerList = toArray(storedPlayers);
      setPlayers(playerList);
      const savedId = localStorage.getItem("currentPlayerId");
      setCurrentPlayer(playerList.some(player => player.id === savedId) ? savedId : playerList[0]?.id || null);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const stopSamossas = fbListen("samossas", data => setSamossas(toArray(data)));
    const stopPokkas = fbListen("pokkas", data => setPokkas(toArray(data).map(item => ({ ...item, emoji: "🥤" }))));
    const stopPlayers = fbListen("players", data => setPlayers(toArray(data)));
    return () => { stopSamossas(); stopPokkas(); stopPlayers(); };
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
    setter(previous => previous.map(item => item.id === itemId
      ? { ...item, ratings: { ...(item.ratings || {}), [currentPlayer]: rating } }
      : item));
    setSyncing(true);
    await fbSet(`${path}/${itemId}/ratings/${currentPlayer}`, rating);
    setSyncing(false);
  }

  async function deleteItem(item) {
    if (!window.confirm(`Supprimer "${item.name}" ?`)) return;
    const path = tab === "samossa" ? "samossas" : "pokkas";
    const setter = tab === "samossa" ? setSamossas : setPokkas;
    setter(previous => previous.filter(entry => entry.id !== item.id));
    await fbSet(`${path}/${item.id}`, null);
  }

  async function addItem() {
    if (!newItemName.trim()) return;
    const id = Date.now();
    const item = {
      id,
      name: newItemName.trim(),
      vendor: newItemVendor.trim() || "Vendeur inconnu",
      ratings: {},
      emoji: tab === "samossa" ? "🥟" : "🥤",
    };
    const path = tab === "samossa" ? "samossas" : "pokkas";
    const setter = tab === "samossa" ? setSamossas : setPokkas;
    setter(previous => [...previous, item]);
    await fbSet(`${path}/${id}`, item);
    setNewItemName("");
    setNewItemVendor("");
    setShowAddItem(false);
  }

  async function addPlayer() {
    if (!newPlayerName.trim()) return;
    const id = `p${Date.now()}`;
    const player = { id, name: newPlayerName.trim() };
    setPlayers(previous => [...previous, player]);
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
    await fbSet(`players/${id}`, player);
    setNewPlayerName("");
  }

  function switchPlayer(id) {
    setCurrentPlayer(id);
    localStorage.setItem("currentPlayerId", id);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 80, fontFamily: "system-ui" }}>🥟 Chargement…</div>;

  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 };

  return (
    <>
    <FloatingFood />
    <main style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "system-ui", minHeight: "100vh" }}>
      <header style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 42 }}>🌴</div>
        <h1 style={{ fontSize: 24, margin: "6px 0" }}>Sampok</h1>
        <p style={{ color: "#6b7280", fontSize: 13 }}>Samossas & Pokkas · notation détaillée sur 20</p>
        {syncing && <p style={{ color: "#6b7280", fontSize: 11 }}>Sauvegarde…</p>}
      </header>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <strong style={{ fontSize: 13 }}>Qui note ?</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {players.map(player => (
            <button
              key={player.id}
              onClick={() => switchPlayer(player.id)}
              style={{
                background: player.id === currentPlayer ? "#dbeafe" : "#f3f4f6",
                color: player.id === currentPlayer ? "#1d4ed8" : "#374151",
                borderColor: player.id === currentPlayer ? "#93c5fd" : "#e5e7eb",
                fontWeight: player.id === currentPlayer ? 700 : 400,
              }}
            >
              {player.name}
            </button>
          ))}
          <input
            value={newPlayerName}
            onChange={event => setNewPlayerName(event.target.value)}
            onKeyDown={event => event.key === "Enter" && addPlayer()}
            placeholder="Nouveau joueur"
            style={{ width: 150 }}
          />
          <button onClick={addPlayer}>+ Ajouter</button>
        </div>
      </section>

      <nav style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setTab("samossa")} style={{ flex: 1, padding: 12, background: tab === "samossa" ? "#dbeafe" : "#fff" }}>
          🥟 Samossas
        </button>
        <button onClick={() => setTab("pokka")} style={{ flex: 1, padding: 12, background: tab === "pokka" ? "#dbeafe" : "#fff" }}>
          🥤 Pokkas
        </button>
      </nav>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <strong style={{ fontSize: 13 }}>Équipe — classement affiché pour :</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {/* Bouton Tous */}
          <button
            onClick={() => setRankingPlayers("all")}
            style={{
              background: rankingPlayers === "all" ? "#dcfce7" : "#f3f4f6",
              color: rankingPlayers === "all" ? "#16a34a" : "#374151",
              borderColor: rankingPlayers === "all" ? "#86efac" : "#e5e7eb",
              fontWeight: rankingPlayers === "all" ? 700 : 400,
            }}
          >
            👥 Tous
          </button>
          {/* Boutons individuels — multi-select */}
          {players.map(player => {
            const selected = Array.isArray(rankingPlayers) && rankingPlayers.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => {
                  setRankingPlayers(prev => {
                    const current = Array.isArray(prev) ? prev : [];
                    if (current.includes(player.id)) {
                      const next = current.filter(id => id !== player.id);
                      return next.length === 0 ? "all" : next;
                    }
                    return [...current, player.id];
                  });
                }}
                style={{
                  background: selected ? "#dbeafe" : "#f3f4f6",
                  color: selected ? "#1d4ed8" : "#374151",
                  borderColor: selected ? "#93c5fd" : "#e5e7eb",
                  fontWeight: selected ? 700 : 400,
                }}
              >
                👤 {player.name}
              </button>
            );
          })}
        </div>
        <p style={{ color: "#6b7280", fontSize: 11, marginTop: 8 }}>
          {rankingPlayers === "all"
            ? "Moyenne de tous les joueurs."
            : Array.isArray(rankingPlayers) && rankingPlayers.length === 1
              ? `Classement basé sur les notes de ${players.find(p => p.id === rankingPlayers[0])?.name || "ce joueur"}.`
              : `Moyenne des ${rankingPlayers.length} joueurs sélectionnés.`}
        </p>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        {sortedItems.map((item, index) => (
          <RankCard
            key={`${item.id}-${currentPlayer}`}
            item={item}
            rank={index}
            type={tab}
            players={players}
            currentPlayer={currentPlayer}
            rankingPlayers={rankingPlayers}
            onSave={saveRating}
            onDelete={deleteItem}
          />
        ))}
      </section>

      <section style={{ ...cardStyle, marginTop: 14 }}>
        {showAddItem ? (
          <div style={{ display: "grid", gap: 10 }}>
            <strong>Ajouter {tab === "samossa" ? "un samossa 🥟" : "un pokka 🥤"}</strong>
            <input value={newItemName} onChange={event => setNewItemName(event.target.value)} placeholder="Nom" />
            <input value={newItemVendor} onChange={event => setNewItemVendor(event.target.value)} placeholder="Vendeur / snack" />
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

      {tab === "pokka" && (
        <section style={{ marginTop: 14, padding: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#991b1b", margin: "0 0 10px" }}>
            ⚠️ Si les notes Pokka semblent inversées, clique ici pour remettre à zéro toutes les notes Pokka et recommencer proprement.
          </p>
          <button
            onClick={async () => {
              if (!window.confirm("Effacer toutes les notes Pokka ? Cette action est irréversible.")) return;
              const resetPokkas = pokkas.map(p => ({ ...p, ratings: {} }));
              setPokkas(resetPokkas);
              await Promise.all(resetPokkas.map(p => fbSet(`pokkas/${p.id}/ratings`, {})));
              alert("Notes effacées ! Vous pouvez revoter.");
            }}
            style={{ background: "#b91c1c", color: "white", borderColor: "#b91c1c", fontWeight: 700, fontSize: 13 }}
          >
            🗑️ Remettre à zéro les notes Pokka
          </button>
        </section>
      )}
    </main>
    </>
  );
}

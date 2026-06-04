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
    ["taste", "Goût"],
    ["crispiness", "Croustillant"],
    ["filling", "Farce"],
    ["value", "Qualité / prix"],
  ],
  pokka: [
    ["taste", "Goût"],
    ["freshness", "Fraîcheur"],
    ["texture", "Texture"],
    ["value", "Qualité / prix"],
  ],
};

function toArray(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : Object.values(value);
  return values.filter(item => item && typeof item === "object");
}

function ratingScore(rating) {
  if (typeof rating === "number") return rating * 4;
  const scores = Object.values(rating || {}).filter(value => typeof value === "number");
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
}

function avgRating(item) {
  const scores = Object.values(item.ratings || {}).map(ratingScore).filter(Boolean);
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
}

function displayedRating(item, rankingPlayer) {
  return rankingPlayer === "team" ? avgRating(item) : ratingScore(item.ratings?.[rankingPlayer]);
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
    </div>
  );
}

function ScoreInput({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "130px 1fr 54px", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#4b5563" }}>{label}</span>
      <input
        type="range"
        min="0"
        max="20"
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        style={{ width: "100%" }}
      />
      <strong style={{ textAlign: "right", color: "#1d4ed8" }}>{value}/20</strong>
    </label>
  );
}

function RankCard({ item, rank, type, players, currentPlayer, rankingPlayer, onSave, onDelete }) {
  const criteria = CRITERIA[type];
  const saved = item.ratings?.[currentPlayer];
  const initial = Object.fromEntries(criteria.map(([key]) => [key, typeof saved === "object" ? saved[key] ?? 10 : 10]));
  const [draft, setDraft] = useState(initial);
  const [savedMessage, setSavedMessage] = useState(false);

  const total = ratingScore(draft);
  const average = displayedRating(item, rankingPlayer);
  const visiblePlayers = rankingPlayer === "team" ? players : players.filter(player => player.id === rankingPlayer);
  const voteCount = rankingPlayer === "team"
    ? Object.keys(item.ratings || {}).length
    : Number(Boolean(item.ratings?.[rankingPlayer]));
  const medals = ["🥇", "🥈", "🥉"];

  async function save() {
    await onSave(item.id, draft);
    setSavedMessage(true);
  }

  return (
    <article style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ minWidth: 28, fontWeight: 700 }}>{voteCount && rank < 3 ? medals[rank] : `#${rank + 1}`}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{item.emoji || (type === "samossa" ? "🥟" : "🥤")} {item.name}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>📍 {item.vendor}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <strong style={{ fontSize: 22, color: voteCount ? "#f59e0b" : "#d1d5db" }}>
            {voteCount ? average.toFixed(1) : "—"}/20
          </strong>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{voteCount} avis</div>
        </div>
      </div>

      {currentPlayer ? (
        <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 14, paddingTop: 14, display: "grid", gap: 10 }}>
          {criteria.map(([key, label]) => (
            <ScoreInput
              key={key}
              label={label}
              value={draft[key]}
              onChange={value => {
                setDraft(previous => ({ ...previous, [key]: value }));
                setSavedMessage(false);
              }}
            />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <strong style={{ marginRight: "auto" }}>Ta note globale : {total.toFixed(1)}/20</strong>
            {savedMessage && <span style={{ fontSize: 12, color: "#16a34a" }}>Avis sauvegardé</span>}
            <button onClick={save} style={{ background: "#1d4ed8", color: "white", borderColor: "#1d4ed8", fontWeight: 700 }}>
              Sauvegarder l'avis
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>Ajoute un joueur pour noter.</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {visiblePlayers.map(player => {
          const score = ratingScore(item.ratings?.[player.id]);
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
    </article>
  );
}

export default function App() {
  const [tab, setTab] = useState("samossa");
  const [samossas, setSamossas] = useState(DEFAULT_SAMOSSAS);
  const [pokkas, setPokkas] = useState(DEFAULT_POKKAS);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [rankingPlayer, setRankingPlayer] = useState("team");
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
    () => [...items].sort((a, b) => displayedRating(b, rankingPlayer) - displayedRating(a, rankingPlayer)),
    [items, rankingPlayer],
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
        <h1 style={{ fontSize: 24, margin: "6px 0" }}>Classement Réunion</h1>
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
        <strong style={{ fontSize: 13 }}>Classement affiché</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setRankingPlayer("team")}
            style={{ background: rankingPlayer === "team" ? "#dcfce7" : "#f3f4f6", fontWeight: rankingPlayer === "team" ? 700 : 400 }}
          >
            👥 Équipe
          </button>
          {players.map(player => (
            <button
              key={player.id}
              onClick={() => setRankingPlayer(player.id)}
              style={{ background: rankingPlayer === player.id ? "#dbeafe" : "#f3f4f6", fontWeight: rankingPlayer === player.id ? 700 : 400 }}
            >
              👤 {player.name}
            </button>
          ))}
        </div>
        <p style={{ color: "#6b7280", fontSize: 11, marginTop: 8 }}>
          {rankingPlayer === "team"
            ? "Moyenne de tous les avis."
            : `Classement basé uniquement sur les notes de ${players.find(player => player.id === rankingPlayer)?.name || "cet utilisateur"}.`}
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
            rankingPlayer={rankingPlayer}
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
    </main>
    </>
  );
}

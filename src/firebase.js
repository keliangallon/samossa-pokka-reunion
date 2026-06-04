const DB_URL = "https://samossa-pokka-reunion-default-rtdb.europe-west1.firebasedatabase.app";

export async function fbGet(path) {
  try {
    const res = await fetch(`${DB_URL}/${path}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("fbGet error", e);
    return null;
  }
}

export async function fbSet(path, data) {
  try {
    await fetch(`${DB_URL}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("fbSet error", e);
  }
}

export async function fbPatch(path, data) {
  try {
    await fetch(`${DB_URL}/${path}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("fbPatch error", e);
  }
}

// Écoute temps réel — retourne une fonction de nettoyage
export function fbListen(path, callback) {
  try {
    const es = new EventSource(`${DB_URL}/${path}.json`);
    es.addEventListener("put", (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed && parsed.data !== undefined) callback(parsed.data);
      } catch (err) { console.warn("fbListen parse error", err); }
    });
    es.onerror = () => {}; // silencieux
    return () => es.close();
  } catch (e) {
    console.warn("fbListen error", e);
    return () => {};
  }
}

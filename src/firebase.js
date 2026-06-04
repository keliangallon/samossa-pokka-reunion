const DB_URL = "https://samossa-pokka-reunion-default-rtdb.europe-west1.firebasedatabase.app";

export async function fbGet(path) {
  const res = await fetch(`${DB_URL}/${path}.json`);
  return res.ok ? res.json() : null;
}

export async function fbSet(path, data) {
  await fetch(`${DB_URL}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fbPatch(path, data) {
  await fetch(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Écoute les changements en temps réel via SSE
export function fbListen(path, callback) {
  const es = new EventSource(`${DB_URL}/${path}.json`);
  es.addEventListener("put", (e) => {
    const { data } = JSON.parse(e.data);
    callback(data);
  });
  es.addEventListener("patch", (e) => {
    callback(null, JSON.parse(e.data));
  });
  return () => es.close();
}

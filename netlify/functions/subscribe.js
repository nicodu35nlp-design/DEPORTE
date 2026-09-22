import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  const store = getStore("subscriptions");
  try {
    if (req.method === "POST") {
      const body = await req.json();
      if (!body.subscription || !body.subscription.endpoint) return json({ error: "subscription manquante" }, 400);

      // Évite les doublons pour le même appareil (même endpoint)
      const { blobs } = await store.list();
      for (const b of blobs) {
        const raw = await store.get(b.key);
        const existing = raw ? JSON.parse(raw) : null;
        if (existing && existing.subscription.endpoint === body.subscription.endpoint) {
          const updated = { ...existing, subscription: body.subscription, updatedAt: new Date().toISOString() };
          await store.setJSON(existing.id, updated);
          return json(updated, 200);
        }
      }
      const id = crypto.randomUUID();
      const data = { id, subscription: body.subscription, createdAt: new Date().toISOString() };
      await store.setJSON(id, data);
      return json(data, 201);
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const endpoint = url.searchParams.get("endpoint");
      if (!endpoint) return json({ error: "endpoint manquant" }, 400);
      const { blobs } = await store.list();
      for (const b of blobs) {
        const raw = await store.get(b.key);
        const existing = raw ? JSON.parse(raw) : null;
        if (existing && existing.subscription.endpoint === endpoint) {
          await store.delete(existing.id);
        }
      }
      return new Response(null, { status: 204 });
    }

    return json({ error: "Méthode non autorisée" }, 405);
  } catch (err) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};

export const config = { path: "/api/subscribe" };

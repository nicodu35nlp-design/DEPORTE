import { getStore } from "@netlify/blobs";
import webpush from "web-push";

function parisNow() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async () => {
  const { date, hour, minute } = parisNow();

  // Le planificateur tourne toutes les 10 min : on n'agit que dans les 10 premières minutes de l'heure visée
  if (minute >= 10) return new Response("skip (hors fenêtre)");

  let targetDate, flagField, notifText;
  if (hour === 22) {
    targetDate = addDays(date, 1);
    flagField = "notified_22h";
    notifText = { title: "Séance demain 💪", body: "N'oublie pas ta séance prévue demain, prépare tes affaires !" };
  } else if (hour === 8) {
    targetDate = date;
    flagField = "notified_8h";
    notifText = { title: "C'est aujourd'hui ! 🏋️", body: "Ta séance est prévue aujourd'hui, courage !" };
  } else {
    return new Response("skip (hors créneau 22h/8h)");
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return new Response("VAPID non configuré", { status: 200 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const sessionsStore = getStore("sessions");
  const subsStore = getStore("subscriptions");

  const { blobs: sBlobs } = await sessionsStore.list();
  const sessions = await Promise.all(sBlobs.map(async (b) => JSON.parse(await sessionsStore.get(b.key))));
  const due = sessions.filter((s) => s.date === targetDate && s.status !== "annulee" && !s[flagField]);
  if (!due.length) return new Response("aucune séance due");

  const { blobs: subBlobs } = await subsStore.list();
  const subs = await Promise.all(subBlobs.map(async (b) => JSON.parse(await subsStore.get(b.key))));
  if (!subs.length) return new Response("aucun appareil abonné");

  let sent = 0;
  for (const session of due) {
    const payload = JSON.stringify({
      title: notifText.title,
      body: `${session.title || session.category || "Séance"} — ${notifText.body}`,
    });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (e) {
        // abonnement probablement expiré, on ignore silencieusement pour ne pas bloquer les autres
      }
    }
    session[flagField] = true;
    await sessionsStore.setJSON(session.id, session);
  }

  return new Response(`${due.length} séance(s) notifiée(s), ${sent} envoi(s) push`);
};

export const config = { schedule: "*/10 * * * *" };

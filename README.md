# FitStart — suivi sportif débutant

App simple : Dashboard, Objectifs, Calendrier, Bibliothèque d'exercices. Rappels push la veille à 22h et le jour même à 8h pour chaque séance planifiée. Stockage via Netlify Blobs.

## Déployer (méthode GitHub — comme pour ton autre app)

1. Crée un nouveau repo GitHub (ex: `fitstart`), vide, sans README
2. Envoie tout le contenu de ce dossier dedans (upload direct sur GitHub ou via `git push`, au choix)
3. Sur [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → connecte le repo
4. **Avant de cliquer Deploy**, va dans **Site settings → Environment variables** et ajoute ces 3 variables (nécessaires pour les notifications push) :

| Clé | Valeur |
|---|---|
| `VAPID_PUBLIC_KEY` | `BEXq4MHCMKT324tFzZV5zWXVr_34J_rue7Br1-fVGsEWINxEpcimec7o5APsKHmP1KvTcAA85JRgpg-ZKCqHzik` |
| `VAPID_PRIVATE_KEY` | `XPnFOTExwqiKUPATkhteHFVZTeAQW4682l1-yqoIFgs` |
| `VAPID_SUBJECT` | `mailto:tonemail@example.com` (n'importe quelle adresse valide) |

5. Clique **Deploy**. Netlify installe `@netlify/blobs` et `web-push`, build les fonctions (dont une fonction planifiée qui tourne toutes les 10 min pour vérifier les rappels à envoyer).
6. Une fois en ligne, ouvre le site **sur l'iPhone de la personne concernée**, Safari → Partager → **Sur l'écran d'accueil**. C'est obligatoire pour que les notifications marchent sur iOS (limitation Apple, pas de notre app).
7. Dans l'app (ouverte depuis l'icône sur l'écran d'accueil), clique **"🔔 Activer les rappels"** et accepte la permission de notification.

⚠️ Important : la clé `VAPID_PRIVATE_KEY` doit rester secrète — ne la mets jamais dans le code ou sur GitHub en clair, uniquement dans les variables d'environnement Netlify (c'est pour ça qu'elle n'est ni dans `app.js` ni committée nulle part dans ce projet).

## Structure

```
fitstart/
├── netlify.toml
├── package.json                  # @netlify/blobs + web-push
├── netlify/functions/
│   ├── sessions.js                # CRUD séances → /api/sessions
│   ├── goals.js                   # CRUD objectifs → /api/goals
│   ├── custom-exercises.js         # CRUD exercices ajoutés par la personne → /api/custom-exercises
│   ├── subscribe.js                # enregistre les abonnements push → /api/subscribe
│   └── send-notifications.js      # fonction planifiée (cron */10min), envoie les rappels 22h/8h
└── public/
    ├── index.html
    ├── style.css                  # identité verte/rose
    ├── app.js
    ├── exercises.js                # base de 25 exercices (7 groupes musculaires)
    ├── silhouette.js               # silhouettes SVG avant/arrière réutilisables
    ├── manifest.json               # PWA
    ├── service-worker.js           # gère la réception des notifications push
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

## Comment ça marche

- **Dashboard** : prochaine séance, séances faites ce mois-ci, objectifs actifs.
- **Objectifs** : titre + description libres, valeur cible/actuelle optionnelle avec barre de progression. Tout est modifiable à la main.
- **Calendrier** : vue semaine ou mois, clique un jour vide pour planifier une séance, clique une séance existante pour la modifier/supprimer.
- **Exercices** : bibliothèque de 25 exercices classés par groupe musculaire (jambes, fessiers, dos, pecs, épaules, bras, abdos). Chaque exercice a un schéma corps avant/arrière avec zones colorées (rouge = très sollicité, orange = moyen, vert = léger).
- **Créer une séance** : choisis un type (ex: Jambes), coche les exercices voulus. Si 3 exercices ou plus ciblent fortement le même muscle, un avertissement (non bloquant) invite à varier.
- **Notifications** : dès qu'une séance a une date, la fonction planifiée envoie un rappel push la veille à 22h et le matin même à 8h (heure de Paris), une seule fois par séance.

## Ajouter/modifier des exercices

Tout est dans `public/exercises.js` — chaque exercice a un `id`, un `name`, une `category`, un `equipement`, une `description`, et un objet `zones` (clé = zone du corps, valeur = `"rouge"|"orange"|"vert"`). Zones disponibles : `chest, shoulders_front, shoulders_back, biceps, triceps, forearms, abs, quads, hamstrings, glutes, calves_front, calves_back, upper_back, lower_back`.

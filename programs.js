// Programmes pré-construits — perte de poids, prédominance jambes/cardio, sans impact sur la cheville.

const DAY_TEMPLATES = {
  full_body: {
    label: "Full Body",
    category: "jambes",
    exercises: ["squat-gobelet", "pompes", "tirage-horizontal", "curl-biceps", "gainage"],
  },
  jambes: {
    label: "Jambes",
    category: "jambes",
    exercises: ["squat-gobelet", "presse-cuisses", "hip-thrust", "leg-curl", "gainage"],
  },
  jambes_cardio: {
    label: "Jambes + Cardio",
    category: "jambes",
    exercises: ["squat-gobelet", "presse-cuisses", "hip-thrust", "leg-curl", "rameur"],
    tracking: { rameur: { minutes: 25 } },
  },
  cardio_abdos: {
    label: "Cardio + Abdos",
    category: "cardio",
    exercises: ["rameur", "crunch", "releve-jambes"],
    tracking: { rameur: { minutes: 25 } },
  },
  fessiers_jambes: {
    label: "Fessiers / Jambes",
    category: "fessiers",
    exercises: ["abduction-hanches", "kickback-fessier", "presse-cuisses", "leg-curl", "crunch"],
  },
  cardio_haut_leger: {
    label: "Cardio + Haut du corps léger",
    category: "cardio",
    exercises: ["velo", "pompes", "tirage-horizontal"],
    tracking: { velo: { minutes: 25 } },
  },
};

const PROGRAMS = [
  {
    id: "perte-poids-2j",
    name: "Perte de poids — 2 jours/semaine",
    frequency: 2,
    description: "Pour démarrer en douceur ou un emploi du temps chargé.",
    days: ["full_body", "jambes_cardio"],
  },
  {
    id: "perte-poids-3j",
    name: "Perte de poids — 3 jours/semaine ⭐ (recommandé)",
    frequency: 3,
    description: "Le bon équilibre régularité/récupération pour un objectif de 4-5 kg sur plusieurs mois.",
    days: ["full_body", "cardio_abdos", "fessiers_jambes"],
    recommended: true,
  },
  {
    id: "perte-poids-4j",
    name: "Perte de poids — 4 jours/semaine",
    frequency: 4,
    description: "Pour qui a plus de disponibilités, avec un jour dédié au haut du corps.",
    days: ["full_body", "cardio_abdos", "fessiers_jambes", "cardio_haut_leger"],
  },
];

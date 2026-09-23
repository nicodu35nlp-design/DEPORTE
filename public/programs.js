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
    id: "full-2j",
    name: "Full sur 2 jours",
    frequency: 2,
    description: "Pour démarrer en douceur ou un emploi du temps chargé.",
    days: ["full_body", "jambes_cardio"],
  },
  {
    id: "full-3j",
    name: "Full sur 3 jours ⭐ (recommandé)",
    frequency: 3,
    description: "Le bon équilibre régularité/récupération pour progresser sur la durée.",
    days: ["full_body", "cardio_abdos", "fessiers_jambes"],
    recommended: true,
  },
  {
    id: "full-4j",
    name: "Full sur 4 jours",
    frequency: 4,
    description: "Pour qui a plus de disponibilités, avec un jour dédié au haut du corps.",
    days: ["full_body", "cardio_abdos", "fessiers_jambes", "cardio_haut_leger"],
  },
];

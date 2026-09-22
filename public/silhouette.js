// Silhouette générique avant/arrière — schématique, zones colorables par JS.
// Chaque <path>/<ellipse> porte un data-zone correspondant aux clés utilisées dans exercises.js

const SILHOUETTE_FRONT = `
<svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg">
  <!-- contour de base -->
  <circle cx="100" cy="38" r="26" fill="var(--sil-base)" />
  <rect x="78" y="60" width="44" height="20" rx="8" fill="var(--sil-base)" />
  <path d="M60 80 Q100 68 140 80 L148 190 Q100 205 52 190 Z" fill="var(--sil-base)" />
  <!-- bras -->
  <path data-zone="shoulders_front" d="M52 88 Q38 92 34 120 L40 170 L58 168 L54 120 Q56 98 60 88 Z" fill="var(--sil-base)" />
  <path data-zone="shoulders_front" d="M148 88 Q162 92 166 120 L160 170 L142 168 L146 120 Q144 98 140 88 Z" fill="var(--sil-base)" />
  <path data-zone="biceps" d="M36 122 L56 122 L52 172 L38 172 Z" fill="var(--sil-base)" />
  <path data-zone="biceps" d="M164 122 L144 122 L148 172 L162 172 Z" fill="var(--sil-base)" />
  <path data-zone="forearms" d="M38 174 L52 174 L48 218 L36 216 Z" fill="var(--sil-base)" />
  <path data-zone="forearms" d="M162 174 L148 174 L152 218 L164 216 Z" fill="var(--sil-base)" />
  <!-- torse / abdos -->
  <path data-zone="chest" d="M62 92 Q100 84 138 92 L134 140 Q100 148 66 140 Z" fill="var(--sil-base)" />
  <path data-zone="abs" d="M68 142 Q100 150 132 142 L126 195 Q100 202 74 195 Z" fill="var(--sil-base)" />
  <!-- jambes -->
  <path data-zone="quads" d="M62 200 L96 200 L92 290 L64 290 Z" fill="var(--sil-base)" />
  <path data-zone="quads" d="M138 200 L104 200 L108 290 L136 290 Z" fill="var(--sil-base)" />
  <path data-zone="calves_front" d="M66 294 L90 294 L86 360 L70 360 Z" fill="var(--sil-base)" />
  <path data-zone="calves_front" d="M134 294 L110 294 L114 360 L130 360 Z" fill="var(--sil-base)" />
  <ellipse cx="76" cy="372" rx="16" ry="8" fill="var(--sil-base)" />
  <ellipse cx="124" cy="372" rx="16" ry="8" fill="var(--sil-base)" />
</svg>`;

const SILHOUETTE_BACK = `
<svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="38" r="26" fill="var(--sil-base)" />
  <rect x="78" y="60" width="44" height="20" rx="8" fill="var(--sil-base)" />
  <path d="M60 80 Q100 68 140 80 L148 190 Q100 205 52 190 Z" fill="var(--sil-base)" />
  <path data-zone="shoulders_back" d="M52 88 Q38 92 34 120 L40 170 L58 168 L54 120 Q56 98 60 88 Z" fill="var(--sil-base)" />
  <path data-zone="shoulders_back" d="M148 88 Q162 92 166 120 L160 170 L142 168 L146 120 Q144 98 140 88 Z" fill="var(--sil-base)" />
  <path data-zone="triceps" d="M36 122 L56 122 L52 172 L38 172 Z" fill="var(--sil-base)" />
  <path data-zone="triceps" d="M164 122 L144 122 L148 172 L162 172 Z" fill="var(--sil-base)" />
  <path data-zone="forearms" d="M38 174 L52 174 L48 218 L36 216 Z" fill="var(--sil-base)" />
  <path data-zone="forearms" d="M162 174 L148 174 L152 218 L164 216 Z" fill="var(--sil-base)" />
  <path data-zone="upper_back" d="M62 90 Q100 82 138 90 L132 138 Q100 146 68 138 Z" fill="var(--sil-base)" />
  <path data-zone="lower_back" d="M70 140 Q100 148 130 140 L125 190 Q100 197 75 190 Z" fill="var(--sil-base)" />
  <path data-zone="glutes" d="M64 192 Q100 202 136 192 L132 225 Q100 234 68 225 Z" fill="var(--sil-base)" />
  <path data-zone="hamstrings" d="M64 227 L96 227 L92 290 L66 290 Z" fill="var(--sil-base)" />
  <path data-zone="hamstrings" d="M136 227 L104 227 L108 290 L134 290 Z" fill="var(--sil-base)" />
  <path data-zone="calves_back" d="M66 294 L90 294 L86 360 L70 360 Z" fill="var(--sil-base)" />
  <path data-zone="calves_back" d="M134 294 L110 294 L114 360 L130 360 Z" fill="var(--sil-base)" />
  <ellipse cx="76" cy="372" rx="16" ry="8" fill="var(--sil-base)" />
  <ellipse cx="124" cy="372" rx="16" ry="8" fill="var(--sil-base)" />
</svg>`;

const ZONE_COLORS = { rouge: "#FF5A6E", orange: "#FFA94D", vert: "#2FAE60", inactif: null };

// Injecte le SVG (front ou back) dans un conteneur et colore les zones selon la map fournie
function renderSilhouette(container, svgString, zoneMap) {
  container.innerHTML = svgString;
  const svg = container.querySelector("svg");
  svg.querySelectorAll("[data-zone]").forEach((el) => {
    const zone = el.getAttribute("data-zone");
    const intensity = zoneMap && zoneMap[zone];
    el.style.fill = intensity ? ZONE_COLORS[intensity] : "var(--sil-inactive)";
    el.style.transition = "fill .2s";
  });
}

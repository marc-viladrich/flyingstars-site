// The one place that names record types in the editor: [singular, icon, plural, media collection (optional, defaults to the kind itself)].
// Shared by the editor chrome (labels, icons, "Inhalte verwalten") and the server (media collections).
// Order is the order in which content types are offered (Kunden, Team, Show-Pakete, Blog, Projekte, FAQ, …).
export const recordKinds = {
  "client/": ["Kunde", "building-2", "Kunden"],
  "team/": ["Teammitglied", "user", "Team"],
  "extra/": ["Paket-Upgrade", "package", "Paket-Upgrades"],
  "package/": ["Show-Paket", "package", "Show-Pakete"],
  "post/": ["Blogartikel", "newspaper", "Blog"],
  "project/": ["Projekt", "folder-open", "Projekte"],
  "faq/": ["FAQ", "circle-help", "FAQ"],
  "page/": ["Seite", "file-text", "Seiten"],
  "screen/": ["Seite", "panel-top", "Systemseiten", "page/"],
  "site/": ["Website-Daten", "mail", "Website-Daten"],
  "media/": ["Medium", "image", "Medien"],
  "translation/": ["Sprachfassung", "languages", "Sprachfassungen"],
};
const fallback = ["Inhalt", "file-text", "Inhalte"];
export const kindOf = (id) => recordKinds[String(id).split("/")[0] + "/"] || fallback;
export const kindPlural = (prefix) => (recordKinds[prefix] || fallback)[2];

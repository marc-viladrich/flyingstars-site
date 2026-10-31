/** Fixed sources only: this cannot be used as an arbitrary URL proxy. */
export const videos: Record<string, string> = {
  showreel: 'https://flyingstars.art/wp-content/uploads/2026/05/Flyingstars-Showreel.mp4',
  bokkenrijders: 'https://flyingstars-relaunch.vercel.app/media/projekte/bokkenrijders.mp4',
  nfl: 'https://flyingstars-relaunch.vercel.app/media/projekte/nfl.mp4',
  ford: 'https://flyingstars-relaunch.vercel.app/media/projekte/ford.mp4',
  puma: 'https://flyingstars-relaunch.vercel.app/media/projekte/puma.mp4',
};
export function videoPath(src: string) {
  const key = Object.keys(videos).find((key) => videos[key] === src || videos[key].replace('.mp4', '.webm') === src);
  if (!key) throw new Error('Videoquelle ist nicht registriert.');
  // Im Dev-Server gibt es die Pages Function nicht; dort laden die Videos direkt von der Quelle, damit Showreel und
  // Referenzvideos lokal sichtbar sind. Build und Produktion bleiben bei derselben Origin (Datensparsamkeit).
  return import.meta.env.DEV ? videos[key] : `/api/media?asset=${key}`;
}

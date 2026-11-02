/** Fixed sources only: this cannot be used as an arbitrary URL proxy. */
export const videos = {
  showreel: 'https://flyingstars.art/wp-content/uploads/2026/05/Flyingstars-Showreel.mp4',
  bokkenrijders: 'https://flyingstars-relaunch.vercel.app/media/projekte/bokkenrijders.mp4',
  nfl: 'https://flyingstars-relaunch.vercel.app/media/projekte/nfl.mp4',
  ford: 'https://flyingstars-relaunch.vercel.app/media/projekte/ford.mp4',
  puma: 'https://flyingstars-relaunch.vercel.app/media/projekte/puma.mp4',
  // Indoor-Show Siemens, Hannover Messe 03/2025. Alle sechs Originale sind bereits ohne Tonspur.
  siemensIndoor: 'https://flyingstars.art/wp-content/uploads/2025/04/Siemens-Overview.mp4',
} as const;
type VideoKey = keyof typeof videos;

/** Kleine stumme Loops für Karten und gerahmte Landing-Heroes; Details und Encodes: docs/video-diaet.md. */
export const videoPreviews: Record<VideoKey, string> = {
  showreel: '/media/video/showreel-preview-v1.mp4',
  bokkenrijders: '/media/video/bokkenrijders-preview-v1.mp4',
  nfl: '/media/video/nfl-preview-v1.mp4',
  ford: '/media/video/ford-preview-v1.mp4',
  puma: '/media/video/puma-preview-v1.mp4',
  siemensIndoor: '/media/video/siemensIndoor-preview-v1.mp4',
};

export function videoPath(src: string, variant: 'full' | 'preview' = 'full') {
  const key = (Object.keys(videos) as VideoKey[]).find((key) => videos[key] === src);
  if (!key) throw new Error('Videoquelle ist nicht registriert.');
  if (variant === 'preview') return videoPreviews[key];
  // Originale bleiben extern. Im Dev-Server gibt es die Pages Function nicht; Build und Produktion nutzen
  // denselben festen Proxy wie bisher. Keine erfundenen WebM-Aliase auf eine MP4-Quelle.
  return import.meta.env?.DEV || (import.meta.env?.SSR && process.env.AFE_MODE==='editor') ? videos[key] : `/api/media?asset=${key}`;
}

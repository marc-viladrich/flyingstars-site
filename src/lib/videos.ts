/** Fixed sources only: this cannot be used as an arbitrary URL proxy. */
export const videos = {
  showreel: '/media/video/wordpress-3ac827bd54aa2febfe1d422f230ff2d5463b871772e3da48da704a3a3339214d.mp4',
  bokkenrijders: 'https://flyingstars-relaunch.vercel.app/media/projekte/bokkenrijders.mp4',
  nfl: 'https://flyingstars-relaunch.vercel.app/media/projekte/nfl.mp4',
  ford: 'https://flyingstars-relaunch.vercel.app/media/projekte/ford.mp4',
  puma: 'https://flyingstars-relaunch.vercel.app/media/projekte/puma.mp4',
  // Indoor-Show Siemens, Hannover Messe 03/2025. Alle sechs Originale sind bereits ohne Tonspur.
  siemensIndoor: '/media/video/wordpress-37f6bb19e91c84f3b74f41ed4e3f780ac7d46fd42b53931c7cf5a993a300179b.mp4',
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

/** 480p-Fassungen der Seitenköpfe für das Handy (Marc, 21.11.2026: „autoplay … aber halt auch 480p für geringe
 *  Datenmengen“). 854 × 480, H.264 CRF 29, gleicher Ausschnitt wie die Vorschau; Encode in docs/video-diaet.md. */
export const videoMobile: Partial<Record<VideoKey, string>> = {
  showreel: '/media/video/showreel-mobile-480-v1.mp4',
  ford: '/media/video/ford-mobile-480-v1.mp4',
  siemensIndoor: '/media/video/siemensIndoor-mobile-480-v1.mp4',
};

export function videoPath(src: string, variant: 'full' | 'preview' | 'mobile' = 'full') {
  const key = (Object.keys(videos) as VideoKey[]).find((key) => videos[key] === src);
  if (!key) throw new Error('Videoquelle ist nicht registriert.');
  if (variant === 'preview') return videoPreviews[key];
  if (variant === 'mobile') return videoMobile[key] ?? videoPreviews[key];
  if (videos[key].startsWith('/')) return videos[key];
  // Andere registrierte Originale bleiben extern. Im Dev-Server gibt es die Pages Function nicht; Build und Produktion nutzen
  // denselben festen Proxy wie bisher. Keine erfundenen WebM-Aliase auf eine MP4-Quelle.
  return import.meta.env?.DEV || (import.meta.env?.SSR && process.env.AFE_MODE==='editor') ? videos[key] : `/api/media?asset=${key}`;
}

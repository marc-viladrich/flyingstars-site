import { getMotionPolicy, subscribeMotionPolicy, observeVisibility, type MotionPolicy } from './motion-policy.ts';
// Wie die mobilen Video-Layouts in global.css: em bezieht sich in Media Queries auf die Browser-Grundschrift.
export const VIDEO_MOBILE_QUERY = '(max-width: 43.75em)';
export type VideoTrigger = 'ambient' | 'manual' | 'hover';
interface Desire { trigger: VideoTrigger; policy: MotionPolicy; visible: boolean; choice: boolean | null; hovered: boolean; touch: boolean; wide: boolean }
export function videoWanted({ trigger, policy, visible, choice, hovered, touch, wide }: Desire): boolean {
  if (!visible || !policy.pageVisible || policy.globalPaused) return false;
  // Eine ausdrückliche Wiedergabe lädt auch bei Save-Data/reduced motion. Die globale Pause bleibt verbindlich.
  if (trigger === 'manual' && choice !== null) return choice;
  if (policy.reduced || policy.saveData) return false;
  return trigger === 'hover' ? hovered || touch : wide;
}
interface PlaybackOptions { source: () => string | Promise<string>; onState?: (playing: boolean) => void; onError?: () => void }
/** Die Generation verhindert, dass ein spätes play()-Promise einen inzwischen pausierten Film wieder freigibt. */
export function createPlayback(video: HTMLVideoElement, { source, onState = () => {}, onError = () => {} }: PlaybackOptions) {
  let desired = false, playing = false, pending = false, failed = false, disposed = false, generation = 0;
  let resumeAt = 0, cancelMetadata: (() => void) | undefined;
  const cancelPreparation = () => { cancelMetadata?.(); cancelMetadata = undefined; };
  const update = (want: boolean) => {
    if (disposed || failed) return;
    desired = want;
    if (!want) { generation++; cancelPreparation(); pending = false; playing = false; video.pause(); onState(false); return; }
    if (pending || playing) return;
    const request = ++generation;
    pending = true;
    const current = () => !disposed && desired && request === generation;
    Promise.resolve().then(async () => {
      if (!current()) return;
      let assigned = false;
      if (!video.src) {
        const src = await source();
        if (!current()) return;
        video.src = src;
        assigned = true;
      }
      // A replacement resumes only after its timeline exists. Never flash/play frame zero.
      if (resumeAt > 0) {
        if (video.readyState < 1) {
          const ready = await new Promise<boolean>(resolve => {
            const finish = (ok: boolean) => { video.removeEventListener('loadedmetadata', loaded); cancelMetadata = undefined; resolve(ok); };
            const loaded = () => finish(true);
            cancelMetadata = () => finish(false);
            video.addEventListener('loadedmetadata', loaded, { once: true });
            if (assigned) video.load();
          });
          if (!ready || !current()) return;
        }
        video.currentTime = Number.isFinite(video.duration) ? Math.min(resumeAt, Math.max(0, video.duration - 0.05)) : resumeAt;
        resumeAt = 0;
      }
      if (disposed || !desired || request !== generation) return;
      return video.play();
    }).then(() => {
      if (disposed || !desired || request !== generation) { if (!desired || disposed) video.pause(); return; }
      pending = false; playing = true; onState(true);
    }).catch(reason => {
      if (request !== generation || disposed) return;
      // A decoder rejection is a media failure. Autoplay denial/AbortError must
      // not spend another download or defeat a pause by retrying a different codec.
      if (reason?.name === 'NotSupportedError') error();
      else { pending = false; playing = false; onState(false); }
    });
  };
  const error = () => { if (disposed || failed) return; generation++; cancelPreparation(); desired = false; failed = true; pending = false; playing = false; video.pause(); onState(false); onError(); };
  video.addEventListener('error', error);
  return { update,
    resetSource: () => {
      if (disposed) return;
      resumeAt = video.currentTime > 0 ? video.currentTime : resumeAt;
      generation++; cancelPreparation(); pending = false; playing = false; failed = false;
      video.pause(); onState(false); video.removeAttribute('src'); video.load();
    },
    dispose: () => { disposed = true; desired = false; generation++; cancelPreparation(); video.pause(); onState(false); video.removeEventListener('error', error); } };
}
interface ControllerOptions extends Partial<PlaybackOptions> {
  host?: HTMLElement;
  trigger: VideoTrigger;
  visibilityThreshold?: number;
  /** Feste Mindestbreite in CSS-Pixeln für API-Aufrufer; für responsive Layouts autoMediaQuery verwenden. */
  minAutoWidth?: number;
  /** Media Query passend zum Layout. Hat Vorrang vor dem festen Pixelvertrag minAutoWidth. */
  autoMediaQuery?: string;
}
export function createVideoController(video: HTMLVideoElement, {
  host = video.parentElement!, trigger, visibilityThreshold = 0.2, minAutoWidth = 0,
  autoMediaQuery = `(min-width: ${minAutoWidth}px)`,
  source = () => (matchMedia(VIDEO_MOBILE_QUERY).matches && video.dataset.srcSmall) || video.dataset.src!, onState, onError,
}: ControllerOptions) {
  const playback = createPlayback(video, { source, onState, onError });
  const width = matchMedia(autoMediaQuery), pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let visible = false, hovered = false, focused = false, choice: boolean | null = null, policy = getMotionPolicy();
  const sync = () => playback.update(videoWanted({ trigger, policy, visible, choice, hovered: hovered || focused, touch: !pointer.matches, wide: width.matches }));
  const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') { hovered = true; sync(); } };
  const leave = () => { hovered = false; sync(); };
  const focus = () => { focused = true; sync(); };
  const blur = (event: FocusEvent) => { focused = host.contains(event.relatedTarget as Node); sync(); };
  if (trigger === 'hover') { host.addEventListener('pointerenter', enter); host.addEventListener('pointerleave', leave); host.addEventListener('focusin', focus); host.addEventListener('focusout', blur); }
  width.addEventListener('change', sync); pointer.addEventListener('change', sync);
  const unsubscribe = subscribeMotionPolicy((value) => { policy = value; sync(); });
  const unobserve = observeVisibility(host, (value) => { visible = value; sync(); }, visibilityThreshold);
  return {
    setChoice: (value: boolean | null) => { choice = value; sync(); },
    // Keep the same policy, visibility observer and manual choice during a rendition change.
    refreshSource: () => { playback.resetSource(); sync(); },
    dispose: () => { unsubscribe(); unobserve(); width.removeEventListener('change', sync); pointer.removeEventListener('change', sync);
      host.removeEventListener('pointerenter', enter); host.removeEventListener('pointerleave', leave); host.removeEventListener('focusin', focus); host.removeEventListener('focusout', blur); playback.dispose(); },
  };
}

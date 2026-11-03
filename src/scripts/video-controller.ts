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
interface PlaybackOptions { source: () => string; onState?: (playing: boolean) => void; onError?: () => void }
/** Die Generation verhindert, dass ein spätes play()-Promise einen inzwischen pausierten Film wieder freigibt. */
export function createPlayback(video: HTMLVideoElement, { source, onState = () => {}, onError = () => {} }: PlaybackOptions) {
  let desired = false, playing = false, pending = false, failed = false, disposed = false, generation = 0;
  const update = (want: boolean) => {
    if (disposed || failed) return;
    desired = want;
    if (!want) { generation++; pending = false; playing = false; video.pause(); onState(false); return; }
    if (pending || playing) return;
    if (!video.src) video.src = source();
    const request = ++generation;
    pending = true;
    Promise.resolve().then(() => {
      if (disposed || !desired || request !== generation) return;
      return video.play();
    }).then(() => {
      if (disposed || !desired || request !== generation) { if (!desired || disposed) video.pause(); return; }
      pending = false; playing = true; onState(true);
    }).catch(() => { if (request === generation && !disposed) { pending = false; playing = false; onState(false); } });
  };
  const error = () => { generation++; desired = false; failed = true; pending = false; playing = false; video.pause(); onState(false); onError(); };
  video.addEventListener('error', error);
  return { update, dispose: () => { disposed = true; desired = false; generation++; video.pause(); onState(false); video.removeEventListener('error', error); } };
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
    dispose: () => { unsubscribe(); unobserve(); width.removeEventListener('change', sync); pointer.removeEventListener('change', sync);
      host.removeEventListener('pointerenter', enter); host.removeEventListener('pointerleave', leave); host.removeEventListener('focusin', focus); host.removeEventListener('focusout', blur); playback.dispose(); },
  };
}

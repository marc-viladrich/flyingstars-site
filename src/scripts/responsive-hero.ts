import { createVideoController, VIDEO_MOBILE_QUERY, type VideoTrigger } from './video-controller';
import { chooseVideo } from './video-lab-selection.mjs';
interface Rendition { id:string; src:string; codec:string; contentType:string; width:number; height:number; bitrate:number; fps:number; }
interface Pair { preferred:Rendition; fallback:Rendition; }
export interface HeroSources { desktop:Pair; mobile:Pair; }
export async function mountResponsiveHero(reel: HTMLVideoElement, sources:HeroSources, {
  trigger = 'ambient', onSelected = (_video:Rendition, _reason:string)=>{}, onState = (_on:boolean)=>{},
} = {} as {trigger?:VideoTrigger;onSelected?:(video:Rendition,reason:string)=>void;onState?:(on:boolean)=>void;}) {
  const mobile=matchMedia(VIDEO_MOBILE_QUERY).matches, pair=mobile?sources.mobile:sources.desktop;
  let chosen=await chooseVideo(pair,navigator.mediaCapabilities);
  // Resize during the short probe must never assign a desktop file to the newly mobile layout.
  const nowMobile=matchMedia(VIDEO_MOBILE_QUERY).matches, actualPair=nowMobile?sources.mobile:sources.desktop;
  if(nowMobile!==mobile)chosen=actualPair.fallback;
  const host=reel.closest<HTMLElement>('[data-reel-host]')??reel.parentElement!;
  let controller:ReturnType<typeof createVideoController>|undefined, retried=false, disposed=false;
  const start=(video:Rendition,reason:string)=>{
    if(disposed)return;
    controller?.dispose();reel.pause();reel.removeAttribute('src');reel.load();host.classList.remove('reel-on');
    onSelected(video,reason);
    controller=createVideoController(reel,{host,trigger,source:()=>video.src,onState:on=>{if(on)host.classList.add('reel-on');onState(on);},onError:()=>{
      host.classList.remove('reel-on');
      if(video.codec!=='h264'&&!retried){retried=true;start(actualPair.fallback,'H.264 nach Wiedergabefehler');}
      else onSelected(video,'Wiedergabe fehlgeschlagen, Standbild bleibt sichtbar');
    }});
  };
  start(chosen,chosen.codec==='av1'?'AV1: flüssig und energieeffizient gemeldet':'H.264: sicherer Rückfallpfad');
  return {setChoice:(value:boolean|null)=>controller?.setChoice(value),dispose:()=>{disposed=true;controller?.dispose();}};
}

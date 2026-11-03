import { createVideoController } from './video-controller';
import { mountResponsiveHero } from './responsive-hero';
const data=JSON.parse(document.querySelector('#lab-hero-data')!.textContent!);
const reel=document.querySelector<HTMLVideoElement>('video[data-lab-video]')!, host=reel.closest<HTMLElement>('[data-reel-host]')!;
const state=document.querySelector<HTMLElement>('#lab-state')!, button=document.querySelector<HTMLButtonElement>('#lab-play')!;
let controller:ReturnType<typeof createVideoController>|undefined;
function start(video:any){
 controller?.dispose();reel.pause();reel.removeAttribute('src');reel.load();host.classList.remove('reel-on');reel.dataset.src=reel.dataset.srcSmall=video.src;
 const mb=(video.bytes/1e6).toLocaleString('de-DE',{maximumFractionDigits:2});
 state.textContent=`Feste Auswahl: ${video.label} · ${video.width} × ${video.height} · ${mb} MB · ${video.duration.toLocaleString('de-DE')} s`;
 controller=createVideoController(reel,{host,trigger:'manual',onState:on=>{if(on)host.classList.add('reel-on');button.textContent=on?'Pausieren':'Abspielen';},onError:()=>{
  host.classList.remove('reel-on');
  state.textContent=`${video.label} ist auf diesem Gerät nicht abspielbar oder die Datei konnte nicht geladen werden. Kein unbemerkter Codec-Wechsel. Nutze „Original“ zum H.264-Vergleich.`;
 }});
}
button.addEventListener('click',()=>{if(!controller)return;if(reel.paused){controller.setChoice(true);button.textContent='Pausieren';}else{controller.setChoice(false);button.textContent='Abspielen';}});
async function init(){
 const choice=data.video;
 if(document.readyState!=='complete')await new Promise(resolve=>addEventListener('load',resolve,{once:true}));
 if(choice)start(choice);
 else controller=await mountResponsiveHero(reel,data.sources,{trigger:'manual',onSelected:(video,reason)=>{state.textContent=`${reason}: ${video.width} × ${video.height} · ${(data.videos.find((v:any)=>v.id===video.id).bytes/1e6).toLocaleString('de-DE',{maximumFractionDigits:2})} MB`;},onState:on=>{button.textContent=on?'Pausieren':'Abspielen';}});
}
init().catch(()=>{state.textContent='Die Auswahl konnte nicht vorbereitet werden. Öffne das Original über den Link.';});

import {failure} from './native-store.mjs';
const languages={en:'English',nl:'Nederlands'};
/** Optional LibreTranslate-compatible service. No remote service is contacted by default. */
export class NativeTranslation {
 constructor({url,key,fetcher=fetch}={}){
  this.url=url;this.key=key;this.fetcher=fetcher;
  if(url){const target=new URL(url);if(target.protocol!=='https:'&&!(target.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(target.hostname)))throw Error('Übersetzungsdienst benötigt HTTPS oder Loopback.');}
 }
 status(){return{available:!!this.url,languages,provider:this.url?'Konfigurierter Übersetzungsdienst':null,message:this.url?'Vorschläge benötigen manuelle Prüfung.':'Kein Übersetzungsdienst konfiguriert. Manuelle Fassungen lassen sich als Entwurf pflegen.'};}
 async suggest({text,locale}){
  if(typeof text!=='string'||!text.trim()||text.length>8000||!Object.hasOwn(languages,locale))throw failure('Ungültiger Übersetzungsauftrag.');
  if(!this.url)throw failure('Kein Übersetzungsdienst konfiguriert. Es wurde nichts übertragen.',503);
  let response;try{response=await this.fetcher(this.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({q:text,source:'de',target:locale,format:'text',...(this.key?{api_key:this.key}:{})}),signal:AbortSignal.timeout(10000)});}catch{throw failure('Der Übersetzungsdienst ist nicht erreichbar. Bitte erneut versuchen oder manuell bearbeiten.',502);}
  if(!response.ok)throw failure('Der Übersetzungsdienst hat den Auftrag abgelehnt.',502);
  const data=await response.json();
  if(typeof data.translatedText!=='string'||!data.translatedText.trim()||data.translatedText.length>16000)throw failure('Der Übersetzungsdienst lieferte keinen gültigen Vorschlag.',502);
  return{text:data.translatedText,locale,status:'unreviewed'};
 }
}

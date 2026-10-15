// Machine translation providers behind one contract, chosen by EDITOR_TRANSLATION_PROVIDER.
//   translate({ source, target, texts }) → { texts, billedCharacters }
// Texts are plain prose segments (markup and URLs are protected by the caller). Keys stay on the server.
import { failure } from "./native-store.mjs";

const timeout = (ms) => AbortSignal.timeout(ms);

// MyMemory (Translated, Italy): no key, ~5,000 characters/day anonymously (50,000 with MYMEMORY_EMAIL).
// For testing the pipeline only: its translation memory can return community matches.
export function mymemory({ email, fetcher = fetch } = {}) {
  return {
    id: "mymemory",
    label: "MyMemory (Test)",
    maxChars: 450, // UTF-8 bytes per request (MyMemory limit ~500)
    async translate({ source, target, texts }) {
      const out = new Array(texts.length);
      // A few requests in parallel; MyMemory translates one segment per request.
      let next = 0;
      const errors = [];
      const worker = async () => {
        while (next < texts.length) {
          const index = next++;
          try {
            out[index] = await one(texts[index]);
          } catch (error) {
            out[index] = null;
            errors.push(error.message);
            if (error.status === 429) next = texts.length; // quota gone: stop asking
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, texts.length) }, worker));
      const billed = texts.reduce((n, t, i) => n + (out[i] ? [...t].length : 0), 0);
      return { texts: out, billedCharacters: billed, errors };
      async function one(text) {
        const url = new URL("https://api.mymemory.translated.net/get");
        url.searchParams.set("q", text);
        url.searchParams.set("langpair", `${source}|${target}`);
        if (email) url.searchParams.set("de", email);
        const response = await fetcher(url, { signal: timeout(15000) });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.responseStatus !== 200 || typeof data?.responseData?.translatedText !== "string")
          throw failure("MyMemory hat den Auftrag abgelehnt" + (data?.responseDetails ? ": " + data.responseDetails : "."), 502);
        if (data.quotaFinished) throw failure("MyMemory-Tageskontingent ist aufgebraucht.", 429);
        return data.responseData.translatedText;
      }
    },
  };
}

// DeepL REST API. Keys ending in ":fx" use the free host. Up to 50 texts per request.
export function deepl({ key, fetcher = fetch } = {}) {
  if (!key) return null;
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const targetCode = { en: "EN-GB", nl: "NL", de: "DE" };
  return {
    id: "deepl",
    label: "DeepL",
    maxChars: 5000,
    async translate({ source, target, texts }) {
      const out = new Array(texts.length).fill(null);
      const errors = [];
      let billed = 0;
      for (let i = 0; i < texts.length; i += 50) {
        const batch = texts.slice(i, i + 50);
        try {
        const response = await fetcher(host + "/v2/translate", {
          method: "POST",
          headers: { Authorization: "DeepL-Auth-Key " + key, "content-type": "application/json" },
          body: JSON.stringify({ text: batch, source_lang: source.toUpperCase(), target_lang: targetCode[target] || target.toUpperCase(), show_billed_characters: true }),
          signal: timeout(20000),
        });
        if (response.status === 456) throw failure("DeepL-Kontingent ist aufgebraucht.", 429);
        const data = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data?.translations)) throw failure("DeepL hat den Auftrag abgelehnt.", 502);
        data.translations.forEach((translation, j) => {
          out[i + j] = translation.text;
          billed += translation.billed_characters ?? [...translation.text].length;
        });
        } catch (error) {
          errors.push(error.message);
          break;
        }
      }
      return { texts: out, billedCharacters: billed, errors };
    },
  };
}

// LibreTranslate-compatible endpoint (self-hosted or EU instance), as before.
export function libretranslate({ url, key, fetcher = fetch } = {}) {
  if (!url) return null;
  return {
    id: "libretranslate",
    label: "LibreTranslate (lokal)",
    maxChars: 5000,
    batchChars: 1500, // smaller requests, finer progress in the editor

    async translate({ source, target, texts }) {
      // Several small requests in parallel: a self-hosted instance translates them on separate threads.
      const groups = [];
      for (let i = 0, size = 0; i < texts.length; i++) {
        if (!groups.length || size > 400) groups.push([]), (size = 0);
        groups.at(-1).push(i);
        size += [...texts[i]].length;
      }
      const out = new Array(texts.length).fill(null),
        errors = [];
      let next = 0;
      const worker = async () => {
        while (next < groups.length) {
          const group = groups[next++];
          try {
            const response = await fetcher(url, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ q: group.map((i) => texts[i]), source, target, format: "text", ...(key ? { api_key: key } : {}) }),
              signal: timeout(60000),
            });
            const data = await response.json().catch(() => null);
            const translated = Array.isArray(data?.translatedText) ? data.translatedText : null;
            if (!response.ok || !translated || translated.length !== group.length) throw failure("Der Übersetzungsdienst hat den Auftrag abgelehnt.", 502);
            group.forEach((i, j) => (out[i] = translated[j]));
          } catch (error) {
            errors.push(error.message);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, groups.length) }, worker));
      return { texts: out, billedCharacters: texts.reduce((n, t, i) => n + (out[i] ? [...t].length : 0), 0), errors };
    },
  };
}

// Deterministic OFFLINE test/demo provider. Never use it for production translation.
export function fake() {
  return {id:'fake',label:'Fake (nur Tests)',maxChars:5000,async translate({target,texts}) {
    if (!['en','nl'].includes(target)) throw Error('Fake unterstützt nur EN/NL.');
    return {texts:texts.map(text=>`[${target.toUpperCase()}] ${text}`),billedCharacters:texts.reduce((sum,text)=>sum+text.length,0)};
  }};
}
const factories = { mymemory, deepl, libretranslate, fake };
export function translationProvider(name, options = {}) {
  const chosen = name || (options.url ? "libretranslate" : null);
  if (!chosen || chosen === "none") return null;
  const factory = factories[chosen];
  if (!factory) throw Error("Unbekannter Übersetzungsanbieter: " + chosen);
  return factory(options);
}

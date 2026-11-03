export function createTranslator(locale?: string): ((key: string, values?: Record<string, unknown>) => string) & {afeAddress:(key:string)=>{owner:{collection:string;id:string};part:string;path:string[];mode:string}};
export function t(key: string, values?: Record<string, unknown>): string;
export function messagesForLocale(locale: string): Record<string, Record<string, string>>;

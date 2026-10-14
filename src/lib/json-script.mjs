// JSON inside a script element must not contain HTML's closing-script delimiter.
export const jsonScript = value => JSON.stringify(value).replace(/</g,()=>String.fromCharCode(92)+'u003c');

// Lossless columns: second differences for smooth coordinates, first differences for colour/region ids.
const binaryOf=bytes=>{let out='';for(let i=0;i<bytes.length;i+=16384)out+=String.fromCharCode(...bytes.slice(i,i+16384));return out;};
export function encodePoints(points) {
 const bytes=[],put=v=>{while(v>127){bytes.push((v&127)|128);v>>>=7;}bytes.push(v);};
 put(points.length/5);
 for(let column=0;column<5;column++){
  let previous=0,lastDelta=0;
  for(let i=column;i<points.length;i+=5){const delta=points[i]-previous,difference=column<2?delta-lastDelta:delta;previous=points[i];lastDelta=delta;put((difference<<1)^(difference>>31));}
 }
 return 'm:'+btoa(binaryOf(bytes));
}
export function decodePoints(packed) {
 if(Array.isArray(packed))return packed;
 if(packed.startsWith('c:')||packed.startsWith('m:')){
  const bytes=atob(packed.slice(2));let position=0;
  const take=()=>{let value=0,shift=0,byte;do{if(position>=bytes.length||shift>28)throw new Error('Invalid prepared point payload');byte=bytes.charCodeAt(position++);value|=(byte&127)<<shift;shift+=7;}while(byte&128);return value>>>0;};
  const count=take();if(count>bytes.length)throw new Error('Invalid prepared point count');
  const out=new Array(count*5);
  for(let column=0;column<5;column++){
   let previous=0,lastDelta=0;
   for(let i=0;i<count;i++){const value=take();const difference=(value>>>1)^-(value&1);lastDelta=packed[0]==='c'||column<2?lastDelta+difference:difference;previous+=lastDelta;out[i*5+column]=previous;}
  }
  if(position!==bytes.length)throw new Error('Invalid prepared point payload');return out;
 }
 // Earlier v2 interleaved first differences, retained for interrupted generation runs.
 const bytes=atob(packed),out=[],previous=[0,0,0,0,0];let v=0,shift=0;
 for(let i=0;i<bytes.length;i++){const byte=bytes.charCodeAt(i);v|=(byte&127)<<shift;if(byte&128){shift+=7;continue;}const j=out.length%5;previous[j]+=(v>>>1)^-(v&1);out.push(previous[j]);v=0;shift=0;}
 if(shift||out.length%5)throw new Error('Invalid prepared point payload');return out;
}

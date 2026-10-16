import {parseDocument, parse as parseYaml, isMap, isSeq, isScalar, isAlias, stringify} from 'yaml';
import {isDeepStrictEqual} from 'node:util';

export const sourceError = message => Object.assign(new Error('AFE105: '+message), {code:'AFE105', status:400});
export const safePath = path => Array.isArray(path) && path.every(key => typeof key === 'string' && !['__proto__','constructor','prototype'].includes(key) || Number.isInteger(key) && key >= 0);
export const atPath = (value, path) => path.reduce((node, key) => node?.[key], value);
const textOf = bytes => {
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  if (Buffer.isBuffer(bytes) && !Buffer.from(text).equals(bytes)) throw sourceError('Die Quelle ist kein gültiges UTF-8.');
  return text;
};
const output = (original, text) => Buffer.isBuffer(original) ? Buffer.from(text) : text;
const splice = (text, start, end, value) => text.slice(0,start)+value+text.slice(end);
const lineStart = (text, pos) => text.lastIndexOf('\n',pos-1)+1;
const eolOf = text => text.includes('\r\n') ? '\r\n' : '\n';

function jsonTree(text) {
  JSON.parse(text);
  let pos=0;
  const space=()=>{while (/\s/.test(text[pos]||'') && pos<text.length) pos++;};
  const string=()=>{const start=pos++;while(text[pos]!=='"'){if(text[pos]==='\\')pos++;pos++;}pos++;return JSON.parse(text.slice(start,pos));};
  function node() {
    space();const start=pos, children=[];let value, kind;
    if(text[pos]==='{' || text[pos]==='['){
      kind=text[pos++]==='{'?'map':'seq';value=kind==='map'?Object.create(null):[];space();
      while(text[pos]!=='}' && text[pos]!==']'){
        space();const keyStart=pos,key=kind==='map'?string():children.length;
        if(kind==='map'){space();pos++;if(children.some(c=>c.key===key))throw sourceError('Doppelter JSON-Schlüssel: '+key);}
        const child=node();children.push({key,keyStart,node:child});value[key]=child.value;space();if(text[pos]!==',')break;pos++;
      }
      pos++;
    }else if(text[pos]==='"'){value=string();kind='scalar';}
    else {while(pos<text.length&&!/[\s,}\]]/.test(text[pos]))pos++;value=JSON.parse(text.slice(start,pos));kind='scalar';}
    return {start,end:pos,value,kind,children,flow:true};
  }
  const tree=node();
  // Ordinary objects at the API boundary, including keys named constructor.
  tree.value=JSON.parse(text);
  return tree;
}

function yamlTree(text, allowFlowRoot = false) {
  const doc=parseDocument(text,{keepSourceTokens:true,uniqueKeys:true,strict:true});
  if(doc.errors.length)throw sourceError('Ungültiges YAML: '+doc.errors[0].message);
  if(doc.warnings.length)throw sourceError('Nicht unterstütztes YAML: '+doc.warnings[0].message);
  function convert(node) {
    if(isAlias(node))throw sourceError('YAML-Aliase sind nicht schreibbar.');
    if(node?.anchor)throw sourceError('YAML-Anker sind nicht schreibbar.');
    if(node?.tag)throw sourceError('YAML-Tags sind nicht schreibbar.');
    const children=[];
    if(isMap(node))for(const pair of node.items){
      if(!isScalar(pair.key)||typeof pair.key.value!=='string')throw sourceError('YAML benötigt einfache Zeichenketten als Schlüssel.');
      if(pair.key.value==='<<')throw sourceError('YAML-Merge-Schlüssel sind nicht schreibbar.');
      convert(pair.key);
      children.push({key:pair.key.value,keyStart:pair.key.range[0],node:convert(pair.value),pair});
    }
    if(isSeq(node))node.items.forEach((item,key)=>children.push({key,keyStart:item?.range?.[0],node:convert(item)}));
    return {start:node?.range?.[0],end:node?.range?.[1],value:node?.toJSON()??null,kind:isMap(node)?'map':isSeq(node)?'seq':'scalar',children,flow:!!node?.flow,original:node};
  }
  if(doc.contents?.flow && !allowFlowRoot)throw sourceError('YAML-Flow-Wurzeln sind nicht schreibbar; verwende Block-YAML.');
  return convert(doc.contents);
}

function findNode(tree, path) {
  let node=tree;
  for(const key of path){node=node?.children.find(child=>child.key===key)?.node;if(!node)return null;}
  return node;
}

function serialize(value, format, text, node) {
  if(format==='json'){
    const indent=/\n([ \t]+)\S/.exec(text)?.[1]??'  ';
    const encoded=JSON.stringify(value,null,indent);
    if(encoded===undefined)throw sourceError('Dieser Wert ist kein JSON-Wert.');
    const prefix=text.slice(lineStart(text,node.start),node.start).match(/^\s*/)[0];
    return encoded.replaceAll('\n',eolOf(text)+prefix);
  }
  // A string that replaces an unquoted string stays unquoted when it reads back as the same string.
  if(typeof value==='string'&&!node.flow&&node.original?.type==='PLAIN'&&!/[\r\n]/.test(value)){
    const plain=stringify(value,{lineWidth:0}).trimEnd();
    // Commas and brackets would end a value inside an inline {…} or […] collection.
    if(!/[\r\n,[\]{}]/.test(plain)&&!/^['"]/.test(plain)&&parseYaml(plain)===value)return plain;
  }
  // Other scalars use JSON's YAML-compatible spelling, avoiding implicit type changes,
  // line folding and indent-dependent multiline strings.
  if(value===null || typeof value!=='object')return JSON.stringify(value);
  if(node.flow || node.kind==='scalar')return JSON.stringify(value);
  const col=node.start-lineStart(text,node.start);
  return stringify(value,{lineWidth:0}).trimEnd().replaceAll('\n',eolOf(text)+' '.repeat(col));
}

function removeChild(text,parent,key,format) {
  const index=parent.children.findIndex(child=>child.key===key);
  if(index<0)return text;
  const child=parent.children[index],next=parent.children[index+1],previous=parent.children[index-1];
  if(format==='json'||parent.flow){
    if(next)return splice(text,child.keyStart,next.keyStart,'');
    if(previous)return splice(text,previous.node.end,child.node.end,'');
    return splice(text,child.keyStart,child.node.end,'');
  }
  if(parent.children.length===1)return splice(text,parent.start,parent.end,(parent.kind==='map'?'{}':'[]')+(text.slice(parent.start,parent.end).endsWith('\n')?eolOf(text):''));
  let start=child.keyStart??child.node.start;
  if(parent.kind==='seq')start=parent.original.srcToken.items[index].start.find(token=>token.type==='seq-item-ind').offset;
  const prefix=text.slice(lineStart(text,start),start);
  let end=child.node.original?.range?.[2]??child.node.end??start;
  // Scalar end excludes its line break; collection end already includes it.
  if(!text.slice(start,end).endsWith('\n')){const newline=text.indexOf('\n',end);end=newline<0?text.length:newline+1;}
  if(/^\s*$/.test(prefix))start=lineStart(text,start);
  else if(/^\s*-\s+$/.test(prefix)&&next){
    // First property of a compact sequence mapping: retain the sequence marker.
    end=next.keyStart;
  }else if(/^\s*-\s+$/.test(prefix))return splice(text,start,end,'{}'+eolOf(text));
  return splice(text,start,end,'');
}

function addChild(text,parent,key,value,format) {
  if(parent.kind==='seq'){
    if(key!==parent.children.length)throw sourceError('Neue Array-Werte müssen am Ende eingefügt werden.');
  }else if(parent.kind!=='map')throw sourceError('Das übergeordnete Feld ist kein Objekt.');
  if(format==='json'||parent.flow){
    const end=parent.end-1,last=parent.children.at(-1),encoded=JSON.stringify(value);
    const entry=parent.kind==='map'?JSON.stringify(key)+': '+encoded:encoded;
    if(!last)return splice(text,end,end,entry);
    const tail=text.slice(last.node.end,end);
    return splice(text,last.node.end,end,','+(/\n/.test(tail)?eolOf(text)+text.slice(lineStart(text,last.keyStart),last.keyStart).match(/^\s*/)[0]:' ')+entry+tail);
  }
  const indent=parent.start-lineStart(text,parent.start),eol=eolOf(text);
  const entry=stringify(parent.kind==='map'?{[key]:value}:[value],{lineWidth:0}).trimEnd().replaceAll('\n',eol+' '.repeat(indent));
  const end=parent.end;
  return splice(text,end,end,(text[end-1]==='\n'?'':eol)+' '.repeat(indent)+entry+eol);
}

function edit(text,path,value,format,allowFlowRoot=false) {
  const tree=format==='json'?jsonTree(text):yamlTree(text,allowFlowRoot),node=findNode(tree,path);
  if(node && isDeepStrictEqual(node.value,value))return text;
  if(value===undefined&&!node)return text;
  if(value===undefined){if(!path.length)throw sourceError('Ein Dokument kann nicht als Feld entfernt werden.');return removeChild(text,findNode(tree,path.slice(0,-1)),path.at(-1),format);}
  if(!node){
    // Create absent intermediate objects through the nearest existing ancestor.
    const parentPath=path.slice(0,-1),parent=findNode(tree,parentPath);
    if(!parent){
      const ancestor=parentPath.slice(),missing=[path.at(-1)];
      while(!findNode(tree,ancestor))missing.unshift(ancestor.pop());
      let nested=value;
      for(let i=missing.length-1;i>0;i--){const key=missing[i];if(typeof key==='number'){if(key!==0)throw sourceError('Neue Arrays dürfen keine Lücken enthalten.');nested=[nested];}else nested={[key]:nested};}
      return edit(text,[...ancestor,missing[0]],nested,format,allowFlowRoot);
    }
    return addChild(text,parent,path.at(-1),value,format,allowFlowRoot);
  }
  // Root/entry replacements reconcile members so sibling formatting survives.
  if(node.kind==='map' && value && !Array.isArray(value) && typeof value==='object'){
    for(const key of Object.keys(node.value))if(!Object.hasOwn(value,key))text=edit(text,[...path,key],undefined,format,allowFlowRoot);
    for(const [key,child]of Object.entries(value))text=edit(text,[...path,key],child,format,allowFlowRoot);
    return text;
  }
  if(node.kind==='seq' && Array.isArray(value) && node.children.length===value.length){
    for(let i=0;i<value.length;i++)text=edit(text,[...path,i],value[i],format,allowFlowRoot);
    return text;
  }
  if(node.start===undefined)return stringify(value,{lineWidth:0});
  let replacement=serialize(value,format,text,node);
  if(format==='yaml'&&node.original?.srcToken?.type==='block-scalar'){const props=node.original.srcToken.props;replacement+=props.slice(1).filter(token=>token.type==='space'||token.type==='comment').map(token=>token.source).join('');}
  if(format==='yaml'&&node.start===node.end){if(/[:-]/.test(text[node.start-1]??''))replacement=' '+replacement;if(text[node.end]==='#')replacement+=' ';}
  if(format==='yaml'&&text.slice(node.start,node.end).endsWith('\n'))replacement+=eolOf(text);
  return splice(text,node.start,node.end,replacement);
}

function move(text,path,from,to,format,allowFlowRoot=false){
  const tree=format==='json'?jsonTree(text):yamlTree(text,allowFlowRoot),node=findNode(tree,path);
  if(node?.kind!=='seq'||![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<node.children.length))throw sourceError('Ungültige Reihenfolge.');
  if(from===to)return text;
  if(format==='json'||node.flow){
    const values=node.children.map(child=>text.slice(child.node.start,child.node.end));
    values.splice(to,0,values.splice(from,1)[0]);
    for(let i=node.children.length-1;i>=0;i--)text=splice(text,node.children[i].node.start,node.children[i].node.end,values[i]);
    return text;
  }
  const starts=node.children.map((child,index)=>{
    const tokens=node.original.srcToken.items[index].start;
    const start=tokens.find(token=>token.type==='comment'||token.type==='seq-item-ind')?.offset;
    if(start===undefined)throw sourceError('Diese YAML-Reihenfolge benötigt Block-Sequenzeinträge.');
    return lineStart(text,start);
  });
  const endsWithNewline=text.slice(starts[0],node.end).endsWith('\n');
  const chunks=starts.map((start,i)=>text.slice(start,starts[i+1]??node.end).replace(/\r?\n$/,''));
  chunks.splice(to,0,chunks.splice(from,1)[0]);
  return splice(text,starts[0],node.end,chunks.join(eolOf(text))+(endsWithNewline?eolOf(text):''));
}

function codec(format,allowFlowRoot=false){
  return {
    parse(bytes){const text=textOf(bytes);return (format==='json'?jsonTree(text):yamlTree(text,allowFlowRoot)).value;},
    create(value){return format==='json'?JSON.stringify(value,null,2)+'\n':stringify(value,{lineWidth:0});},
    update(bytes,path,value){if(!safePath(path))throw sourceError('Ungültiger Feldpfad.');const text=edit(textOf(bytes),path,value,format,allowFlowRoot);this.parse(text);return output(bytes,text);},
    move(bytes,path,from,to){if(!safePath(path))throw sourceError('Ungültiger Feldpfad.');const text=move(textOf(bytes),path,from,to,format,allowFlowRoot);this.parse(text);return output(bytes,text);},
  };
}
export const json=codec('json');
export const yaml=codec('yaml');
// Markdown is a whole document, including legacy flow-style frontmatter.
// AFE105's flow-root restriction applies to shared YAML sources.
const frontYaml=codec('yaml',true);
function frontmatter(bytes){
  const text=textOf(bytes),match=/^(\uFEFF?---[ \t]*\r?\n)([\s\S]*?)(^---[ \t]*(?:\r?\n|$))/m.exec(text);
  if(!match||match.index!==0)throw sourceError('Markdown benötigt YAML-Frontmatter.');
  return {text,start:match[1].length,end:match[1].length+match[2].length,bodyStart:match[0].length};
}
export const markdown={
  parse(bytes){const f=frontmatter(bytes),data=frontYaml.parse(f.text.slice(f.start,f.end));if(!data||Array.isArray(data)||typeof data!=='object')throw sourceError('Frontmatter benötigt ein Objekt.');if(Object.hasOwn(data,'body'))throw sourceError('Frontmatter darf das reservierte Feld body nicht enthalten.');return {...data,body:f.text.slice(f.bodyStart)};},
  create(value){const {body='',...front}=value;return '---\n'+frontYaml.create(front)+'---\n'+body;},
  update(bytes,path,value){
    if(!safePath(path))throw sourceError('Ungültiger Feldpfad.');
    const f=frontmatter(bytes);let text=f.text;
    if(!path.length){const {body='',...front}=value;const updated=frontYaml.update(text.slice(f.start,f.end),[],front);text=text.slice(0,f.start)+updated+text.slice(f.end,f.bodyStart)+body;}
    else if(path[0]==='body'){if(path.length!==1||typeof value!=='string')throw sourceError('Der Markdown-Body muss Text sein.');text=text.slice(0,f.bodyStart)+value;}
    else text=splice(text,f.start,f.end,frontYaml.update(text.slice(f.start,f.end),path,value));
    this.parse(text);return output(bytes,text);
  },
  move(bytes,path,from,to){const f=frontmatter(bytes);return output(bytes,splice(f.text,f.start,f.end,frontYaml.move(f.text.slice(f.start,f.end),path,from,to)));},
};
export const codecs=Object.freeze({json,yaml,markdown});

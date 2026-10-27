const fs=require('fs');
const source=JSON.parse(fs.readFileSync('docs/mobile-arabic-coverage.json','utf8')).remaining;
const file='src/i18n/interfaceCopy.json';let dictionary=JSON.parse(fs.readFileSync(file,'utf8'));
const norm=s=>s.replace(/\s+/g,' ').trim().toLowerCase();
const pending=source.filter(r=>!dictionary[norm(r.text)]?.ar||dictionary[norm(r.text)].ar===r.text);
const batches=[];let batch=[],length=0;for(const row of pending){const text=row.text;if(length+text.length>3200&&batch.length){batches.push(batch);batch=[];length=0;}batch.push(text);length+=text.length+16;}if(batch.length)batches.push(batch);
(async()=>{let done=0;for(const [batchIndex,items]of batches.entries()){
 const slotsByItem=items.map(s=>s.match(/\{\{?\w+\}?\}/g)||[]); const text=items.map((s,i)=>{let slot=0;return '[['+String(i).padStart(6,'0')+']] '+s.replace(/\{\{?\w+\}?\}/g,()=> '⟦'+(slot++)+'⟧');}).join('\n');const url=new URL('https://translate.googleapis.com/translate_a/single');for(const[k,v]of Object.entries({client:'gtx',sl:'en',tl:'ar',dt:'t',q:text}))url.searchParams.set(k,v);
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Translation request stopped: HTTP '+response.status);
 const data=await response.json();const translated=data[0].map(x=>x[0]||'').join('');const chunks=[...translated.matchAll(/\[\[(\d{6})\]\]\s*([\s\S]*?)(?=\[\[\d{6}\]\]|$)/g)];if(chunks.length!==items.length)throw Error('Batch '+batchIndex+' did not preserve labels');
 for(const [i,match]of chunks.entries()){if(Number(match[1])!==i)throw Error('Label ordering changed');const en=items[i],ar=match[2].trim().replace(/⟦([0-9٠-٩]+)⟧/g,(_,slot)=>slotsByItem[i][Number(slot.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))))]||'INVALID_SLOT');if(!ar)throw Error('Empty translation');const slots=s=>(s.match(/\{\{?\w+\}?\}/g)||[]).sort().join('|');if(slots(en)!==slots(ar))throw Error('Placeholders changed: '+en);dictionary[norm(en)]={...(dictionary[norm(en)]||{en}),ar};done++;}
 fs.writeFileSync(file,JSON.stringify(dictionary,null,2)+'\n');console.log('Arabic batch '+(batchIndex+1)+'/'+batches.length+': '+done+' strings saved');await new Promise(r=>setTimeout(r,300));
 }console.log('Arabic catalogue completed.');})().catch(error=>{console.error(error.message);process.exitCode=1;});

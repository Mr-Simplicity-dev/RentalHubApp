const fs=require('fs'),path=require('path'),crypto=require('crypto');
const folder=path.join(__dirname,'../assets/call-sounds');
const manifest=require('../assets/call-sounds/manifest.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  for(const file of manifest.files){
    if(!/^call_(normal|greeting|ringback)\.wav$/.test(file.name))throw Error('Unexpected call sound');
    const downloadName=file.downloadName||file.name;
    if(!/^call_(normal|greeting|ringback)(?:_v[1-9][0-9]*)?\.wav$/.test(downloadName))throw Error('Unexpected call sound download name');
    const target=path.join(folder,file.name);
    let content=fs.existsSync(target)?fs.readFileSync(target):null;
    if(!content||hash(content)!==file.sha256){
      const response=await fetch('https://rentalhub.com.ng/call-sounds/'+downloadName,{signal:AbortSignal.timeout(15000),redirect:'error'});
      if(!response.ok)throw Error('Call sound download failed: '+file.name);
      content=Buffer.from(await response.arrayBuffer());
      if(content.length!==file.bytes||hash(content)!==file.sha256)throw Error('Call sound integrity check failed: '+file.name);
      fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(target,content);
    }
    if(content.length!==file.bytes||content.toString('ascii',0,4)!=='RIFF')throw Error('Invalid call sound: '+file.name);
    if(process.argv.includes('--web')){
      const web=path.resolve(__dirname,'../../client/public/call-sounds');
      if(!fs.existsSync(path.resolve(__dirname,'../../client/package.json')))throw Error('Expected existing web client');
      fs.mkdirSync(web,{recursive:true});fs.writeFileSync(path.join(web,downloadName),content);
    }
    if(file.name!=='call_ringback.wav'){
      const android=path.join(__dirname,'../android/app/src/main/res/raw');
      fs.mkdirSync(android,{recursive:true});fs.copyFileSync(target,path.join(android,file.name));
    }
  }
  console.log('Call sounds verified and prepared. No APK was built.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});

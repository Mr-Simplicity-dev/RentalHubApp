const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
test('patched query parser preserves Unicode navigation parameters',()=>{
 const query=require('query-string');
 assert.equal(query.parse('name=%D8%A3%D9%85%D8%A7%D9%86%D8%A7').name,'أمانا');
});
test('Metro reads real image files with the patched image-size API',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rentalhub-asset-compat-'));
 try {
  const file=path.join(directory,'test.png');
  fs.writeFileSync(file,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1kAAAAASUVORK5CYII=','base64'));
  const assetsFile=path.join(path.dirname(require.resolve('metro/package.json')),'src/Assets.js');
  const result=await require(assetsFile).getAssetData(file,'test.png',[],null,'/assets');
  assert.equal(result.width,1);assert.equal(result.height,1);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

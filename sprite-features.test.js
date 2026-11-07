const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/index.html','utf8');
for(const m of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
function take(re){const m=source.match(re);assert.ok(m,String(re));return m[0];}
const helper=take(/function drawSpriteFrame\([\s\S]*?\n\}/);
const lookup=take(/function spriteByName\(name\)\{[\s\S]*?\n\}/);
const sprite=take(/  N\('sprite',\(a\)=>\{[\s\S]*?\n  \}\);/);
const anim=take(/  N\('spriteAnim',\(a\)=>\{[^\n]+\}\);/);
const calls=[];
const ctx={imageSmoothingEnabled:true,drawImage:(...a)=>calls.push(['draw',...a]),save:()=>calls.push(['save']),restore:()=>calls.push(['restore']),translate:(...a)=>calls.push(['translate',...a]),scale:(...a)=>calls.push(['scale',...a])};
const img={complete:true,naturalWidth:64,naturalHeight:32};
let now=1000;
const c={state:{sprites:[{name:'hero',img}]},Engine:{camera:{x:10,y:20},startTime:1000},performance:{now:()=>now},gctx:ctx,numArg:(v,d=0)=>v==null?d:Number(v),drawPlaceholder:()=>{throw Error('placeholder');},N:(n,f)=>c[n]=f};
vm.createContext(c);vm.runInContext(helper+'\n'+lookup+'\n'+sprite+'\n'+anim,c);
for(const fx of [false,true])for(const fy of [false,true]){
  for(const animated of [false,true]){
    calls.length=0;now=1125;
    c[animated?'spriteAnim':'sprite'](animated?['hero.png',100,80,64,32,32,32,8,fx,fy]:['hero.png',100,80,64,32,fx,fy]);
    const draw=calls.find(x=>x[0]==='draw');
    assert.deepEqual(draw.slice(2,6),animated?[32,0,32,32]:[0,0,64,32]);
    if(fx||fy){assert.deepEqual(calls.map(x=>x[0]),['save','translate','scale','draw','restore']);assert.deepEqual(calls[1],['translate',90+(fx?64:0),60+(fy?32:0)]);assert.deepEqual(calls[2],['scale',fx?-1:1,fy?-1:1]);assert.deepEqual(draw.slice(6),[0,0,64,32]);}
    else assert.deepEqual(draw.slice(6),[90,60,64,32]);
  }
}
calls.length=0;c.sprite(['hero',0,0]);assert.deepEqual(calls[0].slice(6),[-10,-20,64,32]);
// Test the actual exported functions against the same Canvas contract.
const e={ctx,images:{hero:img},cameraOffset:{x:10,y:20},performance:{now:()=>1125},startTime:1000};
vm.createContext(e);vm.runInContext(helper+'\n'+take(/function spriteImage\(name\)\{[^\n]+\}/)+'\n'+take(/function sprite\(name[^\n]+\}/)+'\n'+take(/function spriteAnim\(name[^\n]+\}/),e);
for(const fx of [false,true])for(const fy of [false,true])for(const animated of [false,true]){
 calls.length=0;e[animated?'spriteAnim':'sprite'](...(animated?['hero.png',100,80,64,32,32,32,8,fx,fy]:['hero.png',100,80,64,32,fx,fy]));
 const draw=calls.find(x=>x[0]==='draw');assert.deepEqual(draw.slice(2,6),animated?[32,0,32,32]:[0,0,64,32]);
 assert.deepEqual(draw.slice(6),fx||fy?[0,0,64,32]:[90,60,64,32]);
 if(fx||fy){assert.deepEqual(calls[1],['translate',90+(fx?64:0),60+(fy?32:0)]);assert.deepEqual(calls[2],['scale',fx?-1:1,fy?-1:1]);assert.equal(calls.at(-1)[0],'restore');}
}
// Exercise real project persistence/restore functions, not duplicated implementations.
const elements={};const element=id=>elements[id]||(elements[id]={textContent:'',title:''});
let stored;
const p={state:{files:{'main.mrr':'old','level.mrr':''},activeFile:'main.mrr',sprites:[],scene:[]},DEFAULT_CODE:'default',codeInput:{value:'old'},document:{getElementById:element},window:{MRRCODE_AI_SPEC:{runtime:{}}},syncCodeToFile:()=>{},renderFiles:()=>p.syncEntryUI(),setNote:()=>{},logConsole:()=>{},localStorage:{setItem:(k,v)=>stored=v,getItem:()=>stored},sanitizeScene:x=>x,renderObjList:()=>{},renderProps:()=>{},renderScenePreview:()=>{}};
vm.createContext(p);
vm.runInContext("let ENTRY_FILE='main.mrr';\n"+take(/function restoreEntryFile\([\s\S]*?\n\}/)+'\n'+take(/function syncEntryUI\([\s\S]*?\n\}/)+'\n'+take(/function setEntryFile\([\s\S]*?\n\}/)+'\n'+take(/function projectData\(\)\{[^\n]+\}/)+'\n'+take(/function saveProjectLocal\(\)\{[^\n]+\}/)+'\n'+take(/function restoreProjectLocal\(\)\{[^\n]+\}/),p);
p.setEntryFile('level.mrr');assert.equal(JSON.parse(stored).entryFile,'level.mrr');assert.equal(element('entryFileChip').textContent,'Точка входа: level.mrr');assert.equal(p.window.MRRCODE_AI_SPEC.runtime.entryFile,'level.mrr');
p.setEntryFile('absent.mrr');assert.equal(p.projectData().entryFile,'level.mrr');
assert.equal(p.restoreProjectLocal(),true);assert.equal(p.projectData().entryFile,'level.mrr');assert.equal(p.state.files['level.mrr'],'');
p.restoreEntryFile({});assert.equal(p.projectData().entryFile,'main.mrr');
p.state.files={'only.mrr':''};p.restoreEntryFile({entryFile:'absent.mrr'});assert.equal(p.projectData().entryFile,'only.mrr');assert.equal(p.state.files['only.mrr'],'');
p.state.files={};p.restoreEntryFile({});assert.equal(p.state.files['main.mrr'],'default');
const registry=JSON.parse(source.match(/window.MRRCODE_API_REGISTRY = (.*);/)[1]);
for(const name of ['sprite','spriteAnim'])assert.match(registry.entries.find(x=>x.name===name).signature,/flipX\?,\s*flipY\?/);
assert.match(source,/row.appendChild\(rename\);\s*const makeMain=/);
assert.match(source,/const active = String\(data.entryFile/);
assert.match(source,/restoreEntryFile\(d\)/);
assert.match(source,/restoreEntryFile\(data\);\s*state.activeFile/);
console.log('sprite features: studio/export flips on both axes, camera/anchor, optional args, entry selection/persistence/fallbacks and registry passed');

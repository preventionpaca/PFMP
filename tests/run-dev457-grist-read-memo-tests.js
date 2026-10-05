const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const code=fs.readFileSync(path.join(__dirname,'..','apps-script','EUC_PFMP_DEV457_GristReadMemo.js'),'utf8');
let passed=0;
function test(name,fn){try{fn();passed++;console.log('OK',name);}catch(e){console.error('KO',name,e);process.exitCode=1;}}
function context(){
  const cache={},props={};let devCalls=0,entCalls=0;
  const c={console,Date,Math,JSON,decodeURIComponent,Object,
    Utilities:{DigestAlgorithm:{SHA_256:'sha'},computeDigest:(_,s)=>Array.from(Buffer.from(s)),base64EncodeWebSafe:a=>Buffer.from(a).toString('base64url')},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>{cache[k]=v;}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v;}})},
    EUC_DEV398_BASE_EUC_DEV190_api_:(m,p,b)=>{devCalls++;return{records:[{id:devCalls,fields:{table:p}}]};},
    EUC_DEV398_BASE_EUC_ENT_grist:(m,p,b)=>{entCalls++;return{records:[{id:entCalls,fields:{table:p}}]};},
    EUC_DEV398_isAccessWrite_:()=>false,EUC_DEV398_invalidateAccessCaches_:()=>{}
  };
  vm.createContext(c);vm.runInContext(code,c);c.calls=()=>({devCalls,entCalls});return c;
}
test('deux lectures identiques ne produisent qu un appel Grist réel',()=>{const c=context(),p='/tables/EUC_ELEVES_PFMP/records?filter=%7B%7D';const a=c.EUC_DEV190_api_('get',p),b=c.EUC_DEV190_api_('get',p);assert.equal(c.calls().devCalls,1);assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));});
test('les deux passerelles utilisent le même principe de mémo',()=>{const c=context(),p='/tables/Classes/records';c.EUC_ENT_grist('get',p);c.EUC_ENT_grist('get',p);assert.equal(c.calls().entCalls,1);});
test('une écriture invalide immédiatement la lecture de sa table',()=>{const c=context(),p='/tables/EUC_AFFECTATIONS_PFMP/records';c.EUC_DEV190_api_('get',p);c.EUC_DEV190_api_('patch',p,{records:[]});c.EUC_DEV190_api_('get',p);assert.equal(c.calls().devCalls,3);});
test('les réponses servies depuis le cache sont clonées',()=>{const c=context(),p='/tables/Classes/records';const a=c.EUC_DEV190_api_('get',p);a.records[0].id=999;const b=c.EUC_DEV190_api_('get',p);assert.equal(b.records[0].id,1);});
test('seules les lectures de structure et de records sont mémorisées',()=>{const c=context();c.EUC_DEV190_api_('get','/sql');c.EUC_DEV190_api_('get','/sql');assert.equal(c.calls().devCalls,2);});
process.on('exit',()=>{if(!process.exitCode)console.log(passed+' tests DEV457 mémo lectures Grist réussis.');});

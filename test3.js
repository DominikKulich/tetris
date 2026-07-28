const fs=require('fs');
let base=fs.readFileSync('game.js','utf8');
const hook=`globalThis.__t={get board(){return board},get piece(){return piece},get state(){return state},
 get score(){return score},get lines(){return lines},get level(){return level},get nextKey(){return nextKey},
 newGame,saveGame,loadGame,resumeGame,lockPiece,collides,gameOver,togglePause,SAVE_KEY};`;
function inject(src){const i=src.lastIndexOf('})();');return src.slice(0,i)+hook+src.slice(i);}
function mkCtx(){return new Proxy({},{get:(o,p)=>p==='createLinearGradient'?()=>({addColorStop(){}}):(typeof p==='string'?()=>{}:undefined),set:()=>true});}
const els={};
function mkEl(id){if(!els[id])els[id]={id,clientWidth:200,clientHeight:400,style:{setProperty(){}},width:0,height:0,
 textContent:'',classList:{c:new Set(),add(x){this.c.add(x)},remove(x){this.c.delete(x)},contains(x){return this.c.has(x)}},
 getContext:()=>mkCtx(),addEventListener(){}};return els[id];}
const LS={s:{},getItem(k){return k in this.s?this.s[k]:null},setItem(k,v){this.s[k]=String(v)},removeItem(k){delete this.s[k]}};
function env(){
 global.document={getElementById:mkEl,addEventListener(){},hidden:false,documentElement:{style:{setProperty(){}}}};
 global.window={devicePixelRatio:1,addEventListener(){},innerHeight:800};
 global.navigator={};global.performance={now:()=>Date.now()};global.requestAnimationFrame=()=>{};
 global.localStorage=LS;global.setInterval=()=>0;global.clearInterval=()=>{};global.clearTimeout=()=>{};
}
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL: '+n));

// --- 1. relace: rozehraj hru ---
env(); eval(inject(base));
let T=globalThis.__t;
T.newGame();
// zamkni par kostek
for(let i=0;i<3;i++){ let g=0; while(!T.collides(T.piece,T.piece.x,T.piece.y+1)&&g++<40) T.piece.y++; T.lockPiece(); }
const snapBoard=JSON.stringify(T.board), snapScore=T.score, snapNext=T.nextKey;
T.saveGame();
ok('ulozeno do localStorage', LS.getItem('tetris_save')!==null);

// --- 2. relace: simuluj znovunacteni stranky ---
env(); eval(inject(base));
T=globalThis.__t;
const d=T.loadGame();
ok('ulozena hra nactena', d!==null);
T.resumeGame(d);
ok('stav play po obnove', T.state==='play');
ok('deska shodna', JSON.stringify(T.board)===snapBoard);
ok('skore shodne', T.score===snapScore);
ok('dalsi kostka shodna', T.nextKey===snapNext);
ok('uvodni obrazovka skryta', els['ovStart'].classList.contains('hidden'));

// --- 3. konec hry smaze ulozeni ---
T.gameOver();
ok('po konci hry ulozeni smazano', LS.getItem('tetris_save')===null);

// --- 4. poskozena data se ignoruji ---
LS.setItem('tetris_save','{neplatny json');
ok('poskozeny zapis -> null', T.loadGame()===null);
LS.setItem('tetris_save', JSON.stringify({v:1,board:[[1,2]],piece:{key:'O',m:[[1]]},nextKey:'I'}));
ok('spatny rozmer desky -> null', T.loadGame()===null);
LS.removeItem('tetris_save');
ok('zadne ulozeni -> null', T.loadGame()===null);

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);

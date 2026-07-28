const fs=require('fs');
let src=fs.readFileSync('game.js','utf8');

const testCode = `
/* ---- TESTY ---- */
globalThis.__t = {
  get board(){return board}, set board(v){board=v},
  get piece(){return piece}, set piece(v){piece=v},
  get state(){return state}, set state(v){state=v},
  get score(){return score}, get lines(){return lines}, get level(){return level},
  newGame, move, rotate, softDrop, lockPiece, collides, rotateM, makePiece,
  dropInterval, COLS, ROWS
};
`;
const idx=src.lastIndexOf('})();');
src=src.slice(0,idx)+testCode+src.slice(idx);

// ---- DOM stubs ----
function mkCtx(){return new Proxy({},{get:(t,p)=>{
  if(p==='createLinearGradient')return ()=>({addColorStop(){}});
  if(p==='canvas')return {};
  return typeof p==='string'?()=>{}:undefined;},set:()=>true});}
function mkEl(){return {clientWidth:200,clientHeight:400,style:{},width:0,height:0,
  textContent:'',classList:{add(){},remove(){},contains(){return false}},
  getContext:()=>mkCtx(),addEventListener(){},setAttribute(){}};}
global.document={getElementById:()=>mkEl(),addEventListener(){},hidden:false};
global.window={devicePixelRatio:1,addEventListener(){}};
global.navigator={};
global.performance={now:()=>Date.now()};
global.requestAnimationFrame=()=>{};
global.localStorage={store:{},getItem(k){return k in this.store?this.store[k]:null},setItem(k,v){this.store[k]=v}};
global.setTimeout=setTimeout; global.setInterval=()=>0; global.clearInterval=()=>{}; global.clearTimeout=()=>{};

eval(src);
const T=globalThis.__t;
let pass=0,fail=0;
function ok(name,c){ if(c){pass++;} else {fail++;console.log('FAIL: '+name);} }

// 1) rotace 4x  == original
for(const k of ['I','J','L','O','S','T','Z']){
  let m=T.makePiece(k).m, r=m;
  for(let i=0;i<4;i++) r=T.rotateM(r);
  ok('rotace4x '+k, JSON.stringify(r)===JSON.stringify(m));
}
// 2) nová hra
T.newGame();
ok('stav play', T.state==='play');
ok('skore 0', T.score===0);
ok('deska prazdna', T.board.every(r=>r.every(c=>c===null)));
ok('piece existuje', !!T.piece);

// 3) posun mimo desku nelze
T.piece.x=-5;
ok('kolize vlevo', T.collides(T.piece,-5,0)===true);
T.piece.x=4;

// 4) pad az na dno a zamknuti
let guard=0;
while(!T.collides(T.piece,T.piece.x,T.piece.y+1) && guard++<40) T.piece.y++;
T.lockPiece();
const filled=T.board.flat().filter(Boolean).length;
ok('zamknuto 4 bunky', filled===4);
ok('dno obsazeno', T.board[T.ROWS-1].some(Boolean));

// 5) mazani radku
T.newGame();
const b=T.board;
for(let x=0;x<T.COLS;x++){ b[T.ROWS-1][x]='I'; b[T.ROWS-2][x]='I'; }
b[T.ROWS-3][0]='T';
// simuluj lock ktery detekuje plne radky
T.piece.y=0; T.piece.x=4;
T.lockPiece();
ok('stav clearing', T.state==='clearing');

// 6) rychlost
ok('level1 pomaly', T.dropInterval(1)===1150);
ok('min rychlost', T.dropInterval(20)===300);
ok('klesa', T.dropInterval(2)<T.dropInterval(1));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);

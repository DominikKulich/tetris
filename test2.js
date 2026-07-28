const fs=require('fs');
let src=fs.readFileSync('game.js','utf8');
const t=`
globalThis.__t={get board(){return board},get piece(){return piece},set piece(v){piece=v},
 get state(){return state},set state(v){state=v},get grounded(){return grounded},set grounded(v){grounded=v},
 get lockTimer(){return lockTimer},set lockTimer(v){lockTimer=v},
 newGame,move,rotate,softDrop,lockPiece,collides,makePiece,COLS,ROWS,LOCK_DELAY};
`;
const i=src.lastIndexOf('})();'); src=src.slice(0,i)+t+src.slice(i);
function mkCtx(){return new Proxy({},{get:(o,p)=>p==='createLinearGradient'?()=>({addColorStop(){}}):(typeof p==='string'?()=>{}:undefined),set:()=>true});}
function mkEl(){return{clientWidth:200,clientHeight:400,style:{setProperty(){}},width:0,height:0,textContent:'',
 classList:{add(){},remove(){}},getContext:()=>mkCtx(),addEventListener(){}};}
global.document={getElementById:()=>mkEl(),addEventListener(){},hidden:false,documentElement:{style:{setProperty(){}}}};
global.window={devicePixelRatio:1,addEventListener(){},innerHeight:800};
global.navigator={};global.performance={now:()=>Date.now()};global.requestAnimationFrame=()=>{};
global.localStorage={s:{},getItem(k){return k in this.s?this.s[k]:null},setItem(k,v){this.s[k]=v}};
global.setInterval=()=>0;global.clearInterval=()=>{};global.clearTimeout=()=>{};
eval(src);
const T=globalThis.__t;
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL: '+n));

T.newGame();
const B=T.board, R=T.ROWS;
// postav previs: sloupce 0-3 zaplneny v poslednim radku, nad sloupcem 3 je "strecha"
for(let x=0;x<4;x++) B[R-1][x]='I';
B[R-2][0]='I'; B[R-2][1]='I'; B[R-2][2]='I';   // schod vlevo, mezera pod strechou neni...
// vytvor skutecny previs: strecha v radku R-3 nad sloupcem 4, prazdno v R-2 sloupec 4
B[R-3][4]='I'; B[R-1][4]='I';
// kostka O na pozici mimo previs, ve vysce R-2
T.piece = T.makePiece('O'); T.piece.x=6; T.piece.y=R-3;
ok('O sedi vedle previsu', !T.collides(T.piece,6,R-3));
// posun doleva pod strechu neni mozny (strecha je v R-3 sl.4) -> O by kolidovalo
ok('nelze skrz strechu', T.collides(T.piece,4,R-3)===true);

// klasicky tuck: mezera pod previsem sirky 1, kostka nad ni ve spravne vysce
T.newGame();
const b2=T.board;
for(let x=0;x<T.COLS;x++){ b2[R-1][x]= x===2?null:'I'; }   // dira ve sloupci 2 v poslednim radku
b2[R-2][1]='I';                                            // vlevo od diry stena
// kostka O nejde do diry sirky 1, zkusime "I" otocene? pouzijeme jednobunkovy test primo:
// test: lze posunout kostku vodorovne do mezery pod previsem?
b2[R-2][3]='I'; b2[R-2][4]='I';   // strop nad sloupci 3-4
// kostka I vodorovne v radku R-1, x=5..8 -> posun doleva na x=2? kolize s bloky. Overime aspon
// ze pohyb do strany v urovni pod stropem funguje, kdyz je misto:
T.piece = T.makePiece('I'); T.piece.y=R-3; T.piece.x=5;   // matice I ma bloky v radku 1 => radek R-2
ok('I v radku R-2 vpravo', !T.collides(T.piece,5,R-3));
ok('posun pod strop blokovan bloky', T.collides(T.piece,1,R-3)===true);

// lock delay: dosednuta kostka se hned nezamkne
T.newGame();
T.piece=T.makePiece('O'); T.piece.x=4;
let g=0; while(!T.collides(T.piece,T.piece.x,T.piece.y+1)&&g++<40) T.piece.y++;
T.grounded=true; T.lockTimer=0;
const before=T.board.flat().filter(Boolean).length;
T.softDrop();                     // stisk DOLU na dne uz nezamyka
ok('softDrop na dne nezamyka', T.board.flat().filter(Boolean).length===before);
// posun do strany na dne stale funguje
const px=T.piece.x; T.move(-1);
ok('posun do strany na dne funguje', T.piece.x===px-1);
ok('lock delay >= 900ms', T.LOCK_DELAY>=900);

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);

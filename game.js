
(function(){
"use strict";

/* ================= konstanty ================= */
const COLS = 10, ROWS = 20;

const COLORS = {
  I:"#2ee6e6", O:"#ffd94a", T:"#c07cff",
  S:"#4ce07a", Z:"#ff6b6b", J:"#5b9dff", L:"#ff9f45"
};

const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]],
  O:[[1,1],[1,1]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]]
};
const KEYS = Object.keys(SHAPES);

/* pomalé, klidné tempo */
function dropInterval(level){
  return Math.max(300, 1150 - (level - 1) * 80);
}

/* ================= stav ================= */
let board, piece, nextKey, score, lines, level, best;
let state = "start";              // start | play | pause | over | clearing
let dropTimer = 0, lastTime = 0;
let clearRows = [], clearTimer = 0;
const CLEAR_MS = 260;
let bag = [];
let soundOn = true;

/* ================= DOM ================= */
const boardCv = document.getElementById("board");
const bctx = boardCv.getContext("2d");
const nextCv = document.getElementById("next");
const nctx = nextCv.getContext("2d");
const elScore = document.getElementById("score");
const elBest  = document.getElementById("best");
const elLines = document.getElementById("lines");
const ovStart = document.getElementById("ovStart");
const ovPause = document.getElementById("ovPause");
const ovOver  = document.getElementById("ovOver");

let CELL = 24, OX = 0, OY = 0;

/* ================= úložiště ================= */
function load(k, d){
  try{ const v = localStorage.getItem(k); return v === null ? d : v; }
  catch(e){ return d; }
}
function save(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

best = parseInt(load("tetris_best","0"),10) || 0;
soundOn = load("tetris_sound","1") === "1";

/* ================= zvuk ================= */
let actx = null;
function beep(freq, dur, type, vol){
  if(!soundOn) return;
  try{
    if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.value = vol || 0.05;
    o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }catch(e){}
}
function buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }

/* ================= rozměry ================= */
/* skutečná viditelná výška (mobilní prohlížeče mají lištu, která mění výšku) */
function setViewportHeight(){
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty("--vh", h + "px");
}

function resize(){
  setViewportHeight();
  const field = document.getElementById("playfield");
  const availW = field.clientWidth  - 10;
  const availH = field.clientHeight - 10;
  if(availW <= 0 || availH <= 0) return;
  CELL = Math.max(10, Math.floor(Math.min(availW / COLS, availH / ROWS)));
  const w = CELL * COLS, h = CELL * ROWS;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  boardCv.style.width  = w + "px";
  boardCv.style.height = h + "px";
  boardCv.width  = Math.round(w * dpr);
  boardCv.height = Math.round(h * dpr);
  bctx.setTransform(dpr,0,0,dpr,0,0);
  OX = 0; OY = 0;

  const ndpr = dpr;
  const nw = nextCv.clientWidth || 62, nh = nextCv.clientHeight || 44;
  nextCv.width = Math.round(nw * ndpr);
  nextCv.height = Math.round(nh * ndpr);
  nctx.setTransform(ndpr,0,0,ndpr,0,0);

  draw();
  drawNext();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", ()=>{ setTimeout(resize,150); setTimeout(resize,500); });
if(window.visualViewport){
  window.visualViewport.addEventListener("resize", resize);
  window.visualViewport.addEventListener("scroll", resize);
}
window.addEventListener("pageshow", ()=>setTimeout(resize,50));
window.addEventListener("load", ()=>{ resize(); setTimeout(resize,300); });

/* ================= herní logika ================= */
function emptyBoard(){
  const b = [];
  for(let y=0;y<ROWS;y++){ b.push(new Array(COLS).fill(null)); }
  return b;
}

function refillBag(){
  bag = KEYS.slice();
  for(let i=bag.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
  }
}
function takeKey(){
  if(bag.length === 0) refillBag();
  return bag.pop();
}

function makePiece(key){
  const m = SHAPES[key].map(r => r.slice());
  return { key:key, m:m, x: Math.floor((COLS - m[0].length)/2), y: 0 };
}

function collides(p, nx, ny, nm){
  const m = nm || p.m;
  for(let y=0;y<m.length;y++){
    for(let x=0;x<m[y].length;x++){
      if(!m[y][x]) continue;
      const bx = nx + x, by = ny + y;
      if(bx < 0 || bx >= COLS || by >= ROWS) return true;
      if(by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function rotateM(m){
  const n = m.length, r = [];
  for(let y=0;y<n;y++){
    r.push(new Array(n).fill(0));
    for(let x=0;x<n;x++) r[y][x] = m[n-1-x][y];
  }
  return r;
}

function spawn(){
  piece = makePiece(nextKey);
  nextKey = takeKey();
  drawNext();
  if(collides(piece, piece.x, piece.y)) gameOver();
}

function move(dx){
  if(state !== "play") return;
  if(!collides(piece, piece.x + dx, piece.y)){
    piece.x += dx;
    beep(220, .04, "square", .035);
    draw();
  }
}

function rotate(){
  if(state !== "play") return;
  const nm = rotateM(piece.m);
  const kicks = [0,-1,1,-2,2];
  for(let i=0;i<kicks.length;i++){
    if(!collides(piece, piece.x + kicks[i], piece.y, nm)){
      piece.m = nm; piece.x += kicks[i];
      beep(420, .05, "square", .04);
      draw();
      return;
    }
  }
}

function softDrop(){
  if(state !== "play") return;
  if(!collides(piece, piece.x, piece.y + 1)){
    piece.y++; score += 1; updateHud(); draw();
  }else{
    lockPiece();
  }
}

function lockPiece(){
  for(let y=0;y<piece.m.length;y++){
    for(let x=0;x<piece.m[y].length;x++){
      if(!piece.m[y][x]) continue;
      const by = piece.y + y, bx = piece.x + x;
      if(by < 0){ gameOver(); return; }
      board[by][bx] = piece.key;
    }
  }
  beep(150, .07, "triangle", .05);

  clearRows = [];
  for(let y=0;y<ROWS;y++){
    let full = true;
    for(let x=0;x<COLS;x++){ if(!board[y][x]){ full = false; break; } }
    if(full) clearRows.push(y);
  }

  if(clearRows.length){
    state = "clearing";
    clearTimer = 0;
    buzz(clearRows.length >= 4 ? [60,40,60] : 45);
    beep(660, .12, "square", .06);
    setTimeout(()=>beep(880,.14,"square",.06), 90);
  }else{
    spawn();
    draw();
  }
}

function finishClear(){
  const n = clearRows.length;
  clearRows.sort((a,b)=>a-b).forEach(y => {
    board.splice(y,1);
    board.unshift(new Array(COLS).fill(null));
  });
  const pts = [0,100,300,500,800][n] || 0;
  score += pts * level;
  lines += n;
  const newLevel = Math.floor(lines / 12) + 1;
  if(newLevel > level){
    level = newLevel;
    beep(520,.1,"sine",.06);
    setTimeout(()=>beep(780,.16,"sine",.06),110);
  }
  clearRows = [];
  updateHud();
  state = "play";
  spawn();
  draw();
}

function updateHud(){
  elScore.textContent = score;
  elLines.textContent = lines;
  elBest.textContent  = best;
}

function newGame(){
  board = emptyBoard();
  bag = []; refillBag();
  score = 0; lines = 0; level = 1;
  dropTimer = 0; clearRows = [];
  nextKey = takeKey();
  state = "play";
  spawn();
  updateHud();
  ovStart.classList.add("hidden");
  ovPause.classList.add("hidden");
  ovOver.classList.add("hidden");
  resize();
}

function gameOver(){
  state = "over";
  beep(300,.18,"sawtooth",.05);
  setTimeout(()=>beep(200,.25,"sawtooth",.05),160);
  buzz([80,60,80]);
  const isBest = score > best;
  if(isBest){ best = score; save("tetris_best", String(best)); }
  updateHud();
  document.getElementById("finalScore").textContent = score;
  document.getElementById("newBest").style.visibility = isBest && score > 0 ? "visible" : "hidden";
  ovOver.classList.remove("hidden");
  draw();
}

function togglePause(){
  if(state === "play" || state === "clearing"){
    state = "pause";
    ovPause.classList.remove("hidden");
  }else if(state === "pause"){
    state = "play";
    ovPause.classList.add("hidden");
    lastTime = performance.now();
  }
}

/* ================= vykreslování ================= */
function roundRect(ctx,x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y);
  ctx.closePath();
}

function drawCell(ctx, cx, cy, size, color, mode){
  const pad = Math.max(1, size*0.06);
  const x = cx + pad, y = cy + pad, s = size - pad*2;
  if(mode === "ghost"){
    ctx.save();
    ctx.globalAlpha = .28;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size*0.11);
    roundRect(ctx,x,y,s,s,size*0.22); ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.save();
  if(mode === "flash"){
    ctx.fillStyle = "#ffffff";
    roundRect(ctx,x,y,s,s,size*0.22); ctx.fill();
    ctx.restore();
    return;
  }
  const g = ctx.createLinearGradient(x,y,x,y+s);
  g.addColorStop(0, color);
  g.addColorStop(1, shade(color,-32));
  ctx.fillStyle = g;
  ctx.shadowColor = color;
  ctx.shadowBlur = size*0.32;
  roundRect(ctx,x,y,s,s,size*0.22); ctx.fill();
  ctx.shadowBlur = 0;
  // horní lesk
  ctx.fillStyle = "rgba(255,255,255,.30)";
  roundRect(ctx, x+s*0.16, y+s*0.13, s*0.68, s*0.20, s*0.09); ctx.fill();
  ctx.restore();
}

function shade(hex, amt){
  const n = parseInt(hex.slice(1),16);
  let r = (n>>16)+amt, g = ((n>>8)&255)+amt, b = (n&255)+amt;
  r = Math.max(0,Math.min(255,r)); g = Math.max(0,Math.min(255,g)); b = Math.max(0,Math.min(255,b));
  return "#" + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function draw(){
  if(!board) return;
  const W = CELL*COLS, H = CELL*ROWS;
  bctx.clearRect(0,0,W,H);

  // pozadí + mřížka
  bctx.fillStyle = "#0d1424";
  bctx.fillRect(0,0,W,H);
  bctx.strokeStyle = "rgba(255,255,255,.045)";
  bctx.lineWidth = 1;
  for(let x=1;x<COLS;x++){
    bctx.beginPath(); bctx.moveTo(x*CELL+.5,0); bctx.lineTo(x*CELL+.5,H); bctx.stroke();
  }
  for(let y=1;y<ROWS;y++){
    bctx.beginPath(); bctx.moveTo(0,y*CELL+.5); bctx.lineTo(W,y*CELL+.5); bctx.stroke();
  }

  const flashOn = state === "clearing" && Math.floor(clearTimer/70) % 2 === 0;

  // uložené kostky
  for(let y=0;y<ROWS;y++){
    const isClearing = clearRows.indexOf(y) !== -1;
    for(let x=0;x<COLS;x++){
      const k = board[y][x];
      if(!k) continue;
      drawCell(bctx, x*CELL, y*CELL, CELL, COLORS[k], isClearing && flashOn ? "flash" : null);
    }
  }

  // duch + aktuální kostka
  if(piece && (state === "play" || state === "pause" || state === "over")){
    let gy = piece.y;
    while(!collides(piece, piece.x, gy+1)) gy++;
    if(gy !== piece.y){
      for(let y=0;y<piece.m.length;y++)
        for(let x=0;x<piece.m[y].length;x++)
          if(piece.m[y][x] && gy+y >= 0)
            drawCell(bctx,(piece.x+x)*CELL,(gy+y)*CELL,CELL,COLORS[piece.key],"ghost");
    }
    for(let y=0;y<piece.m.length;y++)
      for(let x=0;x<piece.m[y].length;x++)
        if(piece.m[y][x] && piece.y+y >= 0)
          drawCell(bctx,(piece.x+x)*CELL,(piece.y+y)*CELL,CELL,COLORS[piece.key]);
  }
}

function drawNext(){
  const w = nextCv.clientWidth || 62, h = nextCv.clientHeight || 44;
  nctx.clearRect(0,0,w,h);
  if(!nextKey) return;
  const m = SHAPES[nextKey];
  // ohraničení obsazených buněk
  let minX=99,maxX=-1,minY=99,maxY=-1;
  for(let y=0;y<m.length;y++)
    for(let x=0;x<m[y].length;x++)
      if(m[y][x]){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  const cw = maxX-minX+1, ch = maxY-minY+1;
  const size = Math.floor(Math.min((w-6)/cw, (h-6)/ch));
  const ox = (w - cw*size)/2, oy = (h - ch*size)/2;
  for(let y=minY;y<=maxY;y++)
    for(let x=minX;x<=maxX;x++)
      if(m[y][x]) drawCell(nctx, ox+(x-minX)*size, oy+(y-minY)*size, size, COLORS[nextKey]);
}

/* ================= smyčka ================= */
function loop(t){
  requestAnimationFrame(loop);
  if(!lastTime) lastTime = t;
  let dt = t - lastTime;
  lastTime = t;
  if(dt > 500) dt = 500;

  if(state === "play"){
    dropTimer += dt;
    const iv = dropInterval(level);
    if(dropTimer >= iv){
      dropTimer = 0;
      if(!collides(piece, piece.x, piece.y+1)){ piece.y++; }
      else { lockPiece(); }
      draw();
    }
  }else if(state === "clearing"){
    clearTimer += dt;
    draw();
    if(clearTimer >= CLEAR_MS){ finishClear(); }
  }
}
requestAnimationFrame(loop);

/* ================= ovládání ================= */
function hold(btn, action, delay, repeat){
  let to = null, iv = null, active = false;
  const start = (e)=>{
    e.preventDefault();
    if(active) return;
    active = true;
    btn.classList.add("down");
    action();
    to = setTimeout(()=>{ iv = setInterval(action, repeat); }, delay);
  };
  const stop = (e)=>{
    if(e) e.preventDefault();
    active = false;
    btn.classList.remove("down");
    if(to){ clearTimeout(to); to = null; }
    if(iv){ clearInterval(iv); iv = null; }
  };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("contextmenu", e=>e.preventDefault());
}

hold(document.getElementById("btnLeft"),  ()=>move(-1), 320, 130);
hold(document.getElementById("btnRight"), ()=>move(1),  320, 130);
hold(document.getElementById("btnDown"),  softDrop,     220,  70);

const btnRot = document.getElementById("btnRot");
btnRot.addEventListener("pointerdown", e=>{ e.preventDefault(); rotate(); });
btnRot.addEventListener("contextmenu", e=>e.preventDefault());

document.getElementById("btnPause").addEventListener("click", togglePause);
document.getElementById("btnNew").addEventListener("click", ()=>{
  if(state === "play" || state === "clearing"){
    state = "pause"; ovPause.classList.remove("hidden");
  }else{
    newGame();
  }
});
document.getElementById("btnStart").addEventListener("click", newGame);
document.getElementById("btnAgain").addEventListener("click", newGame);
document.getElementById("btnRestart2").addEventListener("click", newGame);
document.getElementById("btnResume").addEventListener("click", togglePause);

const btnSound = document.getElementById("btnSound");
btnSound.textContent = soundOn ? "🔊" : "🔈";
btnSound.addEventListener("click", (e)=>{
  e.stopPropagation();
  soundOn = !soundOn;
  save("tetris_sound", soundOn ? "1" : "0");
  btnSound.textContent = soundOn ? "🔊" : "🔈";
  if(soundOn) beep(600,.08,"square",.05);
});

/* klávesnice (pro počítač) */
document.addEventListener("keydown", (e)=>{
  if(state === "start" || state === "over"){
    if(e.key === "Enter" || e.key === " "){ newGame(); e.preventDefault(); }
    return;
  }
  switch(e.key){
    case "ArrowLeft":  move(-1); e.preventDefault(); break;
    case "ArrowRight": move(1);  e.preventDefault(); break;
    case "ArrowDown":  softDrop(); e.preventDefault(); break;
    case "ArrowUp":
    case "x": case "X": rotate(); e.preventDefault(); break;
    case " ":
      if(state === "play"){
        while(!collides(piece, piece.x, piece.y+1)){ piece.y++; score += 2; }
        updateHud(); lockPiece(); draw();
      }
      e.preventDefault();
      break;
    case "p": case "P": togglePause(); break;
  }
});

/* pauza při přepnutí do jiné aplikace */
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden && state === "play") togglePause();
});

/* zabránit posunu stránky prstem */
document.addEventListener("touchmove", e=>{ e.preventDefault(); }, {passive:false});

/* ================= start ================= */
board = emptyBoard();
nextKey = null;
updateHud();
resize();
setTimeout(resize, 120);

})();

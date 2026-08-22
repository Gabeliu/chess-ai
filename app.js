"use strict";

// Solid silhouettes stay legible at small sizes; color and outline distinguish sides.
const GLYPHS = { w: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }, b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" } };
const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const FILES = "abcdefgh";
const START = ["br","bn","bb","bq","bk","bb","bn","br","bp","bp","bp","bp","bp","bp","bp","bp",...Array(32).fill(null),"wp","wp","wp","wp","wp","wp","wp","wp","wr","wn","wb","wq","wk","wb","wn","wr"];
const OUTCOME_AUDIO = {
  player1: new Audio("assets/audio/player-1-wins.mp3"),
  player2: new Audio("assets/audio/player-2-wins.mp3"),
  youWin: new Audio("assets/audio/you-win.wav"),
  aiWins: new Audio("assets/audio/downer-noise.mp3")
};
const CAPTURE_AUDIO = new Audio("assets/audio/capture-nom-nom.mp3");
const CHECK_AUDIO = new Audio("assets/audio/check-alarm.mp3");
CHECK_AUDIO.volume = 0.3;
const CLOCKS = { bullet: { seconds: 60, increment: 0 }, blitz: { seconds: 180, increment: 2 }, rapid: { seconds: 600, increment: 0 }, unlimited: { seconds: null, increment: 0 } };
let checkAudioTimer = null;
let aiTimer = null;
let clockTimer = null;
let stockfish = null;
let stockfishReady = false;
let pendingEngineMove = false;

const state = { board: [], turn: "w", selected: null, legal: [], history: [], lastMove: null, mode: "ai", engineChoice: "stockfish", depth: 2, sideChoice: "w", playerColor: "w", clockChoice: "unlimited", clocks: { w: null, b: null }, lastTick: null, flipped: false, busy: false, over: false, outcome: null, engineError: false, sound: true, enPassant: null, castling: { wk: true, wq: true, bk: true, bq: true }, halfmove: 0, positions: new Map() };
const $ = (id) => document.getElementById(id);

function clonePosition(s) { return { board: s.board.map(p => p ? { ...p } : null), turn: s.turn, enPassant: s.enPassant, castling: { ...s.castling }, halfmove: s.halfmove }; }
function colorName(c) { return c === "w" ? "White" : "Black"; }
function rc(i) { return [Math.floor(i / 8), i % 8]; }
function idx(r, c) { return r * 8 + c; }
function inside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function squareName(i) { const [r, c] = rc(i); return FILES[c] + (8 - r); }
function opposite(c) { return c === "w" ? "b" : "w"; }

function resetGame() {
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  if(checkAudioTimer){clearTimeout(checkAudioTimer);checkAudioTimer=null;}
  if(clockTimer){clearInterval(clockTimer);clockTimer=null;}
  pendingEngineMove=false;
  if(stockfish){stockfishReady=false;stockfish.postMessage("stop");stockfish.postMessage("ucinewgame");stockfish.postMessage("isready");}
  [CAPTURE_AUDIO,CHECK_AUDIO,...Object.values(OUTCOME_AUDIO)].forEach(audio=>{try{audio.pause();if(audio.readyState>0)audio.currentTime=0;}catch{}});
  state.playerColor=state.mode==="ai"?(state.sideChoice==="random"?(Math.random()<.5?"w":"b"):state.sideChoice):"w";
  state.flipped=state.mode==="ai"&&state.playerColor==="b";
  const clock=CLOCKS[state.clockChoice];state.clocks={w:clock.seconds,b:clock.seconds};state.lastTick=clock.seconds===null?null:performance.now();
  state.board = START.map(code => code ? { color: code[0], type: code[1] } : null);
  Object.assign(state, { turn: "w", selected: null, legal: [], history: [], lastMove: null, busy: false, over: false, outcome: null, enPassant: null, castling: { wk: true, wq: true, bk: true, bq: true }, halfmove: 0, positions: new Map() });
  applyPlayerLabels();recordPosition();render();startClock();if(isAiTurn())scheduleAiMove();
}

function isAiTurn(){return state.mode==="ai"&&state.turn!==state.playerColor;}
function scheduleAiMove(){if(state.over||!isAiTurn())return;state.busy=true;render();aiTimer=setTimeout(()=>{aiTimer=null;updateClock();if(state.over)return;if(state.engineChoice==="local"){const move=chooseLocalAiMove();state.busy=false;if(move)commitMove(move);}else if(stockfishReady)requestStockfishMove();},260);}
function startClock(){if(state.clocks.w===null)return;clockTimer=setInterval(()=>{updateClock();renderClocks();},200);}
function updateClock(){
  if(state.lastTick===null||state.over)return;
  const now=performance.now(),elapsed=(now-state.lastTick)/1000;state.lastTick=now;state.clocks[state.turn]=Math.max(0,state.clocks[state.turn]-elapsed);
  if(state.clocks[state.turn]<=0){state.outcome={title:"Time",text:"Time expired",winner:opposite(state.turn)};state.over=true;state.busy=false;pendingEngineMove=false;if(stockfish)stockfish.postMessage("stop");if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}if(clockTimer){clearInterval(clockTimer);clockTimer=null;}playOutcomeSound(state.outcome);render();}
}

function attacksSquare(pos, from, target) {
  const p = pos.board[from]; if (!p) return false;
  const [fr, fc] = rc(from), [tr, tc] = rc(target), dr = tr - fr, dc = tc - fc;
  if (p.type === "p") return dr === (p.color === "w" ? -1 : 1) && Math.abs(dc) === 1;
  if (p.type === "n") return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  if (p.type === "k") return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
  const diagonal = Math.abs(dr) === Math.abs(dc), straight = dr === 0 || dc === 0;
  if (!((p.type === "b" && diagonal) || (p.type === "r" && straight) || (p.type === "q" && (diagonal || straight)))) return false;
  const sr = Math.sign(dr), sc = Math.sign(dc); let r = fr + sr, c = fc + sc;
  while (r !== tr || c !== tc) { if (pos.board[idx(r, c)]) return false; r += sr; c += sc; }
  return true;
}

function isAttacked(pos, square, byColor) {
  for (let i = 0; i < 64; i++) if (pos.board[i]?.color === byColor && attacksSquare(pos, i, square)) return true;
  return false;
}

function inCheck(pos, color) {
  const king = pos.board.findIndex(p => p?.color === color && p.type === "k");
  return king >= 0 && isAttacked(pos, king, opposite(color));
}

function pseudoMoves(pos, from) {
  const p = pos.board[from]; if (!p) return [];
  const [r, c] = rc(from), moves = [];
  const add = (nr, nc, extra = {}) => { if (!inside(nr, nc)) return false; const to = idx(nr, nc), target = pos.board[to]; if (!target) { moves.push({ from, to, ...extra }); return true; } if (target.color !== p.color) moves.push({ from, to, capture: target, ...extra }); return false; };
  if (p.type === "p") {
    const d = p.color === "w" ? -1 : 1, start = p.color === "w" ? 6 : 1, promo = p.color === "w" ? 0 : 7;
    if (inside(r + d, c) && !pos.board[idx(r + d, c)]) {
      moves.push({ from, to: idx(r + d, c), promotion: r + d === promo });
      if (r === start && !pos.board[idx(r + 2 * d, c)]) moves.push({ from, to: idx(r + 2 * d, c), double: true });
    }
    for (const dc of [-1, 1]) if (inside(r + d, c + dc)) {
      const to = idx(r + d, c + dc), target = pos.board[to];
      if (target && target.color !== p.color) moves.push({ from, to, capture: target, promotion: r + d === promo });
      else if (to === pos.enPassant) moves.push({ from, to, enPassant: true, capture: { color: opposite(p.color), type: "p" } });
    }
  } else if (p.type === "n") {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([a,b]) => add(r+a,c+b));
  } else if (p.type === "k") {
    for (let a=-1;a<=1;a++) for (let b=-1;b<=1;b++) if (a||b) add(r+a,c+b);
    const enemy = opposite(p.color), home = p.color === "w" ? 60 : 4;
    if (from === home && !isAttacked(pos, home, enemy)) {
      if (pos.castling[p.color + "k"] && !pos.board[home+1] && !pos.board[home+2] && pos.board[home+3]?.type === "r" && !isAttacked(pos, home+1, enemy) && !isAttacked(pos, home+2, enemy)) moves.push({ from, to: home+2, castle: "k" });
      if (pos.castling[p.color + "q"] && !pos.board[home-1] && !pos.board[home-2] && !pos.board[home-3] && pos.board[home-4]?.type === "r" && !isAttacked(pos, home-1, enemy) && !isAttacked(pos, home-2, enemy)) moves.push({ from, to: home-2, castle: "q" });
    }
  } else {
    const dirs = p.type === "b" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : p.type === "r" ? [[-1,0],[1,0],[0,-1],[0,1]] : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
    for (const [a,b] of dirs) { let n=1; while (add(r+a*n,c+b*n)) n++; }
  }
  return moves;
}

function applyMove(pos, move, promotion = "q") {
  const next = clonePosition(pos), piece = next.board[move.from], target = next.board[move.to];
  next.board[move.to] = { ...piece, type: move.promotion ? promotion : piece.type }; next.board[move.from] = null;
  if (move.enPassant) next.board[move.to + (piece.color === "w" ? 8 : -8)] = null;
  if (move.castle) { const rookFrom = move.castle === "k" ? move.from + 3 : move.from - 4, rookTo = move.castle === "k" ? move.from + 1 : move.from - 1; next.board[rookTo] = next.board[rookFrom]; next.board[rookFrom] = null; }
  if (piece.type === "k") { next.castling[piece.color + "k"] = false; next.castling[piece.color + "q"] = false; }
  if (piece.type === "r") { if (move.from === 63) next.castling.wk=false; if (move.from === 56) next.castling.wq=false; if (move.from === 7) next.castling.bk=false; if (move.from === 0) next.castling.bq=false; }
  if (target?.type === "r") { if (move.to === 63) next.castling.wk=false; if (move.to === 56) next.castling.wq=false; if (move.to === 7) next.castling.bk=false; if (move.to === 0) next.castling.bq=false; }
  next.enPassant = move.double ? (move.from + move.to) / 2 : null;
  next.halfmove = piece.type === "p" || target || move.enPassant ? 0 : pos.halfmove + 1;
  next.turn = opposite(pos.turn); return next;
}

function legalMoves(pos, color = pos.turn) {
  const result = [];
  for (let i=0;i<64;i++) if (pos.board[i]?.color === color) for (const move of pseudoMoves(pos, i)) if (!inCheck(applyMove({ ...pos, turn: color }, move), color)) result.push(move);
  return result;
}

function notation(before, move, after, promotion = "q") {
  const p = before.board[move.from]; if (move.castle) return move.castle === "k" ? "O-O" : "O-O-O";
  const capture = !!move.capture || move.enPassant, pieceLetter = p.type === "p" ? "" : p.type.toUpperCase();
  const pawnFile = p.type === "p" && capture ? FILES[rc(move.from)[1]] : "";
  const suffix = move.promotion ? "=" + promotion.toUpperCase() : "";
  const responses = legalMoves(after); const check = inCheck(after, after.turn) ? (responses.length ? "+" : "#") : "";
  return pieceLetter + pawnFile + (capture ? "x" : "") + squareName(move.to) + suffix + check;
}

function positionKey(pos) { return pos.board.map(p => p ? p.color+p.type : "--").join("") + pos.turn + JSON.stringify(pos.castling) + pos.enPassant; }
function recordPosition() { const key = positionKey(state); state.positions.set(key, (state.positions.get(key)||0)+1); }
function gameResult(pos) {
  const moves = legalMoves(pos); if (!moves.length) return inCheck(pos, pos.turn) ? { title: "Checkmate", text: "Checkmate", winner: opposite(pos.turn) } : { title: "Draw", text: "Stalemate" };
  if (pos.halfmove >= 100) return { title: "Draw", text: "Fifty-move rule" };
  if ((state.positions.get(positionKey(pos))||0) >= 3) return { title: "Draw", text: "Threefold repetition" };
  const material = pos.board.filter(Boolean); if (material.every(p => p.type === "k" || p.type === "b" || p.type === "n") && material.length <= 3) return { title: "Draw", text: "Insufficient material" };
  return null;
}

function resultDisplay(result) {
  if (!result?.winner) return result;
  const winner = state.mode === "ai"
    ? (result.winner === state.playerColor ? "You" : "Local AI")
    : (result.winner === "w" ? "Player 1" : "Player 2");
  return { title: winner + " wins", text: result.text };
}

function positionFen(pos){
  const rows=[];for(let r=0;r<8;r++){let row="",empty=0;for(let c=0;c<8;c++){const piece=pos.board[idx(r,c)];if(!piece){empty++;continue;}if(empty){row+=empty;empty=0;}const letter=piece.type;row+=piece.color==="w"?letter.toUpperCase():letter;}if(empty)row+=empty;rows.push(row);}
  const rights=(pos.castling.wk?"K":"")+(pos.castling.wq?"Q":"")+(pos.castling.bk?"k":"")+(pos.castling.bq?"q":"");
  return `${rows.join("/")} ${pos.turn} ${rights||"-"} ${pos.enPassant===null?"-":squareName(pos.enPassant)} ${pos.halfmove} ${Math.floor(state.history.length/2)+1}`;
}
function evaluateLocal(pos){
  let score=0;pos.board.forEach((piece,i)=>{if(!piece)return;const [r,c]=rc(i),center=(3.5-Math.abs(3.5-r))+(3.5-Math.abs(3.5-c)),activity=piece.type==="p"?(piece.color==="w"?6-r:r-1)*7:(piece.type==="n"||piece.type==="b"?center*5:0);score+=(piece.color==="b"?1:-1)*(VALUES[piece.type]+activity);});return score;
}
function searchLocal(pos,depth,alpha,beta){
  const moves=legalMoves(pos);if(!moves.length)return inCheck(pos,pos.turn)?(pos.turn==="b"?-99999-depth:99999+depth):0;if(depth===0)return evaluateLocal(pos);
  moves.sort((a,b)=>(b.capture?VALUES[b.capture.type]:0)-(a.capture?VALUES[a.capture.type]:0));
  if(pos.turn==="b"){let best=-Infinity;for(const move of moves){best=Math.max(best,searchLocal(applyMove(pos,move),depth-1,alpha,beta));alpha=Math.max(alpha,best);if(beta<=alpha)break;}return best;}
  let best=Infinity;for(const move of moves){best=Math.min(best,searchLocal(applyMove(pos,move),depth-1,alpha,beta));beta=Math.min(beta,best);if(beta<=alpha)break;}return best;
}
function chooseLocalAiMove(){
  const moves=legalMoves(state),maximizing=state.turn==="b";let best=maximizing?-Infinity:Infinity,choices=[];
  for(const move of moves){const score=searchLocal(applyMove(state,move),state.depth-1,-Infinity,Infinity)+(Math.random()*8-4),better=maximizing?score>best:score<best;if(better){best=score;choices=[move];}else if(score===best)choices.push(move);}
  return choices[Math.floor(Math.random()*choices.length)];
}
function requestStockfishMove(){
  if(state.engineChoice!=="stockfish"||!stockfish||!stockfishReady||pendingEngineMove||state.over||!isAiTurn())return;
  const strengths=[1320,1700,2200],thinkTimes=[120,300,650];pendingEngineMove=true;stockfishReady=false;
  stockfish.postMessage("setoption name UCI_LimitStrength value true");stockfish.postMessage(`setoption name UCI_Elo value ${strengths[state.depth-1]}`);
  stockfish.postMessage(`position fen ${positionFen(state)}`);stockfish.postMessage(`go movetime ${thinkTimes[state.depth-1]}`);
}
function handleStockfishLine(line){
  if(typeof line!=="string")return;
  if(line==="uciok"){stockfish.postMessage("setoption name Hash value 16");stockfish.postMessage("isready");return;}
  if(line==="readyok"){stockfishReady=true;if(state.engineChoice==="stockfish"&&state.busy&&isAiTurn()&&!aiTimer)requestStockfishMove();return;}
  if(!line.startsWith("bestmove ")||!pendingEngineMove)return;
  pendingEngineMove=false;stockfishReady=true;const uci=line.split(" ")[1];if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))return;
  const from=idx(8-Number(uci[1]),FILES.indexOf(uci[0])),to=idx(8-Number(uci[3]),FILES.indexOf(uci[2])),move=legalMoves(state).find(candidate=>candidate.from===from&&candidate.to===to);
  state.busy=false;if(move)commitMove(move,uci[4]||"q");else render();
}
function failStockfish(){if(state.engineChoice==="stockfish"){state.engineError=true;state.busy=false;render();}}
function initStockfishAsm(){
  const script=document.createElement("script");script.src="assets/stockfish/stockfish-asm.js";
  script.onload=async()=>{try{
    const engine=await script._exports({listener:handleStockfishLine}),queue=[];
    const execute=command=>{try{const result=engine.ccall("command",null,["string"],[command],{async:/^go\b/.test(command)});if(result?.catch)result.catch(failStockfish);}catch{failStockfish();}};
    const pump=()=>{while(queue.length&&(!engine._isSearching||!engine._isSearching()))execute(queue.shift());};engine.onDoneSearching=()=>setTimeout(pump,0);
    stockfish={postMessage(command){if(/^go\b|^setoption\b/.test(command)){queue.push(command);pump();}else{execute(command);pump();}},terminate(){engine.terminate?.();}};
    stockfish.postMessage("uci");
  }catch{failStockfish();}};
  script.onerror=failStockfish;document.head.appendChild(script);
}
function initStockfish(){
  if(location.protocol==="file:"){initStockfishAsm();return;}
  try{stockfish=new Worker("assets/stockfish/stockfish.js");stockfish.onmessage=event=>handleStockfishLine(event.data);stockfish.onerror=failStockfish;stockfish.postMessage("uci");}
  catch{failStockfish();}
}

function commitMove(move, promotion = "q") {
  updateClock();if(state.over)return;
  const snapshot = { ...clonePosition(state), history: state.history.map(h => ({...h})), lastMove: state.lastMove, positions: new Map(state.positions), clocks: { ...state.clocks } };
  const before = clonePosition(state), after = applyMove(state, move, promotion);
  Object.assign(state, after); state.history.push({ snapshot, notation: notation(before,move,after,promotion), color: before.turn, captured: move.capture || null });
  state.lastMove = { from: move.from, to: move.to }; state.selected=null; state.legal=[]; recordPosition();
  if(state.clocks[before.turn]!==null)state.clocks[before.turn]+=CLOCKS[state.clockChoice].increment;state.lastTick=state.clocks.w===null?null:performance.now();
  const result=gameResult(state);
  if(result){state.outcome=result;state.over=true;if(clockTimer){clearInterval(clockTimer);clockTimer=null;}playOutcomeSound(result);}
  else if(inCheck(state,state.turn))playCheckSound();
  else playTone(!!move.capture || move.enPassant);
  render();
  if(isAiTurn()&&!state.over)scheduleAiMove();
}

function handleSquare(index) {
  if (state.busy || state.over || isAiTurn()) return;
  const targetMove=state.legal.find(m=>m.to===index);
  if(targetMove){ if(targetMove.promotion){ showPromotion(targetMove); return; } commitMove(targetMove); return; }
  if(state.board[index]?.color===state.turn){ state.selected=index; state.legal=legalMoves(state).filter(m=>m.from===index); } else { state.selected=null; state.legal=[]; }
  renderBoard();
}

function showPromotion(move) {
  const dialog=$("promotionDialog"), box=$("promotionChoices"); box.innerHTML="";
  for(const type of ["q","r","b","n"]){ const b=document.createElement("button"); b.textContent=GLYPHS[state.turn][type]; b.setAttribute("aria-label","Promote to "+({q:"queen",r:"rook",b:"bishop",n:"knight"}[type])); b.onclick=()=>{dialog.hidden=true;commitMove(move,type);}; box.appendChild(b); }
  dialog.hidden=false;
}

function renderBoard() {
  const board=$("board"); board.innerHTML=""; const order=[...Array(64).keys()]; if(state.flipped) order.reverse();
  const checkedKing=inCheck(state,state.turn)?state.board.findIndex(p=>p?.color===state.turn&&p.type==="k"):-1;
  for(const i of order){ const [r,c]=rc(i), button=document.createElement("button"), p=state.board[i], legal=state.legal.find(m=>m.to===i);
    button.className=`square ${(r+c)%2?"dark":"light"}${state.selected===i?" selected":""}${state.lastMove&&(state.lastMove.from===i||state.lastMove.to===i)?" last-move":""}${checkedKing===i?" in-check":""}${legal?" legal":""}${legal?.capture?" capture":""}`;
    button.dataset.square=squareName(i); button.setAttribute("role","gridcell"); button.setAttribute("aria-label",`${squareName(i)}${p?", "+colorName(p.color)+" "+({k:"king",q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"}[p.type]):", empty"}`); button.onclick=()=>handleSquare(i);
    if(p){const span=document.createElement("span");span.className="piece "+(p.color==="w"?"white":"black");span.textContent=GLYPHS[p.color][p.type];button.appendChild(span);}
    const displayR=state.flipped?7-r:r, displayC=state.flipped?7-c:c;
    if(displayC===0){const s=document.createElement("span");s.className="coord rank";s.textContent=8-r;button.appendChild(s);} if(displayR===7){const s=document.createElement("span");s.className="coord file";s.textContent=FILES[c];button.appendChild(s);}
    board.appendChild(button);
  }
}

function renderHistory() {
  const list=$("moveList"); if(!state.history.length){list.className="move-list empty";list.innerHTML="<span>Your game record will appear here.</span>";return;}
  list.className="move-list"; list.innerHTML="";
  for(let i=0;i<state.history.length;i+=2){const row=document.createElement("div");row.className="move-row";row.innerHTML=`<span>${i/2+1}.</span><span>${state.history[i]?.notation||""}</span><span>${state.history[i+1]?.notation||""}</span>`;list.appendChild(row);} list.scrollTop=list.scrollHeight;
}

function render() {
  renderBoard(); renderHistory(); renderClocks(); const result=state.outcome||gameResult(state), displayResult=resultDisplay(result), check=inCheck(state,state.turn);
  const engineFailed=state.engineChoice==="stockfish"&&state.engineError;
  $("statusTitle").textContent=displayResult?.title || (engineFailed?"Engine unavailable":state.busy?(state.engineChoice==="stockfish"?"Stockfish is thinking":"Local AI is thinking"):check?"Check":state.mode==="ai"&&state.turn===state.playerColor?"Your move":colorName(state.turn)+" to move");
  $("statusText").textContent=displayResult?.text || (engineFailed?"Choose Local AI or reload to retry":check?colorName(state.turn)+" king is under attack":colorName(state.turn)+" to move");
  const bottomColor=state.mode==="ai"?state.playerColor:"w",topColor=opposite(bottomColor);
  $("whiteTurn").classList.toggle("active",state.turn===bottomColor&&!state.over);$("whiteTurn").setAttribute("aria-label",colorName(bottomColor)+" to move");
  $("blackTurn").classList.toggle("active",state.turn===topColor&&!state.over);$("blackTurn").setAttribute("aria-label",colorName(topColor)+" to move");
  $("moveCount").textContent=state.history.length+` played`; $("undoButton").disabled=!state.history.length||state.busy;
  const whiteCaps=state.history.filter(h=>h.color==="w"&&h.captured).map(h=>GLYPHS.b[h.captured.type]).join(""); const blackCaps=state.history.filter(h=>h.color==="b"&&h.captured).map(h=>GLYPHS.w[h.captured.type]).join("");
  $("whiteCaptured").textContent=bottomColor==="w"?whiteCaps:blackCaps;$("blackCaptured").textContent=topColor==="w"?whiteCaps:blackCaps;
}

function formatClock(seconds){if(seconds===null)return"∞";const value=Math.max(0,Math.ceil(seconds)),minutes=Math.floor(value/60),secs=value%60;return `${minutes}:${String(secs).padStart(2,"0")}`;}
function renderClocks(){
  const bottomColor=state.mode==="ai"?state.playerColor:"w",topColor=opposite(bottomColor),clocks=[["whiteClock",bottomColor],["blackClock",topColor]];
  for(const [id,color] of clocks){const el=$(id),active=state.turn===color&&!state.over;el.textContent=formatClock(state.clocks[color]);el.setAttribute("aria-label",colorName(color)+" clock");el.classList.toggle("active",active);el.classList.toggle("low",state.clocks[color]!==null&&state.clocks[color]<10);}
}

function undo() {
  if(!state.history.length||state.busy)return; let steps=state.mode==="ai"&&state.history.length>=2&&state.turn===state.playerColor?2:1; let snap;
  while(steps--&&state.history.length){snap=state.history[state.history.length-1].snapshot;Object.assign(state,clonePosition(snap),{history:snap.history.map(h=>({...h})),lastMove:snap.lastMove,positions:new Map(snap.positions),clocks:{...snap.clocks},lastTick:snap.clocks.w===null?null:performance.now(),selected:null,legal:[],over:false,outcome:null});}
  render();if(!clockTimer)startClock();
}
function playTone(isCapture=false){
  if(!state.sound)return;
  if(isCapture){CAPTURE_AUDIO.currentTime=0;CAPTURE_AUDIO.play().catch(()=>{});return;}
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)(), now=ctx.currentTime;
    const pop=ctx.createOscillator(),gain=ctx.createGain();pop.type="sine";pop.frequency.setValueAtTime(520,now);pop.frequency.exponentialRampToValueAtTime(190,now+.045);gain.gain.setValueAtTime(.09,now);gain.gain.exponentialRampToValueAtTime(.001,now+.055);pop.connect(gain);gain.connect(ctx.destination);pop.start(now);pop.stop(now+.055);
  }catch{}
}
function playOutcomeSound(result){
  if(!state.sound||!result.winner)return;
  const key=state.mode==="ai"?(result.winner===state.playerColor?"youWin":"aiWins"):(result.winner==="w"?"player1":"player2"),audio=OUTCOME_AUDIO[key];
  audio.currentTime=0;
  audio.play().catch(()=>{});
}
function playCheckSound(){
  if(!state.sound)return;
  if(checkAudioTimer)clearTimeout(checkAudioTimer);
  CHECK_AUDIO.pause();CHECK_AUDIO.currentTime=0;CHECK_AUDIO.play().catch(()=>{});
  checkAudioTimer=setTimeout(()=>{CHECK_AUDIO.pause();CHECK_AUDIO.currentTime=0;checkAudioTimer=null;},1600);
}
function applyPlayerLabels(){
  const player=colorName(state.playerColor),ai=colorName(opposite(state.playerColor));
  $("playerName").textContent=state.mode==="ai"?"You":"Player 1";$("playerAvatar").textContent=state.mode==="ai"?"YOU":"P1";$("playerDetail").textContent=state.mode==="ai"?player:"White";
  $("opponentName").textContent=state.mode==="ai"?(state.engineChoice==="stockfish"?"Stockfish":"Local AI"):"Player 2";$("opponentAvatar").textContent=state.mode==="ai"?(state.engineChoice==="stockfish"?"SF":"QK"):"P2";$("opponentDetail").textContent=state.mode==="ai"?`Level ${state.depth} · ${ai}`:"Black";
}
function setMode(mode){
  state.mode=mode;$("aiMode").classList.toggle("active",mode==="ai");$("localMode").classList.toggle("active",mode==="local");$("aiMode").setAttribute("aria-selected",mode==="ai");$("localMode").setAttribute("aria-selected",mode==="local");$("difficultySetting").hidden=mode!=="ai";
  $("sideSetting").hidden=mode!=="ai";$("engineSetting").hidden=mode!=="ai";
  resetGame();
}

$("brandHome").onclick=(event)=>{event.preventDefault();window.location.reload();}; $("newGameButton").onclick=resetGame; $("undoButton").onclick=undo; $("flipButton").onclick=()=>{state.flipped=!state.flipped;renderBoard();}; $("soundButton").onclick=()=>{state.sound=!state.sound;if(!state.sound){CHECK_AUDIO.pause();CHECK_AUDIO.currentTime=0;if(checkAudioTimer){clearTimeout(checkAudioTimer);checkAudioTimer=null;}}$("soundButton").textContent=state.sound?"♪":"×";$("soundButton").setAttribute("aria-label",state.sound?"Mute sound":"Enable sound");};
$("aiMode").onclick=()=>setMode("ai"); $("localMode").onclick=()=>setMode("local"); $("difficulty").oninput=(e)=>{state.depth=Number(e.target.value);const names=["Casual","Balanced","Sharp"];$("difficultyLabel").textContent=names[state.depth-1];applyPlayerLabels();};
document.querySelectorAll("[data-side]").forEach(button=>button.onclick=()=>{state.sideChoice=button.dataset.side;document.querySelectorAll("[data-side]").forEach(item=>item.classList.toggle("active",item===button));resetGame();});
document.querySelectorAll("[data-engine]").forEach(button=>button.onclick=()=>{state.engineChoice=button.dataset.engine;state.engineError=false;document.querySelectorAll("[data-engine]").forEach(item=>item.classList.toggle("active",item===button));resetGame();});
document.querySelectorAll("[data-clock]").forEach(button=>button.onclick=()=>{state.clockChoice=button.dataset.clock;document.querySelectorAll("[data-clock]").forEach(item=>item.classList.toggle("active",item===button));resetGame();});
resetGame();initStockfish();

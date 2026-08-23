"use strict";

function pieceAsset(color,type){const folder=state.pieceSet==="cburnett"?"":`${state.pieceSet}/`;return `assets/pieces/${folder}${color}${type.toUpperCase()}.svg`;}
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
let relayClients=[],connection=null,onlineRole=null,connectionTimer=null,helloTimer=null,onlineClientId=null,onlineMessageSeq=0,receivedOnlineMessages=new Set();

const state = { board: [], turn: "w", selected: null, legal: [], history: [], lastMove: null, mode: "ai", engineChoice: "stockfish", depth: 2, sideChoice: "w", onlineSideChoice:"random", playerColor: "w", clockChoice: "unlimited", pieceSet:"cburnett", clocks: { w: null, b: null }, lastTick: null, flipped: false, busy: false, over: false, outcome: null, engineError: false, sound: true, enPassant: null, castling: { wk: true, wq: true, bk: true, bq: true }, halfmove: 0, positions: new Map() };
const $ = (id) => document.getElementById(id);
const TRANSLATIONS={
  en:{localEngineBadge:"Local engine",rules:"Rules",currentGame:"CURRENT GAME",vsAi:"Vs AI",twoPlayers:"Two players",playAs:"Play as",white:"White",black:"Black",random:"Random",aiEngine:"AI engine",localAi:"Local AI",aiStrength:"AI strength",casual:"Casual",balanced:"Balanced",sharp:"Sharp",timeControl:"Time control",moves:"Moves",played:"{count} played",emptyHistory:"Your game record will appear here.",newGame:"New game",undo:"Undo",privacy:"No account. No API key. Every move stays on this device.",quickGuide:"QUICK GUIDE",howToPlay:"How to play",basics:"Basics",pieces:"Pieces",special:"Special",ending:"Ending",protectKing:"Protect your king",protectKingText:"Win by checkmating the opposing king: attack it so there is no legal escape.",whiteFirst:"White moves first",whiteFirstText:"Players alternate one move at a time.",capturePieces:"Capture opposing pieces",capturePiecesText:"Move onto an occupied square when your piece can legally reach it.",answerCheck:"Answer every check",answerCheckText:"Move the king, block the attack, or capture the attacking piece.",rook:"Rook",rookText:"Any distance across ranks or files.",bishop:"Bishop",bishopText:"Any distance along diagonals.",queen:"Queen",queenText:"Moves like a rook and bishop.",knight:"Knight",knightText:"Moves in an L shape and can jump.",king:"King",kingText:"One square in any direction.",pawn:"Pawn",pawnText:"Moves forward, captures diagonally.",castling:"Castling",castlingText:"Move the king two squares toward an unmoved rook. The path must be clear and safe.",enPassant:"En passant",enPassantText:"A pawn may capture a neighboring pawn immediately after it advances two squares.",promotion:"Promotion",promotionText:"A pawn reaching the farthest rank becomes a queen, rook, bishop, or knight.",checkmate:"Checkmate",checkmateText:"The checked king has no legal response. The attacking player wins.",draw:"Draw",drawText:"Games can draw by stalemate, repetition, insufficient material, or the fifty-move rule.",time:"Time",timeText:"With a chess clock, running out of time loses the game unless checkmate is impossible.",you:"You",player1:"Player 1",player2:"Player 2",aiName:"AI",winnerWins:"{winner} wins",yourMove:"Your move",toMove:"{color} to move",kingInCheck:"{color} king is under attack",check:"Check",stockfishThinking:"Stockfish is thinking",localThinking:"Local AI is thinking",engineUnavailable:"Engine unavailable",engineHelp:"Choose Local AI or reload to retry",timeExpired:"Time expired",stalemate:"Stalemate",fiftyMove:"Fifty-move rule",repetition:"Threefold repetition",insufficient:"Insufficient material",promotePawn:"Promote pawn",levelColor:"Level {level} · {color}"},
  es:{localEngineBadge:"Motor local",rules:"Reglas",currentGame:"PARTIDA ACTUAL",vsAi:"Contra IA",twoPlayers:"Dos jugadores",playAs:"Jugar con",white:"Blancas",black:"Negras",random:"Aleatorio",aiEngine:"Motor de IA",localAi:"IA local",aiStrength:"Fuerza de IA",casual:"Casual",balanced:"Equilibrado",sharp:"Fuerte",timeControl:"Control de tiempo",moves:"Movimientos",played:"{count} jugados",emptyHistory:"El registro de la partida aparecerá aquí.",newGame:"Nueva partida",undo:"Deshacer",privacy:"Sin cuenta. Sin clave API. Cada movimiento permanece en este dispositivo.",quickGuide:"GUÍA RÁPIDA",howToPlay:"Cómo jugar",basics:"Básico",pieces:"Piezas",special:"Especial",ending:"Final",protectKing:"Protege a tu rey",protectKingText:"Gana dando jaque mate al rey rival: atácalo sin dejarle una salida legal.",whiteFirst:"Las blancas empiezan",whiteFirstText:"Los jugadores alternan un movimiento cada vez.",capturePieces:"Captura piezas rivales",capturePiecesText:"Muévete a una casilla ocupada cuando tu pieza pueda alcanzarla legalmente.",answerCheck:"Responde a cada jaque",answerCheckText:"Mueve el rey, bloquea el ataque o captura la pieza atacante.",rook:"Torre",rookText:"Cualquier distancia por filas o columnas.",bishop:"Alfil",bishopText:"Cualquier distancia en diagonal.",queen:"Dama",queenText:"Se mueve como torre y alfil.",knight:"Caballo",knightText:"Se mueve en L y puede saltar.",king:"Rey",kingText:"Una casilla en cualquier dirección.",pawn:"Peón",pawnText:"Avanza de frente y captura en diagonal.",castling:"Enroque",castlingText:"Mueve el rey dos casillas hacia una torre que no se haya movido. El camino debe estar libre y seguro.",enPassant:"Al paso",enPassantText:"Un peón puede capturar a otro vecino justo después de que avance dos casillas.",promotion:"Promoción",promotionText:"Un peón que llega a la última fila se convierte en dama, torre, alfil o caballo.",checkmate:"Jaque mate",checkmateText:"El rey en jaque no tiene respuesta legal. Gana el atacante.",draw:"Tablas",drawText:"Hay tablas por ahogado, repetición, material insuficiente o la regla de cincuenta movimientos.",time:"Tiempo",timeText:"Con reloj, quedarse sin tiempo pierde la partida salvo que el mate sea imposible.",you:"Tú",player1:"Jugador 1",player2:"Jugador 2",wins:"gana",yourMove:"Tu turno",toMove:"Turno de {color}",kingInCheck:"El rey de {color} está bajo ataque",check:"Jaque",stockfishThinking:"Stockfish está pensando",localThinking:"La IA local está pensando",engineUnavailable:"Motor no disponible",engineHelp:"Elige IA local o recarga para reintentar",timeExpired:"Tiempo agotado",stalemate:"Ahogado",fiftyMove:"Regla de cincuenta movimientos",repetition:"Triple repetición",insufficient:"Material insuficiente",promotePawn:"Promocionar peón",levelColor:"Nivel {level} · {color}"},
  fr:{localEngineBadge:"Moteur local",rules:"Règles",currentGame:"PARTIE EN COURS",vsAi:"Contre l’IA",twoPlayers:"Deux joueurs",playAs:"Jouer avec",white:"Blancs",black:"Noirs",random:"Aléatoire",aiEngine:"Moteur d’IA",localAi:"IA locale",aiStrength:"Niveau de l’IA",casual:"Facile",balanced:"Équilibré",sharp:"Difficile",timeControl:"Cadence",moves:"Coups",played:"{count} coups joués",emptyHistory:"L’historique de la partie apparaîtra ici.",newGame:"Nouvelle partie",undo:"Annuler",privacy:"Aucun compte. Aucune clé API. Tous les coups restent sur cet appareil.",quickGuide:"GUIDE RAPIDE",howToPlay:"Comment jouer",basics:"Bases",pieces:"Pièces",special:"Spécial",ending:"Fin de partie",protectKing:"Protégez votre roi",protectKingText:"Gagnez en matant le roi adverse : attaquez-le sans lui laisser d’échappatoire légale.",whiteFirst:"Les Blancs commencent",whiteFirstText:"Les joueurs jouent chacun leur tour.",capturePieces:"Capturez les pièces adverses",capturePiecesText:"Déplacez-vous sur une case occupée lorsque votre pièce peut légalement l’atteindre.",answerCheck:"Répondez à chaque échec",answerCheckText:"Déplacez le roi, bloquez l’attaque ou capturez la pièce attaquante.",rook:"Tour",rookText:"Se déplace à toute distance sur une ligne ou une colonne.",bishop:"Fou",bishopText:"Se déplace à toute distance en diagonale.",queen:"Dame",queenText:"Se déplace comme une tour et un fou.",knight:"Cavalier",knightText:"Se déplace en L et peut sauter par-dessus les pièces.",king:"Roi",kingText:"Une case dans n’importe quelle direction.",pawn:"Pion",pawnText:"Avance tout droit et capture en diagonale.",castling:"Roque",castlingText:"Déplacez le roi de deux cases vers une tour qui n’a pas bougé. Le passage doit être libre et sûr.",enPassant:"Prise en passant",enPassantText:"Un pion peut capturer un pion voisin juste après que celui-ci a avancé de deux cases.",promotion:"Promotion",promotionText:"Un pion atteignant la dernière rangée devient une dame, une tour, un fou ou un cavalier.",checkmate:"Échec et mat",checkmateText:"Le roi en échec n’a aucune réponse légale. L’attaquant gagne.",draw:"Partie nulle",drawText:"Une partie peut être nulle par pat, répétition, matériel insuffisant ou règle des cinquante coups.",time:"Temps",timeText:"Avec une pendule, manquer de temps fait perdre sauf si le mat est impossible.",you:"Vous",player1:"Joueur 1",player2:"Joueur 2",wins:"gagne",yourMove:"À vous de jouer",toMove:"Aux {color} de jouer",kingInCheck:"Le roi des {color} est attaqué",check:"Échec",stockfishThinking:"Stockfish réfléchit",localThinking:"L’IA locale réfléchit",engineUnavailable:"Moteur indisponible",engineHelp:"Choisissez l’IA locale ou rechargez pour réessayer",timeExpired:"Temps écoulé",stalemate:"Pat",fiftyMove:"Règle des cinquante coups",repetition:"Triple répétition",insufficient:"Matériel insuffisant",promotePawn:"Promouvoir le pion",levelColor:"Niveau {level} · {color}"},
  zh:{localEngineBadge:"本地引擎",rules:"规则",currentGame:"当前对局",vsAi:"对战 AI",twoPlayers:"双人对战",playAs:"选择执棋",white:"白方",black:"黑方",random:"随机",aiEngine:"AI 引擎",localAi:"本地 AI",aiStrength:"AI 强度",casual:"休闲",balanced:"均衡",sharp:"强劲",timeControl:"时间控制",moves:"着法",played:"已走 {count} 步",emptyHistory:"对局记录将显示在这里。",newGame:"新对局",undo:"悔棋",privacy:"无需账户，无需 API 密钥。所有着法仅保留在此设备上。",quickGuide:"快速指南",howToPlay:"国际象棋玩法",basics:"基础",pieces:"棋子",special:"特殊规则",ending:"结束",protectKing:"保护你的王",protectKingText:"将死对方的王即可获胜：攻击它并让它无合法逃脱方式。",whiteFirst:"白方先行",whiteFirstText:"双方每次轮流走一步。",capturePieces:"吃掉对方棋子",capturePiecesText:"当棋子可以合法到达时，走到对方占据的格子即可吃子。",answerCheck:"必须应对将军",answerCheckText:"移动王、挡住攻击，或吃掉进攻棋子。",rook:"车",rookText:"沿横线或竖线移动任意距离。",bishop:"象",bishopText:"沿斜线移动任意距离。",queen:"后",queenText:"兼具车和象的走法。",knight:"马",knightText:"走日字，并且可以跳过棋子。",king:"王",kingText:"向任意方向移动一格。",pawn:"兵",pawnText:"向前移动，斜向吃子。",castling:"王车易位",castlingText:"王向未移动过的车方向移动两格。路径必须畅通且不受攻击。",enPassant:"吃过路兵",enPassantText:"相邻兵一次前进两格后，另一兵可立即将其吃掉。",promotion:"升变",promotionText:"兵到达最后一横线后可升变为后、车、象或马。",checkmate:"将死",checkmateText:"被将军的王没有合法应对方式，进攻方获胜。",draw:"和棋",drawText:"逼和、三次重复、子力不足或五十回合规则都可导致和棋。",time:"时间",timeText:"使用棋钟时，时间耗尽即判负，除非不可能将死。",you:"你",player1:"玩家 1",player2:"玩家 2",wins:"获胜",yourMove:"轮到你",toMove:"{color}走棋",kingInCheck:"{color}的王正受到攻击",check:"将军",stockfishThinking:"Stockfish 正在思考",localThinking:"本地 AI 正在思考",engineUnavailable:"引擎不可用",engineHelp:"请选择本地 AI 或刷新重试",timeExpired:"时间耗尽",stalemate:"逼和",fiftyMove:"五十回合规则",repetition:"三次重复",insufficient:"子力不足",promotePawn:"兵升变",levelColor:"等级 {level} · {color}"},
  hi:{localEngineBadge:"स्थानीय इंजन",rules:"नियम",currentGame:"वर्तमान खेल",vsAi:"AI के विरुद्ध",twoPlayers:"दो खिलाड़ी",playAs:"पक्ष चुनें",white:"सफ़ेद",black:"काला",random:"यादृच्छिक",aiEngine:"AI इंजन",localAi:"स्थानीय AI",aiStrength:"AI कठिनाई",casual:"आसान",balanced:"संतुलित",sharp:"कठिन",timeControl:"समय नियंत्रण",moves:"चालें",played:"{count} चालें",emptyHistory:"खेल का रिकॉर्ड यहाँ दिखाई देगा।",newGame:"नया खेल",undo:"चाल वापस",privacy:"कोई खाता नहीं। कोई API कुंजी नहीं। हर चाल इसी डिवाइस पर रहती है।",quickGuide:"त्वरित मार्गदर्शिका",howToPlay:"कैसे खेलें",basics:"मूल बातें",pieces:"मोहरें",special:"विशेष",ending:"समाप्ति",protectKing:"अपने राजा की रक्षा करें",protectKingText:"विरोधी राजा को शह-मात देकर जीतें: उस पर ऐसा हमला करें जिससे कोई वैध बचाव न हो।",whiteFirst:"सफ़ेद पहले चलता है",whiteFirstText:"खिलाड़ी बारी-बारी से एक चाल चलते हैं।",capturePieces:"विरोधी मोहरे पकड़ें",capturePiecesText:"जब आपका मोहरा कानूनी रूप से पहुँच सके, तो विरोधी की खाने वाली जगह पर जाएँ।",answerCheck:"हर शह का जवाब दें",answerCheckText:"राजा को हटाएँ, हमला रोकें या हमलावर मोहरे को पकड़ें।",rook:"हाथी",rookText:"सीधी पंक्ति या स्तंभ में कितनी भी दूर।",bishop:"ऊँट",bishopText:"तिरछी दिशा में कितनी भी दूर।",queen:"वज़ीर",queenText:"हाथी और ऊँट दोनों की तरह चलता है।",knight:"घोड़ा",knightText:"L आकार में चलता है और छलांग लगा सकता है।",king:"राजा",kingText:"किसी भी दिशा में एक घर।",pawn:"प्यादा",pawnText:"आगे चलता है और तिरछा पकड़ता है।",castling:"कैसलिंग",castlingText:"राजा को बिना चले हाथी की ओर दो घर चलाएँ। रास्ता खाली और सुरक्षित होना चाहिए।",enPassant:"एन पासां",enPassantText:"प्यादा पड़ोसी प्यादे को उसके दो घर बढ़ने के तुरंत बाद पकड़ सकता है।",promotion:"प्रमोशन",promotionText:"अंतिम पंक्ति पर पहुँचा प्यादा वज़ीर, हाथी, ऊँट या घोड़ा बनता है।",checkmate:"शह-मात",checkmateText:"शह में राजा के पास कोई वैध बचाव नहीं है। हमलावर जीतता है।",draw:"ड्रॉ",drawText:"स्टेलमेट, दोहराव, अपर्याप्त मोहरे या पचास-चाल नियम से ड्रॉ हो सकता है।",time:"समय",timeText:"घड़ी में समय समाप्त होने पर हार होती है, जब तक शह-मात असंभव न हो।",you:"आप",player1:"खिलाड़ी 1",player2:"खिलाड़ी 2",wins:"जीतता है",yourMove:"आपकी चाल",toMove:"{color} की चाल",kingInCheck:"{color} का राजा खतरे में है",check:"शह",stockfishThinking:"Stockfish सोच रहा है",localThinking:"स्थानीय AI सोच रहा है",engineUnavailable:"इंजन उपलब्ध नहीं",engineHelp:"स्थानीय AI चुनें या पुनः प्रयास के लिए रीलोड करें",timeExpired:"समय समाप्त",stalemate:"स्टेलमेट",fiftyMove:"पचास-चाल नियम",repetition:"तीन बार दोहराव",insufficient:"अपर्याप्त मोहरे",promotePawn:"प्यादे का प्रमोशन",levelColor:"स्तर {level} · {color}"}
};
let currentLanguage="en";try{currentLanguage=localStorage.getItem("quietKnightLanguage")||"en";}catch{}
const BEGINNER_TRANSLATIONS={
  en:{beginnerTerms:"Words every player should know",checkQuestion:"What is check?",checkAnswer:"Your king is under attack. Your next move must make the king safe.",checkmateQuestion:"What is checkmate?",checkmateAnswer:"Your king is in check and no legal move can save it. The game ends immediately.",illegalQuestion:"What makes a move illegal?",illegalAnswer:"A move is illegal if the piece cannot move that way or it leaves your own king in check.",kingCaptureQuestion:"Do you capture the king?",kingCaptureAnswer:"No. The game stops at checkmate, one move before the king could be captured.",stalemateQuestion:"What is stalemate?",stalemateAnswer:"The player has no legal move but the king is not in check. The game is a draw, not a win."},
  es:{beginnerTerms:"Palabras que todo jugador debe conocer",checkQuestion:"¿Qué es el jaque?",checkAnswer:"Tu rey está bajo ataque. Tu siguiente movimiento debe ponerlo a salvo.",checkmateQuestion:"¿Qué es el jaque mate?",checkmateAnswer:"Tu rey está en jaque y ningún movimiento legal puede salvarlo. La partida termina inmediatamente.",illegalQuestion:"¿Qué hace que un movimiento sea ilegal?",illegalAnswer:"Un movimiento es ilegal si la pieza no puede moverse así o si deja a tu propio rey en jaque.",kingCaptureQuestion:"¿Se captura al rey?",kingCaptureAnswer:"No. La partida termina en jaque mate, un movimiento antes de que el rey pudiera ser capturado.",stalemateQuestion:"¿Qué es el ahogado?",stalemateAnswer:"El jugador no tiene movimientos legales, pero su rey no está en jaque. La partida termina en tablas."},
  fr:{beginnerTerms:"Les mots que tout joueur doit connaître",checkQuestion:"Qu’est-ce qu’un échec ?",checkAnswer:"Votre roi est attaqué. Votre prochain coup doit le mettre en sécurité.",checkmateQuestion:"Qu’est-ce que l’échec et mat ?",checkmateAnswer:"Votre roi est en échec et aucun coup légal ne peut le sauver. La partie se termine immédiatement.",illegalQuestion:"Qu’est-ce qu’un coup illégal ?",illegalAnswer:"Un coup est illégal si la pièce ne peut pas se déplacer ainsi ou si votre roi reste en échec.",kingCaptureQuestion:"Capture-t-on le roi ?",kingCaptureAnswer:"Non. La partie s’arrête à l’échec et mat, juste avant que le roi puisse être capturé.",stalemateQuestion:"Qu’est-ce que le pat ?",stalemateAnswer:"Le joueur n’a aucun coup légal, mais son roi n’est pas en échec. La partie est nulle."},
  zh:{beginnerTerms:"每位棋手都应了解的术语",checkQuestion:"什么是将军？",checkAnswer:"你的王正在受到攻击。下一步必须让王脱离危险。",checkmateQuestion:"什么是将死？",checkmateAnswer:"王被将军，并且没有任何合法着法可以解救。对局立即结束。",illegalQuestion:"什么是非法着法？",illegalAnswer:"棋子不能那样移动，或走后自己的王仍被将军，这步棋就是非法的。",kingCaptureQuestion:"需要吃掉王吗？",kingCaptureAnswer:"不需要。对局在将死时结束，也就是王可能被吃掉的前一步。",stalemateQuestion:"什么是逼和？",stalemateAnswer:"一方没有合法着法，但王并未被将军。对局判和，而不是胜利。"},
  hi:{beginnerTerms:"हर खिलाड़ी को जानने योग्य शब्द",checkQuestion:"शह क्या है?",checkAnswer:"आपके राजा पर हमला हो रहा है। अगली चाल में राजा को सुरक्षित करना जरूरी है।",checkmateQuestion:"शह-मात क्या है?",checkmateAnswer:"राजा शह में है और कोई भी वैध चाल उसे नहीं बचा सकती। खेल तुरंत समाप्त हो जाता है।",illegalQuestion:"चाल अवैध कब होती है?",illegalAnswer:"जब मोहरा उस तरह नहीं चल सकता या चाल के बाद अपना राजा शह में रहता है, तो चाल अवैध है।",kingCaptureQuestion:"क्या राजा को पकड़ा जाता है?",kingCaptureAnswer:"नहीं। खेल शह-मात पर, राजा के पकड़े जाने से एक चाल पहले, समाप्त हो जाता है।",stalemateQuestion:"स्टेलमेट क्या है?",stalemateAnswer:"खिलाड़ी के पास कोई वैध चाल नहीं है, लेकिन राजा शह में नहीं है। खेल ड्रॉ होता है।"}
};
const FEATURE_TRANSLATIONS={
  en:{online:"Online",onlineGame:"Online game",notConnected:"Not connected",onlineHelp:"Create a private link, then send it to the other player.",createInvite:"Create invite link",waitingPlayer:"Waiting for player",connecting:"Connecting",connected:"Connected",opponent:"Opponent",copyInvite:"Copy invite link",copied:"Link copied",appearance:"Appearance",boardTheme:"Board",pieceSet:"Pieces",classic:"Classic",analyzeGame:"Analyze game",postGame:"POST-GAME",gameAnalysis:"Game analysis",readyToAnalyze:"Ready to analyze",runAnalysis:"Run Stockfish analysis",bestMoves:"Best moves",mistakes:"Mistakes",missedWins:"Missed wins",evaluation:"Evaluation",whiteAdvantage:"White advantage ↑",analysisUnavailable:"Analysis is available on the hosted version.",analyzing:"Analyzing move {current} of {total}",best:"Best",good:"Good",inaccuracy:"Inaccuracy",mistake:"Mistake",blunder:"Blunder",missedWin:"Missed win"},
  es:{online:"En línea",onlineGame:"Partida en línea",notConnected:"Sin conexión",onlineHelp:"Crea un enlace privado y envíaselo al otro jugador.",createInvite:"Crear enlace de invitación",waitingPlayer:"Esperando jugador",connecting:"Conectando",connected:"Conectado",opponent:"Rival",copyInvite:"Copiar invitación",copied:"Enlace copiado",appearance:"Apariencia",boardTheme:"Tablero",pieceSet:"Piezas",classic:"Clásico",analyzeGame:"Analizar partida",postGame:"DESPUÉS DE LA PARTIDA",gameAnalysis:"Análisis de la partida",readyToAnalyze:"Listo para analizar",runAnalysis:"Ejecutar análisis de Stockfish",bestMoves:"Mejores jugadas",mistakes:"Errores",missedWins:"Victorias perdidas",evaluation:"Evaluación",whiteAdvantage:"Ventaja de blancas ↑",analysisUnavailable:"El análisis está disponible en la versión alojada.",analyzing:"Analizando jugada {current} de {total}",best:"Mejor",good:"Buena",inaccuracy:"Imprecisión",mistake:"Error",blunder:"Error grave",missedWin:"Victoria perdida"},
  fr:{online:"En ligne",onlineGame:"Partie en ligne",notConnected:"Non connecté",onlineHelp:"Créez un lien privé, puis envoyez-le à l’autre joueur.",createInvite:"Créer un lien d’invitation",waitingPlayer:"En attente d’un joueur",connecting:"Connexion",connected:"Connecté",opponent:"Adversaire",copyInvite:"Copier l’invitation",copied:"Lien copié",appearance:"Apparence",boardTheme:"Échiquier",pieceSet:"Pièces",classic:"Classique",analyzeGame:"Analyser la partie",postGame:"APRÈS-PARTIE",gameAnalysis:"Analyse de la partie",readyToAnalyze:"Prêt à analyser",runAnalysis:"Lancer l’analyse Stockfish",bestMoves:"Meilleurs coups",mistakes:"Erreurs",missedWins:"Gains manqués",evaluation:"Évaluation",whiteAdvantage:"Avantage des Blancs ↑",analysisUnavailable:"L’analyse est disponible sur la version hébergée.",analyzing:"Analyse du coup {current} sur {total}",best:"Meilleur",good:"Bon",inaccuracy:"Imprécision",mistake:"Erreur",blunder:"Gaffe",missedWin:"Gain manqué"},
  zh:{online:"在线",onlineGame:"在线对局",notConnected:"未连接",onlineHelp:"创建私人链接，然后发送给另一位玩家。",createInvite:"创建邀请链接",waitingPlayer:"等待玩家",connecting:"正在连接",connected:"已连接",opponent:"对手",copyInvite:"复制邀请链接",copied:"链接已复制",appearance:"外观",boardTheme:"棋盘",pieceSet:"棋子",classic:"经典",analyzeGame:"分析对局",postGame:"赛后",gameAnalysis:"对局分析",readyToAnalyze:"可以开始分析",runAnalysis:"运行 Stockfish 分析",bestMoves:"最佳着法",mistakes:"错误",missedWins:"错失胜机",evaluation:"局面评估",whiteAdvantage:"白方优势 ↑",analysisUnavailable:"分析功能可在托管版本中使用。",analyzing:"正在分析第 {current}/{total} 步",best:"最佳",good:"良好",inaccuracy:"不精确",mistake:"错误",blunder:"严重错误",missedWin:"错失胜机"},
  hi:{online:"ऑनलाइन",onlineGame:"ऑनलाइन खेल",notConnected:"कनेक्ट नहीं",onlineHelp:"निजी लिंक बनाएँ और दूसरे खिलाड़ी को भेजें।",createInvite:"आमंत्रण लिंक बनाएँ",waitingPlayer:"खिलाड़ी की प्रतीक्षा",connecting:"कनेक्ट हो रहा है",connected:"कनेक्टेड",opponent:"प्रतिद्वंद्वी",copyInvite:"आमंत्रण कॉपी करें",copied:"लिंक कॉपी हुआ",appearance:"दिखावट",boardTheme:"बोर्ड",pieceSet:"मोहरें",classic:"क्लासिक",analyzeGame:"खेल का विश्लेषण",postGame:"खेल के बाद",gameAnalysis:"खेल विश्लेषण",readyToAnalyze:"विश्लेषण के लिए तैयार",runAnalysis:"Stockfish विश्लेषण चलाएँ",bestMoves:"सर्वश्रेष्ठ चालें",mistakes:"गलतियाँ",missedWins:"छूटी जीत",evaluation:"मूल्यांकन",whiteAdvantage:"सफ़ेद की बढ़त ↑",analysisUnavailable:"विश्लेषण होस्ट किए गए संस्करण पर उपलब्ध है।",analyzing:"चाल {current}/{total} का विश्लेषण",best:"सर्वश्रेष्ठ",good:"अच्छी",inaccuracy:"चूक",mistake:"गलती",blunder:"बड़ी गलती",missedWin:"छूटी जीत"}
};
const CONNECTION_TRANSLATIONS={
  en:{connectionFailed:"Connection failed",retryConnection:"Retry connection",guestHelp:"Keep this page open while reconnecting to the host."},
  es:{connectionFailed:"Conexión fallida",retryConnection:"Reintentar conexión",guestHelp:"Mantén esta página abierta mientras se reconecta con el anfitrión."},
  fr:{connectionFailed:"Connexion échouée",retryConnection:"Réessayer",guestHelp:"Gardez cette page ouverte pendant la reconnexion à l’hôte."},
  zh:{connectionFailed:"连接失败",retryConnection:"重新连接",guestHelp:"重新连接主机时请保持此页面打开。"},
  hi:{connectionFailed:"कनेक्शन विफल",retryConnection:"फिर कनेक्ट करें",guestHelp:"होस्ट से दोबारा जुड़ते समय यह पेज खुला रखें।"}
};
function t(key,values={}){let text=CONNECTION_TRANSLATIONS[currentLanguage]?.[key]??FEATURE_TRANSLATIONS[currentLanguage]?.[key]??BEGINNER_TRANSLATIONS[currentLanguage]?.[key]??TRANSLATIONS[currentLanguage]?.[key]??CONNECTION_TRANSLATIONS.en[key]??FEATURE_TRANSLATIONS.en[key]??BEGINNER_TRANSLATIONS.en[key]??TRANSLATIONS.en[key]??key;for(const [name,value]of Object.entries(values))text=text.replace(`{${name}}`,value);return text;}
function winnerTitle(winner){const templates={en:"{winner} wins",es:"Gana {winner}",fr:"Victoire de {winner}",zh:"{winner}获胜",hi:"{winner} की जीत"};return (templates[currentLanguage]||templates.en).replace("{winner}",winner);}
function applyLanguage(){document.documentElement.lang=currentLanguage;$("languageSelect").value=currentLanguage;document.querySelectorAll("[data-i18n]").forEach(element=>{element.textContent=t(element.dataset.i18n);});const difficultyKey=["casual","balanced","sharp"][state.depth-1];$("difficultyLabel").dataset.i18n=difficultyKey;$("difficultyLabel").textContent=t(difficultyKey);if(onlineRole==="guest"){$("createInviteButton").textContent=t("retryConnection");$("onlineHelp").textContent=t("guestHelp");}applyPlayerLabels();render();}
let currentTheme="forest";try{currentTheme=localStorage.getItem("quietKnightTheme")||"forest";state.pieceSet=localStorage.getItem("quietKnightPieces")||"cburnett";}catch{}
function applyAppearance(){document.body.dataset.theme=currentTheme;document.querySelectorAll("[data-theme]").forEach(button=>button.classList.toggle("active",button.dataset.theme===currentTheme));document.querySelectorAll("[data-pieces]").forEach(button=>button.classList.toggle("active",button.dataset.pieces===state.pieceSet));if(state.board.length)renderBoard();}

function clonePosition(s) { return { board: s.board.map(p => p ? { ...p } : null), turn: s.turn, enPassant: s.enPassant, castling: { ...s.castling }, halfmove: s.halfmove }; }
function colorName(c) { return t(c === "w" ? "white" : "black"); }
function rc(i) { return [Math.floor(i / 8), i % 8]; }
function idx(r, c) { return r * 8 + c; }
function inside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function squareName(i) { const [r, c] = rc(i); return FILES[c] + (8 - r); }
function opposite(c) { return c === "w" ? "b" : "w"; }
function randomColor(){const value=new Uint8Array(1);crypto.getRandomValues(value);return value[0]%2?"w":"b";}

function resetGame() {
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  if(checkAudioTimer){clearTimeout(checkAudioTimer);checkAudioTimer=null;}
  if(clockTimer){clearInterval(clockTimer);clockTimer=null;}
  pendingEngineMove=false;
  if(stockfish){stockfishReady=false;stockfish.postMessage("stop");stockfish.postMessage("ucinewgame");stockfish.postMessage("isready");}
  [CAPTURE_AUDIO,CHECK_AUDIO,...Object.values(OUTCOME_AUDIO)].forEach(audio=>{try{audio.pause();if(audio.readyState>0)audio.currentTime=0;}catch{}});
  if(state.mode==="ai")state.playerColor=state.sideChoice==="random"?randomColor():state.sideChoice;else if(state.mode==="local")state.playerColor="w";
  state.flipped=(state.mode==="ai"||state.mode==="online")&&state.playerColor==="b";
  const clock=CLOCKS[state.clockChoice];state.clocks={w:clock.seconds,b:clock.seconds};state.lastTick=clock.seconds===null?null:performance.now();
  state.board = START.map(code => code ? { color: code[0], type: code[1] } : null);
  Object.assign(state, { turn: "w", selected: null, legal: [], history: [], lastMove: null, busy: false, over: false, outcome: null, enPassant: null, castling: { wk: true, wq: true, bk: true, bq: true }, halfmove: 0, positions: new Map() });
  applyPlayerLabels();recordPosition();render();startClock();if(isAiTurn())scheduleAiMove();
}

function isAiTurn(){return state.mode==="ai"&&state.turn!==state.playerColor;}
function isRemoteTurn(){return state.mode==="online"&&(!connection?.open||state.turn!==state.playerColor);}
function scheduleAiMove(){if(state.over||!isAiTurn())return;state.busy=true;render();aiTimer=setTimeout(()=>{aiTimer=null;updateClock();if(state.over)return;if(state.engineChoice==="local"){const move=chooseLocalAiMove();state.busy=false;if(move)commitMove(move);}else if(stockfishReady)requestStockfishMove();},260);}
function startClock(){if(state.clocks.w===null||state.mode==="online"&&!connection?.open)return;clockTimer=setInterval(()=>{updateClock();renderClocks();},200);}
function updateClock(){
  if(state.lastTick===null||state.over||state.mode==="online"&&!connection?.open)return;
  const now=performance.now(),elapsed=(now-state.lastTick)/1000;state.lastTick=now;state.clocks[state.turn]=Math.max(0,state.clocks[state.turn]-elapsed);
  if(state.clocks[state.turn]<=0){state.outcome={titleKey:"time",textKey:"timeExpired",winner:opposite(state.turn)};state.over=true;state.busy=false;pendingEngineMove=false;if(stockfish)stockfish.postMessage("stop");if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}if(clockTimer){clearInterval(clockTimer);clockTimer=null;}playOutcomeSound(state.outcome);render();}
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
  const moves = legalMoves(pos); if (!moves.length) return inCheck(pos, pos.turn) ? { titleKey: "checkmate", textKey: "checkmate", winner: opposite(pos.turn) } : { titleKey: "draw", textKey: "stalemate" };
  if (pos.halfmove >= 100) return { titleKey: "draw", textKey: "fiftyMove" };
  if ((state.positions.get(positionKey(pos))||0) >= 3) return { titleKey: "draw", textKey: "repetition" };
  const material = pos.board.filter(Boolean); if (material.every(p => p.type === "k" || p.type === "b" || p.type === "n") && material.length <= 3) return { titleKey: "draw", textKey: "insufficient" };
  return null;
}

function resultDisplay(result) {
  if (!result) return null;
  if (!result.winner) return {title:t(result.titleKey),text:t(result.textKey)};
  const winner = state.mode === "ai" || state.mode === "online"
    ? (result.winner === state.playerColor ? t("you") : state.mode==="online"?t("opponent"):(state.engineChoice === "stockfish" ? "Stockfish" : (currentLanguage==="es"||currentLanguage==="fr"?"IA":"AI")))
    : (result.winner === "w" ? t("player1") : t("player2"));
  return { title: winnerTitle(winner), text: t(result.textKey) };
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

let analysisWorker=null,analysisBootResolve=null,analysisTask=null,analysisInfo=null;
function initAnalysisEngine(){
  if(location.protocol==="file:")return Promise.reject(new Error("hosted-only"));
  if(analysisWorker)return Promise.resolve();
  return new Promise((resolve,reject)=>{try{analysisWorker=new Worker("assets/stockfish/stockfish.js");analysisBootResolve=resolve;analysisWorker.onerror=()=>reject(new Error("engine"));analysisWorker.onmessage=event=>handleAnalysisLine(event.data);analysisWorker.postMessage("uci");}catch(error){reject(error);}});
}
function handleAnalysisLine(line){
  if(typeof line!=="string")return;
  if(line==="uciok"){analysisWorker.postMessage("setoption name Hash value 16");analysisWorker.postMessage("isready");return;}
  if(line==="readyok"&&analysisBootResolve){const resolve=analysisBootResolve;analysisBootResolve=null;resolve();return;}
  if(line.startsWith("info ")&&analysisTask){const score=line.match(/score (cp|mate) (-?\d+)/),pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/);if(score){const raw=score[1]==="mate"?Math.sign(Number(score[2]))*1000:Number(score[2])/100;analysisInfo={raw,best:pv?.[1]||analysisInfo?.best||null};}return;}
  if(line.startsWith("bestmove ")&&analysisTask){const resolve=analysisTask;analysisTask=null;const best=line.split(" ")[1];resolve({...analysisInfo,best:best&&best!=="(none)"?best:analysisInfo?.best||null});}
}
function analyzePosition(pos){return new Promise(resolve=>{analysisInfo={raw:0,best:null};analysisTask=result=>resolve({score:pos.turn==="w"?result.raw:-result.raw,best:result.best});analysisWorker.postMessage(`position fen ${positionFen(pos)}`);analysisWorker.postMessage("go movetime 120");});}
function moveUci(entry){return entry.move?squareName(entry.move.from)+squareName(entry.move.to)+(entry.move.promotion||""):"";}
function evaluationText(value){if(Math.abs(value)>=900)return value>0?"+M":"-M";return `${value>=0?"+":""}${value.toFixed(2)}`;}
function classifyMove(entry,before,after){const moverSign=entry.color==="w"?1:-1,beforeMover=before.score*moverSign,afterMover=after.score*moverSign,loss=beforeMover-afterMover;if(beforeMover>=5&&afterMover<2)return"missedWin";if(moveUci(entry)===before.best)return"best";if(loss>=3)return"blunder";if(loss>=1.5)return"mistake";if(loss>=.75)return"inaccuracy";return"good";}
function drawEvaluationGraph(values){const canvas=$("evaluationChart"),ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,pad=24;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#343936";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad,h/2);ctx.lineTo(w-pad,h/2);ctx.stroke();if(values.length<2)return;ctx.strokeStyle="#d7f171";ctx.lineWidth=4;ctx.lineJoin="round";ctx.beginPath();values.forEach((value,index)=>{const x=pad+index*(w-pad*2)/(values.length-1),y=h/2-Math.max(-8,Math.min(8,value))*(h/2-pad)/8;index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
async function runGameAnalysis(){
  const history=[...state.history],positions=history.map(entry=>clonePosition(entry.snapshot));positions.push(clonePosition(state));$("runAnalysisButton").disabled=true;
  try{await initAnalysisEngine();const results=[];for(let i=0;i<positions.length;i++){$("analysisProgress").querySelector("span").textContent=t("analyzing",{current:i+1,total:positions.length});results.push(await analyzePosition(positions[i]));}
    let best=0,mistakes=0,missed=0;const list=$("analysisList");list.innerHTML="";history.forEach((entry,index)=>{const label=classifyMove(entry,results[index],results[index+1]);if(label==="best")best++;if(label==="mistake"||label==="blunder")mistakes++;if(label==="missedWin")missed++;const row=document.createElement("div");row.className="analysis-move";const number=document.createElement("span");number.className="move-number";number.textContent=`${Math.floor(index/2)+1}${entry.color==="w"?".":"..."}`;const move=document.createElement("strong");move.textContent=entry.notation;const detail=document.createElement("div"),badge=document.createElement("span"),evaluation=document.createElement("span");badge.className=`analysis-label ${label==="missedWin"?"missed":label}`;badge.textContent=t(label);evaluation.textContent=` ${evaluationText(results[index].score)} → ${evaluationText(results[index+1].score)}`;detail.append(badge,evaluation);row.append(number,move,detail);list.appendChild(row);});
    $("bestCount").textContent=best;$("mistakeCount").textContent=mistakes;$("missedCount").textContent=missed;$("analysisProgress").hidden=true;$("analysisResults").hidden=false;drawEvaluationGraph(results.map(result=>result.score));
  }catch{$("analysisProgress").querySelector("span").textContent=t("analysisUnavailable");$("runAnalysisButton").disabled=false;}
}

function commitMove(move, promotion = "q", remote = false) {
  updateClock();if(state.over)return;
  const snapshot = { ...clonePosition(state), history: state.history.map(h => ({...h})), lastMove: state.lastMove, positions: new Map(state.positions), clocks: { ...state.clocks } };
  const before = clonePosition(state), after = applyMove(state, move, promotion);
  Object.assign(state, after); state.history.push({ snapshot, notation: notation(before,move,after,promotion), color: before.turn, captured: move.capture || null, move:{from:move.from,to:move.to,promotion:move.promotion?promotion:null} });
  state.lastMove = { from: move.from, to: move.to }; state.selected=null; state.legal=[]; recordPosition();
  if(state.clocks[before.turn]!==null)state.clocks[before.turn]+=CLOCKS[state.clockChoice].increment;state.lastTick=state.clocks.w===null?null:performance.now();
  const result=gameResult(state);
  if(result){state.outcome=result;state.over=true;if(clockTimer){clearInterval(clockTimer);clockTimer=null;}playOutcomeSound(result);}
  else if(inCheck(state,state.turn))playCheckSound();
  else playTone(!!move.capture || move.enPassant);
  render();
  if(state.mode==="online"&&!remote&&connection?.open)connection.send({type:"move",from:move.from,to:move.to,promotion,clocks:state.clocks});
  if(isAiTurn()&&!state.over)scheduleAiMove();
}

function handleSquare(index) {
  if (state.busy || state.over || isAiTurn() || isRemoteTurn()) return;
  const targetMove=state.legal.find(m=>m.to===index);
  if(targetMove){ if(targetMove.promotion){ showPromotion(targetMove); return; } commitMove(targetMove); return; }
  if(state.board[index]?.color===state.turn){ state.selected=index; state.legal=legalMoves(state).filter(m=>m.from===index); } else { state.selected=null; state.legal=[]; }
  renderBoard();
}

function showPromotion(move) {
  const dialog=$("promotionDialog"), box=$("promotionChoices"); box.innerHTML="";
  for(const type of ["q","r","b","n"]){ const b=document.createElement("button"),image=document.createElement("img");image.src=pieceAsset(state.turn,type);image.alt="";image.draggable=false;b.appendChild(image);b.setAttribute("aria-label",`${t("promotion")}: ${t({q:"queen",r:"rook",b:"bishop",n:"knight"}[type])}`); b.onclick=()=>{dialog.hidden=true;commitMove(move,type);}; box.appendChild(b); }
  dialog.hidden=false;
}

function renderBoard() {
  const board=$("board"); board.innerHTML=""; const order=[...Array(64).keys()]; if(state.flipped) order.reverse();
  const checkedKing=inCheck(state,state.turn)?state.board.findIndex(p=>p?.color===state.turn&&p.type==="k"):-1;
  for(const i of order){ const [r,c]=rc(i), button=document.createElement("button"), p=state.board[i], legal=state.legal.find(m=>m.to===i);
    button.className=`square ${(r+c)%2?"dark":"light"}${state.selected===i?" selected":""}${state.lastMove&&(state.lastMove.from===i||state.lastMove.to===i)?" last-move":""}${checkedKing===i?" in-check":""}${legal?" legal":""}${legal?.capture?" capture":""}`;
    button.dataset.square=squareName(i); button.setAttribute("role","gridcell"); button.setAttribute("aria-label",`${squareName(i)}${p?", "+colorName(p.color)+" "+t({k:"king",q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"}[p.type]):", empty"}`); button.onclick=()=>handleSquare(i);
    if(p){const image=document.createElement("img");image.className="piece";image.src=pieceAsset(p.color,p.type);image.alt="";image.draggable=false;button.appendChild(image);}
    const displayR=state.flipped?7-r:r, displayC=state.flipped?7-c:c;
    if(displayC===0){const s=document.createElement("span");s.className="coord rank";s.textContent=8-r;button.appendChild(s);} if(displayR===7){const s=document.createElement("span");s.className="coord file";s.textContent=FILES[c];button.appendChild(s);}
    board.appendChild(button);
  }
}

function renderHistory() {
  const list=$("moveList"); if(!state.history.length){list.className="move-list empty";list.innerHTML="";const message=document.createElement("span");message.textContent=t("emptyHistory");list.appendChild(message);return;}
  list.className="move-list"; list.innerHTML="";
  for(let i=0;i<state.history.length;i+=2){const row=document.createElement("div");row.className="move-row";row.innerHTML=`<span>${i/2+1}.</span><span>${state.history[i]?.notation||""}</span><span>${state.history[i+1]?.notation||""}</span>`;list.appendChild(row);} list.scrollTop=list.scrollHeight;
}

function render() {
  renderBoard(); renderHistory(); renderClocks(); const result=state.outcome||gameResult(state), displayResult=resultDisplay(result), check=inCheck(state,state.turn);
  const engineFailed=state.engineChoice==="stockfish"&&state.engineError;
  const onlineWaiting=state.mode==="online"&&!connection?.open;
  $("statusTitle").textContent=displayResult?.title || (onlineWaiting?t(onlineRole==="guest"?"connecting":"waitingPlayer"):engineFailed?t("engineUnavailable"):state.busy?t(state.engineChoice==="stockfish"?"stockfishThinking":"localThinking"):check?t("check"):(state.mode==="ai"||state.mode==="online")&&state.turn===state.playerColor?t("yourMove"):t("toMove",{color:colorName(state.turn)}));
  $("statusText").textContent=displayResult?.text || (onlineWaiting?t("onlineHelp"):engineFailed?t("engineHelp"):check?t("kingInCheck",{color:colorName(state.turn)}):t("toMove",{color:colorName(state.turn)}));
  const bottomColor=state.mode==="ai"?state.playerColor:"w",topColor=opposite(bottomColor);
  $("whiteTurn").classList.toggle("active",state.turn===bottomColor&&!state.over);$("whiteTurn").setAttribute("aria-label",t("toMove",{color:colorName(bottomColor)}));
  $("blackTurn").classList.toggle("active",state.turn===topColor&&!state.over);$("blackTurn").setAttribute("aria-label",t("toMove",{color:colorName(topColor)}));
  $("moveCount").textContent=t("played",{count:state.history.length}); $("undoButton").disabled=!state.history.length||state.busy||state.mode==="online";
  $("analysisButton").disabled=!state.over;
  const whiteCaps=state.history.filter(h=>h.color==="w"&&h.captured).map(h=>({color:"b",type:h.captured.type})); const blackCaps=state.history.filter(h=>h.color==="b"&&h.captured).map(h=>({color:"w",type:h.captured.type}));
  renderCaptured("whiteCaptured",bottomColor==="w"?whiteCaps:blackCaps);renderCaptured("blackCaptured",topColor==="w"?whiteCaps:blackCaps);
}

function renderCaptured(id,pieces){const container=$(id);container.innerHTML="";for(const piece of pieces){const image=document.createElement("img");image.className=`captured-piece ${piece.color==="b"?"captured-black":"captured-white"}`;image.src=pieceAsset(piece.color,piece.type);image.alt="";image.draggable=false;container.appendChild(image);}}

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
  const versus=state.mode==="ai"||state.mode==="online";
  $("playerName").textContent=versus?t("you"):t("player1");$("playerAvatar").textContent=versus?"YOU":"P1";$("playerDetail").textContent=versus?player:t("white");
  $("opponentName").textContent=state.mode==="ai"?(state.engineChoice==="stockfish"?"Stockfish":t("localAi")):state.mode==="online"?t("opponent"):t("player2");$("opponentAvatar").textContent=state.mode==="ai"?(state.engineChoice==="stockfish"?"SF":"QK"):state.mode==="online"?"P2P":"P2";$("opponentDetail").textContent=state.mode==="ai"?t("levelColor",{level:state.depth,color:ai}):state.mode==="online"?ai:t("black");
}
function setMode(mode){
  state.mode=mode;for(const [id,value] of [["aiMode","ai"],["localMode","local"],["onlineMode","online"]]){$(id).classList.toggle("active",mode===value);$(id).setAttribute("aria-selected",mode===value);}$("difficultySetting").hidden=mode!=="ai";
  $("sideSetting").hidden=mode!=="ai"&&mode!=="online";$("engineSetting").hidden=mode!=="ai";$("onlineSetting").hidden=mode!=="online";
  const sideChoice=mode==="online"?state.onlineSideChoice:state.sideChoice;document.querySelectorAll("[data-side]").forEach(item=>item.classList.toggle("active",item.dataset.side===sideChoice));
  resetGame();
}

function setConnectionState(key,connected=false){$("connectionState").textContent=t(key);$("connectionState").classList.toggle("connected",connected);render();}
function stopConnectionTimer(){if(connectionTimer){clearTimeout(connectionTimer);connectionTimer=null;}if(helloTimer){clearInterval(helloTimer);helloTimer=null;}}
function pauseOnlineClock(){if(clockTimer){clearInterval(clockTimer);clockTimer=null;}state.lastTick=state.clocks.w===null?null:performance.now();renderClocks();}
function closeOnline(){stopConnectionTimer();for(const client of relayClients){client.removeAllListeners();try{client.end(true);}catch{}}connection=null;relayClients=[];onlineRole=null;onlineClientId=null;onlineMessageSeq=0;receivedOnlineMessages.clear();}
function connectionFailed(){closeOnline();pauseOnlineClock();$("createInviteButton").disabled=false;setConnectionState("connectionFailed");}
function handleOnlineData(data){
  if(!data||typeof data!=="object")return;
  if(data.type==="move"&&Number.isInteger(data.from)&&Number.isInteger(data.to)){const move=legalMoves(state).find(candidate=>candidate.from===data.from&&candidate.to===data.to);if(move&&state.turn!==state.playerColor){commitMove(move,/^[qrbn]$/.test(data.promotion)?data.promotion:"q",true);if(data.clocks){state.clocks={w:data.clocks.w===null?null:Number(data.clocks.w),b:data.clocks.b===null?null:Number(data.clocks.b)};state.lastTick=state.clocks.w===null?null:performance.now();renderClocks();}}}
  if(data.type==="reset"){if(CLOCKS[data.clockChoice])setClockChoice(data.clockChoice,false);else resetGame();}
}
function connectRelay(room,role,hostColor){
  if(typeof mqtt==="undefined"||!/^[a-zA-Z0-9-]{8,100}$/.test(room)){connectionFailed();return;}
  closeOnline();onlineRole=role;onlineClientId=`qk-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
  const topic=`quiet-knight/v1/${room}`,brokers=["wss://broker.emqx.io:8084/mqtt","wss://broker.hivemq.com:8884/mqtt"];
  connection={open:false,send(data){const message=JSON.stringify({...data,sender:onlineClientId,messageId:`${onlineClientId}-${++onlineMessageSeq}`});for(const client of relayClients)if(client.connected)client.publish(topic,message,{qos:1});},close(){closeOnline();}};
  const markConnected=()=>{if(connection?.open)return;connection.open=true;stopConnectionTimer();$("createInviteButton").hidden=true;setConnectionState("connected",true);resetGame();};
  const receive=(_,payload)=>{let data;try{data=JSON.parse(payload.toString());}catch{return;}if(!data||data.sender===onlineClientId||data.messageId&&receivedOnlineMessages.has(data.messageId))return;if(data.messageId){receivedOnlineMessages.add(data.messageId);if(receivedOnlineMessages.size>200)receivedOnlineMessages.delete(receivedOnlineMessages.values().next().value);}if(role==="host"&&data.type==="hello"){markConnected();connection?.send({type:"ready",hostColor});return;}if(role==="guest"&&data.type==="ready"){markConnected();return;}if(connection?.open)handleOnlineData(data);};
  for(const [index,url] of brokers.entries()){const client=mqtt.connect(url,{clientId:`${onlineClientId}-${index}`,clean:true,connectTimeout:12000,reconnectPeriod:2500,keepalive:30});relayClients.push(client);client.on("connect",()=>client.subscribe(topic,{qos:1},error=>{if(error)return;if(role==="host"&&!connection?.open)setConnectionState("waitingPlayer");else if(role==="guest"&&!connection?.open)connection.send({type:"hello"});}));client.on("message",receive);client.on("error",()=>{});}
  if(role==="guest")helloTimer=setInterval(()=>{if(!connection?.open)connection?.send({type:"hello"});},2000);
  connectionTimer=setTimeout(()=>{if(!connection?.open)connectionFailed();},30000);
}
function createInvite(){setMode("online");const hostColor=state.onlineSideChoice==="random"?randomColor():state.onlineSideChoice,room=`qk-${crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}`;state.playerColor=hostColor;state.flipped=hostColor==="b";applyPlayerLabels();renderBoard();$("createInviteButton").hidden=false;$("createInviteButton").disabled=true;$("createInviteButton").textContent=t("createInvite");$("createInviteButton").onclick=createInvite;$("onlineHelp").textContent=t("onlineHelp");const base=location.protocol==="file:"?"https://gabeliu.github.io/chess-ai/":`${location.origin}${location.pathname}`;$("inviteLink").value=`${base}?room=${encodeURIComponent(room)}&host=${hostColor}`;$("inviteRow").hidden=false;setConnectionState("connecting");connectRelay(room,"host",hostColor);}
function joinInvite(room,hostColor="w"){setMode("online");hostColor=hostColor==="b"?"b":"w";state.playerColor=opposite(hostColor);state.flipped=state.playerColor==="b";$("createInviteButton").hidden=false;$("createInviteButton").disabled=true;$("createInviteButton").textContent=t("retryConnection");$("createInviteButton").onclick=()=>joinInvite(room,hostColor);$("onlineHelp").textContent=t("guestHelp");setConnectionState("connecting");connectRelay(room,"guest",hostColor);}
function resetAndShare(){resetGame();if(state.mode==="online"&&connection?.open)connection.send({type:"reset",clockChoice:state.clockChoice});}
function setClockChoice(choice,share=true){
  if(!CLOCKS[choice])return;state.clockChoice=choice;document.querySelectorAll("[data-clock]").forEach(item=>item.classList.toggle("active",item.dataset.clock===choice));resetGame();
  if(share&&state.mode==="online"&&connection?.open)connection.send({type:"reset",clockChoice:choice});
}

$("brandHome").onclick=(event)=>{event.preventDefault();window.location.reload();}; $("newGameButton").onclick=resetAndShare; $("undoButton").onclick=undo; $("flipButton").onclick=()=>{state.flipped=!state.flipped;renderBoard();}; $("soundButton").onclick=()=>{state.sound=!state.sound;if(!state.sound){CHECK_AUDIO.pause();CHECK_AUDIO.currentTime=0;if(checkAudioTimer){clearTimeout(checkAudioTimer);checkAudioTimer=null;}}$("soundButton").textContent=state.sound?"♪":"×";$("soundButton").setAttribute("aria-label",state.sound?"Mute sound":"Enable sound");};
$("aiMode").onclick=()=>{closeOnline();setMode("ai");}; $("localMode").onclick=()=>{closeOnline();setMode("local");}; $("onlineMode").onclick=()=>setMode("online"); $("difficulty").oninput=(e)=>{state.depth=Number(e.target.value);const key=["casual","balanced","sharp"][state.depth-1];$("difficultyLabel").dataset.i18n=key;$("difficultyLabel").textContent=t(key);applyPlayerLabels();};
$("createInviteButton").onclick=createInvite;$("copyInviteButton").onclick=async()=>{try{await navigator.clipboard.writeText($("inviteLink").value);setConnectionState("copied",true);setTimeout(()=>setConnectionState(connection?.open?"connected":"waitingPlayer",!!connection?.open),1200);}catch{}};
document.querySelectorAll("[data-theme]").forEach(button=>button.onclick=()=>{currentTheme=button.dataset.theme;try{localStorage.setItem("quietKnightTheme",currentTheme);}catch{}applyAppearance();});
document.querySelectorAll("[data-pieces]").forEach(button=>button.onclick=()=>{state.pieceSet=button.dataset.pieces;try{localStorage.setItem("quietKnightPieces",state.pieceSet);}catch{}applyAppearance();});
$("languageSelect").addEventListener("input",event=>{currentLanguage=event.target.value;try{localStorage.setItem("quietKnightLanguage",currentLanguage);}catch{}applyLanguage();});
document.querySelectorAll("[data-side]").forEach(button=>button.onclick=()=>{if(state.mode==="online")state.onlineSideChoice=button.dataset.side;else state.sideChoice=button.dataset.side;document.querySelectorAll("[data-side]").forEach(item=>item.classList.toggle("active",item===button));resetGame();});
document.querySelectorAll("[data-engine]").forEach(button=>button.onclick=()=>{state.engineChoice=button.dataset.engine;state.engineError=false;document.querySelectorAll("[data-engine]").forEach(item=>item.classList.toggle("active",item===button));resetGame();});
document.querySelectorAll("[data-clock]").forEach(button=>button.onclick=()=>setClockChoice(button.dataset.clock));
function openRules(){$("rulesOverlay").hidden=false;document.body.classList.add("rules-open");$("closeRulesButton").focus();}
function closeRules(){$("rulesOverlay").hidden=true;document.body.classList.remove("rules-open");$("rulesButton").focus();}
$("rulesButton").onclick=openRules;$("closeRulesButton").onclick=closeRules;$("rulesOverlay").onclick=event=>{if(event.target===$("rulesOverlay"))closeRules();};
function openAnalysis(){$("analysisOverlay").hidden=false;document.body.classList.add("analysis-open");$("closeAnalysisButton").focus();}
function closeAnalysis(){$("analysisOverlay").hidden=true;document.body.classList.remove("analysis-open");$("analysisButton").focus();}
$("analysisButton").onclick=openAnalysis;$("closeAnalysisButton").onclick=closeAnalysis;$("analysisOverlay").onclick=event=>{if(event.target===$("analysisOverlay"))closeAnalysis();};$("runAnalysisButton").onclick=runGameAnalysis;
document.querySelectorAll("[data-rules-tab]").forEach(button=>button.onclick=()=>{const tab=button.dataset.rulesTab;document.querySelectorAll("[data-rules-tab]").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-selected",active);});document.querySelectorAll("[data-rules-page]").forEach(page=>{const active=page.dataset.rulesPage===tab;page.classList.toggle("active",active);page.hidden=!active;});});
document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;if(!$("rulesOverlay").hidden)closeRules();if(!$("analysisOverlay").hidden)closeAnalysis();});
applyAppearance();resetGame();applyLanguage();initStockfish();const inviteParams=new URLSearchParams(location.search),inviteRoom=inviteParams.get("room");if(inviteRoom)joinInvite(inviteRoom,inviteParams.get("host"));

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");

/* ===== RESPONSIVE ===== */
function resizeCanvas(){
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ===== GAME VARIABLES ===== */
let score=0;
let highScore=parseInt(localStorage.getItem("highScore"))||0;
let level=1;

let fruits=[],pieces=[],particles=[],trail=[];
let combo=0,lastSlice=0;
let fruitsCut=0,fruitsMissed=0,difficulty=1;

let gameStarted=false;

let shake=0;
let spawnTimer=0;

let freezeFrame=0;
let redFlash=0;

/* ===== TIMER ===== */
let timeLeft=60;
let maxTime=60;
let lastTimeStamp=0;
const timerBar=document.getElementById("timerBar");

/* ===== HUD ===== */
const scoreEl=document.getElementById("score");
const highScoreEl=document.getElementById("highScore");
highScoreEl.innerText="HIGH: "+highScore.toString().padStart(4,"0");

/* ===== AUDIO ===== */
const sliceSound=document.getElementById("sliceSound");
const bombSound=document.getElementById("bombSound");
const bgm=document.getElementById("bmgSound");

/* ===== SETTINGS ===== */
const settingsBtn=document.getElementById("settingsBtn");
const settingsDialog=document.getElementById("settingsDialog");
const closeSettings=document.getElementById("closeSettings");
const soundToggle=document.getElementById("soundToggle");
const vibrationToggle=document.getElementById("vibrationToggle");
const quitGame=document.getElementById("quitGame");

let soundOn=true;
let vibrationOn=true;

/* ===== MAIN BUTTON ===== */
const mainBtn = document.getElementById("mainBtn");
mainBtn.style.display="none";

/* ===== LOADING ===== */
const names=[
"images/apple.png","images/berry.png","images/banana.png",
"images/annar.png","images/dragon.png","images/kiwi.png",
"images/pear.png","images/orange.png","images/wmelon.png","images/lemon.png"
];

const bombImg=new Image();
bombImg.src="images/bomb.png";

const imgs=[];
let loaded=0;
let totalAssets = names.length + 1;
let assetsLoaded = 0;
const loadingScreen = document.getElementById("loadingScreen");

function checkLoadingComplete(){
  if(assetsLoaded === totalAssets){
    loadingScreen.style.display="none";
    mainBtn.style.display="block";
  }
}

names.forEach(n=>{
 let img=new Image();
 img.src=n;
 img.onload=()=>{
   loaded++;
   assetsLoaded++;
   checkLoadingComplete();
 };
 imgs.push(img);
});

bombImg.onload=()=>{
  assetsLoaded++;
  checkLoadingComplete();
};

/* ===== START GAME ===== */
mainBtn.onclick = () => {
  if (!gameStarted) {

    gameStarted = true;

    score = 0;
    level = 1;
    combo = 0;
    fruits = [];
    pieces = [];
    particles = [];
    trail = [];
    fruitsCut = 0;
    fruitsMissed = 0;

    timeLeft = 60;
    lastTimeStamp = 0;

    updateScoreUI();

    bgm.currentTime = 0;
    bgm.volume = 0.25;
    if (soundOn) bgm.play();

    mainBtn.style.display="none";
    document.getElementById("gameOverUI").classList.add("hidden");
  }
};

/* ===== SOUND ===== */
function playSliceSound(){
  if(!soundOn) return;
  let s=sliceSound.cloneNode();
  s.volume=0.6;
  s.play();
  if(vibrationOn && navigator.vibrate){
    navigator.vibrate(30);
  }
}

function playBombSound(){
  if(!soundOn) return;
  let b=bombSound.cloneNode();
  b.volume=0.8;
  b.play();
  if(vibrationOn && navigator.vibrate){
    navigator.vibrate([100,50,100]);
  }
}

/* ===== SETTINGS ===== */
settingsBtn.onclick=()=>{
  settingsDialog.classList.remove("hidden");
  settingsDialog.classList.add("flex");
  bgm.pause();
};

closeSettings.onclick=()=>{
  settingsDialog.classList.add("hidden");
  settingsDialog.classList.remove("flex");
  if(gameStarted && soundOn) bgm.play();
};

soundToggle.onclick=()=>{
  soundOn=!soundOn;
  soundToggle.innerText=soundOn?"🔊 Sound: ON":"🔇 Sound: OFF";
  bgm.muted=!soundOn;
};

vibrationToggle.onclick=()=>{
  vibrationOn=!vibrationOn;
  vibrationToggle.innerText=vibrationOn?"📳 Vibration: ON":"📴 Vibration: OFF";
};

quitGame.onclick=()=>{ location.reload(); };

/* ===== SCORE ===== */
function updateScoreUI(){
 if(score>highScore){
   highScore=score;
   localStorage.setItem("highScore",highScore);
 }
 scoreEl.innerText=score.toString().padStart(4,"0");
 highScoreEl.innerText="HIGH: "+highScore.toString().padStart(4,"0");
}

/* ===== LEVEL + DIFFICULTY ===== */
function updateLevel(){
 let newLevel=1+Math.floor(score/10);
 if(newLevel!==level) level=newLevel;
}

function updateDifficulty(){
 let accuracy=fruitsCut/(fruitsCut+fruitsMissed+1);
 difficulty=1;
 if(accuracy>0.8) difficulty+=0.5;
 if(combo>4) difficulty+=0.5;
 if(accuracy<0.5) difficulty-=0.3;
 difficulty=Math.min(Math.max(difficulty,1),3);
}

/* ===== SLICE ===== */
function slice(e){
 if(!gameStarted) return;

 let r=canvas.getBoundingClientRect();
 let x=e.clientX-r.left;
 let y=e.clientY-r.top;

 trail.push({x,y});
 if(trail.length>15) trail.shift();

 for(let i=fruits.length-1;i>=0;i--){
  let f=fruits[i];
  let dx=x-f.x,dy=y-f.y;

  if(Math.sqrt(dx*dx+dy*dy)<f.r){

   if(f.type==="bomb"){
    playBombSound();
    freezeFrame=10;
    redFlash=15;
    shake=12;
    createExplosion(f.x,f.y);
    timeLeft-=5;
    if(timeLeft<0) timeLeft=0;
    fruits.splice(i,1);
    return;
   }

   fruitsCut++;
   let now=Date.now();
   combo=(now-lastSlice<700)?combo+1:1;
   lastSlice=now;

   score+=combo;
   updateScoreUI();

   createPieces(f);
   createJuice(f.x,f.y);
   playSliceSound();

   fruits.splice(i,1);
  }
 }
}

canvas.addEventListener("mousemove",slice);
canvas.addEventListener("click",slice);
canvas.addEventListener("touchmove",e=>{
 let t=e.touches[0];
 slice({clientX:t.clientX,clientY:t.clientY});
});

canvas.addEventListener("mouseup", ()=> trail=[]);
canvas.addEventListener("mouseleave", ()=> trail=[]);
canvas.addEventListener("touchend", ()=> trail=[]);

/* ===== EFFECTS ===== */
function createPieces(f){
 for(let s=-1;s<=1;s+=2){
  pieces.push({
   img:f.img,x:f.x,y:f.y,
   w:30,h:60,
   vx:s*3,vy:-2,g:0.15,rot:0,vr:s*0.1
  });
 }
}

function createJuice(x,y){
 for(let i=0;i<12;i++){
  particles.push({
   x,y,
   vx:(Math.random()-0.5)*4,
   vy:(Math.random()-0.5)*4,
   r:3,life:25
  });
 }
}

function createExplosion(x,y){
 for(let i=0;i<60;i++){
  particles.push({
   x,y,
   vx:(Math.random()-0.5)*12,
   vy:(Math.random()-0.5)*12,
   r:5+Math.random()*6,
   life:50
  });
 }
}

/* ===== VISIBILITY FIX ===== */
document.addEventListener("visibilitychange", () => {
  if(document.hidden){
    bgm.pause();
  }else{
    if(gameStarted && soundOn) bgm.play();
  }
});

/* ===== GAME LOOP ===== */
function game(timestamp){

 if(document.hidden){
   requestAnimationFrame(game);
   return;
 }

 if(freezeFrame>0){
   freezeFrame--;
   requestAnimationFrame(game);
   return;
 }

 ctx.setTransform(1,0,0,1,0,0);
 ctx.clearRect(0,0,canvas.width,canvas.height);

 if(gameStarted){
   if(!lastTimeStamp) lastTimeStamp=timestamp;
   let delta=(timestamp-lastTimeStamp)/1000;
   lastTimeStamp=timestamp;

   timeLeft-=delta;

   if(timeLeft<=0){
     timeLeft=0;
     gameStarted=false;
     showGameOver();
   }

   timerBar.style.width=(timeLeft/maxTime)*100+"%";
 }

 if(shake>0){
  ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  shake*=0.85;
 }

 if(gameStarted && loaded===names.length && timeLeft>0){

  spawnTimer++;
  updateDifficulty();
  updateLevel();

  let spawnRate=35-level*2*difficulty;
  if(spawnRate<12) spawnRate=12;

  let bombChance=0.1+level*0.015*difficulty;
  if(bombChance>0.4) bombChance=0.4;

  if(spawnTimer>spawnRate){

   let isBomb=Math.random()<bombChance;

   fruits.push({
    x:Math.random()*(canvas.width-80)+40,
    y:canvas.height+50,
    r:30,
    speed:4+level*0.4*difficulty,
    img:isBomb?bombImg:imgs[Math.floor(Math.random()*imgs.length)],
    type:isBomb?"bomb":"fruit"
   });

   spawnTimer=0;
  }
 }

 /* DRAW FRUITS */
 for(let i=fruits.length-1;i>=0;i--){
  let f=fruits[i];
  f.y-=f.speed;
  ctx.drawImage(f.img,f.x-30,f.y-30,60,60);
  if(f.y<-50){
   fruitsMissed++;
   fruits.splice(i,1);
  }
 }

 /* PIECES */
 for(let i=pieces.length-1;i>=0;i--){
  let p=pieces[i];
  p.x+=p.vx;
  p.y+=p.vy;
  p.vy+=p.g;
  p.rot+=p.vr;

  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(p.rot);
  ctx.drawImage(p.img,-p.w/2,-p.h/2,p.w,p.h);
  ctx.restore();

  if(p.y>canvas.height+100) pieces.splice(i,1);
 }

 /* PARTICLES */
 for(let i=particles.length-1;i>=0;i--){
  let p=particles[i];
  p.x+=p.vx;
  p.y+=p.vy;
  p.life--;
  ctx.beginPath();
  ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
 let fireColors = ["yellow","orange","red"];
ctx.fillStyle = fireColors[Math.floor(Math.random()*fireColors.length)];
  ctx.fill();
  if(p.life<=0) particles.splice(i,1);
 }

 /* ===== FIRE BLADE TRAIL ===== */
if(trail.length>1){

  ctx.save();

  // Glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = "orange";

  // Gradient fire
  let gradient = ctx.createLinearGradient(
    trail[0].x, trail[0].y,
    trail[trail.length-1].x, trail[trail.length-1].y
  );

  gradient.addColorStop(0, "yellow");
  gradient.addColorStop(0.5, "orange");
  gradient.addColorStop(1, "red");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);

  for(let i=1;i<trail.length;i++){
    ctx.lineTo(trail[i].x, trail[i].y);
  }

  ctx.stroke();
  ctx.restore();

  // Spark particle
  let last = trail[trail.length-1];
  particles.push({
    x:last.x,
    y:last.y,
    vx:(Math.random()-0.5)*2,
    vy:(Math.random()-0.5)*2,
    r:2+Math.random()*2,
    life:10
  });
}

 /* RED FLASH */


 if(redFlash>0){
  ctx.fillStyle="rgba(255,0,0,0.25)"; 
  ctx.fillRect(0,0,canvas.width,canvas.height);
  redFlash--;//
 }

 requestAnimationFrame(game);
}

function showGameOver(){
 bgm.pause();
 trail=[];
 document.getElementById("finalScore").innerText=
 "FINAL SCORE: "+score;
 document.getElementById("gameOverUI").classList.remove("hidden");

 mainBtn.style.display="block";
 mainBtn.innerText="▶ START";
}

updateScoreUI();
game();
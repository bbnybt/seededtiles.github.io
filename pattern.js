

let sprites = [];
const NUM_SPRITES = 28;

/* ===== MODE ===== */
let mode = "pattern"; // "pattern" | "overlay" | "polaroid"

/* ===== PATTERN ===== */
let motions = [];
let motionClasses = [];
let sceneTimer = 0;
const RESET_TIME = 60 * 12; // ~10s
let ENDED = false;
const TARGET_CELL_PX = 96;

let patternG;

/* ===== OVERLAY ===== */
let overlayT = 0;
const OVERLAY_DUR = 72;
const CORNER_LEN = 120;
const CORNER_THICK = 12;
const CIRCLE_THICK = 10;

/* ===== POLAROID ===== */
const PHOTO_SIZE = 360;
const FRAME_MARGIN = 24;
const CAPTION_H = 72;
const CELL_PX = 90;

const CAPTION_WORDS = [
  "Seed","Memory","Cycle","Echo","Pattern",
  "Craft","Renewal","Flow","Heritage","Bloom"
];
let currentCaption = "#Seed";
let currentRotation = 0;
let polaroidMode = "grid";
let fullSprite = null;

let polaroidMotions = [];
let polaroidClasses = [];
let polyIntroT = 0;
const POLY_INTRO_DUR = 20;
const POLY_START_SCALE = 1.6;

function preload() {
  for (let i = 1; i <= NUM_SPRITES; i++) {
    const idx = String(i).padStart(2, '0');
    sprites.push(loadImage(`assets/shape-${idx}.png`));
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));
  imageMode(CENTER); rectMode(CENTER); textAlign(CENTER, CENTER);
  patternG = createGraphics(width, height);
  INIT_PATTERN();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  patternG = createGraphics(width, height);
  if (mode === "pattern") INIT_PATTERN();
}

/* ================= DRAW ================= */
function draw() {
  background("#2f2f2f");

  if (mode === "pattern" || mode === "overlay") {
    if (!ENDED) {
      for (const m of motions) m.run();
      if (sceneTimer >= RESET_TIME) ENDED = true;
      sceneTimer++;
    } else {
      for (const m of motions) m.show();
    }
  }

  if (mode === "overlay") {
    drawOverlayTransition();
    overlayT += 1 / OVERLAY_DUR;
    if (overlayT >= 1) {
      mode = "polaroid";
      INIT_POLAROID();
      polyIntroT = 0;
    }
  } else if (mode === "polaroid") {
    renderPatternToBufferGrayscale();

    // phủ đen multiply 50% lên nền
    push();
    blendMode(MULTIPLY);
    noStroke(); fill(0, 128);
    rect(width/2, height/2, width, height);
    blendMode(BLEND);
    pop();

    drawPolaroidWithIntro();
  }

  drawHint();
}

/* ================= KEYS ================= */
function keyPressed() {
  if (keyCode === ENTER) {
    if (mode === "pattern") {
      mode = "overlay";
      overlayT = 0;
    } else if (mode === "polaroid") {
      INIT_POLAROID();
      polyIntroT = 0;
    }
  }
}

/* ================= PATTERN ================= */
function INIT_PATTERN() {
  sceneTimer = 0; ENDED = false; motions = [];
  motionClasses = [Motion01, Motion02, Motion03, Motion04, Motion05];

  const w = max(8, TARGET_CELL_PX);
  const cols = ceil(width / w) + 2;
  const rows = ceil(height / w) + 2;
  const startX = -w, startY = -w;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = startX + j * w + w / 2;
      const y = startY + i * w + w / 2;
      const MotionClass = random(motionClasses);
      const t = -int(dist(x, y, width / 2, height / 2) * 0.7);
      motions.push(new MotionClass(x, y, w, t));
    }
  }
}

function renderPatternToBufferGrayscale() {
  patternG.push();
  patternG.clear();
  patternG.background("#2f2f2f");
  for (const m of motions) m.run(patternG);
  patternG.pop();
  patternG.filter(GRAY);
  push();
  imageMode(CORNER);
  image(patternG, 0, 0, width, height);
  imageMode(CENTER);
  pop();
}

/* ================= OVERLAY ================= */
function drawOverlayTransition() {
  const n = easeOutCubic(constrain(overlayT, 0, 1));

  push();
  noStroke(); fill(0, 150 * n);
  rect(width/2, height/2, width, height);
  pop();

  const r = lerp(40, min(width, height) * 0.35, n);
  push();
  noFill();
  stroke(255, 220 * n);
  strokeWeight(lerp(2, CIRCLE_THICK, n));
  circle(width/2, height/2, r * 2);
  pop();

  const m = CORNER_LEN;
  const off = lerp(80, 0, n);
  stroke(255); strokeWeight(CORNER_THICK); strokeCap(SQUARE);
  drawCorner(off, off, m, "tl", n);
  drawCorner(width - off, off, m, "tr", n);
  drawCorner(off, height - off, m, "bl", n);
  drawCorner(width - off, height - off, m, "br", n);
}

function drawCorner(x, y, len, pos, n) {
  push();
  stroke(255, 230 * n);
  if (pos === "tl") { line(x, y + len, x, y); line(x, y, x + len, y); }
  else if (pos === "tr") { line(x, y + len, x, y); line(x, y, x - len, y); }
  else if (pos === "bl") { line(x, y - len, x, y); line(x, y, x + len, y); }
  else if (pos === "br") { line(x, y - len, x, y); line(x, y, x - len, y); }
  pop();
}

/* ================= POLAROID ================= */
function INIT_POLAROID() {
  polaroidMotions = [];
  polaroidClasses = [Motion01, Motion02, Motion03, Motion04, Motion05];
  currentCaption = "#" + random(CAPTION_WORDS);

  currentRotation = random(-0.1, 0.1); // ~ -6° đến +6°
  polaroidMode = random() < 0.5 ? "full" : "grid";

  if (polaroidMode === "grid") {
    const cols = ceil(PHOTO_SIZE / CELL_PX);
    const rows = ceil(PHOTO_SIZE / CELL_PX);
    const startX = -PHOTO_SIZE/2 + CELL_PX/2;
    const startY = -PHOTO_SIZE/2 + CELL_PX/2;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = startX + j * CELL_PX;
        const y = startY + i * CELL_PX;
        const MotionClass = random(polaroidClasses);
        const t = -int(dist(x, y, 0, 0) * 0.3);
        polaroidMotions.push(new MotionClass(x, y, CELL_PX, t));
      }
    }
  } else {
    fullSprite = pickSprite();
  }
}

function drawPolaroidWithIntro() {
  const n = easeOutBack(constrain(polyIntroT, 0, 1));
  const s = lerp(POLY_START_SCALE, 1.0, n);
  polyIntroT += 1 / POLY_INTRO_DUR;

  const frameW = PHOTO_SIZE + FRAME_MARGIN * 2;
  const frameH = PHOTO_SIZE + FRAME_MARGIN + CAPTION_H;

  push();
  translate(width/2, height/2);
  scale(s);
  rotate(currentRotation);

  noStroke(); fill(255);
  rect(0, 0, frameW, frameH);

  push();
  translate(0, -(CAPTION_H - FRAME_MARGIN)/2);
  clipRect(-PHOTO_SIZE/2, -PHOTO_SIZE/2, PHOTO_SIZE, PHOTO_SIZE);
  noStroke(); fill('#303030');
  rect(0, 0, PHOTO_SIZE, PHOTO_SIZE);

  if (polaroidMode === "grid") {
    for (const m of polaroidMotions) m.run();
  } else if (polaroidMode === "full" && fullSprite) {
    const w = CELL_PX;
    const cols = ceil(PHOTO_SIZE / w) + 1;
    const rows = ceil(PHOTO_SIZE / w) + 1;
    const startX = -PHOTO_SIZE/2;
    const startY = -PHOTO_SIZE/2;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        image(fullSprite, startX + j*w + w/2, startY + i*w + w/2, w, w);
      }
    }
  }

  unclip();
  pop();

  fill(30);
  textFont('Phudu');
  textStyle(NORMAL);
  textSize(32);
  text(currentCaption, 0, (frameH/2) - CAPTION_H/2);
  pop();
}

/* ================= HINT ================= */
function drawHint() {
  const blink = (sin(frameCount * 0.08) * 0.5 + 0.5) * 255;

  push();
  // reset các state có thể gây tác dụng phụ
  blendMode(BLEND);
  noStroke();                // quan trọng: tắt stroke để không còn viền trắng
  drawingContext.filter = 'none';
  drawingContext.shadowColor = 'transparent';

  textAlign(RIGHT, BOTTOM);
  textFont('Work Sans');     // Work Sans Regular
  textSize(20);
  fill(200, blink);
  text("press enter", width - 20, height - 20);
  pop();
}



/* ================= AGENTS / MOTIONS ================= */
function pickSprite() { return random(sprites); }
function easeInOutQuint(x){ return x < 0.5 ? 16 * x**5 : 1 - Math.pow(-2*x + 2, 5)/2; }
function easeOutCubic(x){ return 1 - pow(1 - x, 3); }
function easeOutBack(x){ const c1 = 1.70158, c3 = c1 + 1; return 1 + c3*pow(x-1,3) + c1*pow(x-1,2); }

class Agent {
  constructor(x, y, w, t) {
    this.x = x; this.y = y; this.w = w;
    this.t1 = int(random(20, 60));
    this.t2 = this.t1 + int(random(20, 60));
    this.t  = t;
    this.sprite = pickSprite();
    this.size = 0;
    this.ang  = 0;
  }

  drawSprite(cx, cy, size, ang = 0, pg = null) {
    if (!this.sprite || size <= 0) return;
    if (pg) { pg.push(); pg.translate(cx, cy); pg.rotate(ang); pg.image(this.sprite, 0, 0, size, size); pg.pop(); }
    else { push(); translate(cx, cy); rotate(ang); image(this.sprite, 0, 0, size, size); pop(); }
  }

  show(pg = null) {}
  move() {
    if (0 < this.t && this.t < this.t1) this.updateMotion1(easeInOutQuint(norm(this.t, 0, this.t1 - 1)));
    else if (this.t1 < this.t && this.t < this.t2) this.updateMotion2(easeInOutQuint(norm(this.t, this.t1, this.t2 - 1)));
    this.t++;
  }
  run(pg = null) { this.show(pg); this.move(); }
  updateMotion1(_n) {}
  updateMotion2(_n) {}
}

class Motion01 extends Agent {
  constructor(x,y,w,t){ super(x,y,w,t); this.shift=this.w*2; this.ang=int(random(4))*(TAU/4); }
  show(pg){ this.drawSprite(this.x + this.shift*cos(this.ang), this.y + this.shift*sin(this.ang), this.size, 0, pg); }
  updateMotion1(n){ this.shift=lerp(this.w*2,0,n); this.size=lerp(0,this.w,n); }
}

class Motion02 extends Agent {
  constructor(x,y,w,t){ super(x,y,w,t); this.shift=this.w; this.ang=int(random(4))*(TAU/4); }
  show(pg){ this.drawSprite(this.x + this.shift*cos(this.ang), this.y + this.shift*sin(this.ang), this.size, 0, pg); }
  updateMotion1(n){ this.shift=lerp(0,this.w,n); this.size=lerp(0,this.w/2,n); }
  updateMotion2(n){ this.size=lerp(this.w/2,this.w,n); this.shift=lerp(this.w,0,n); }
}

class Motion03 extends Agent {
  constructor(x,y,w,t){ super(x,y,w,t); }
  show(pg){ this.drawSprite(this.x, this.y, this.size, this.ang, pg); }
  updateMotion1(n){ this.ang=lerp(0,TAU,n); this.size=lerp(0,this.w,n); }
}

class Motion04 extends Agent {
  constructor(x,y,w,t){ super(x,y,w,t); this.ang=int(random(4))*(TAU/4); this.rot=PI; this.side=0; }
  show(pg){ this.drawSprite(this.x, this.y, this.side, this.ang+this.rot, pg); }
  updateMotion1(n){ this.side=lerp(0,this.w,n); }
  updateMotion2(n){ this.rot=lerp(PI,0,n); }
}

class Motion05 extends Agent {
  constructor(x,y,w,t){ super(x,y,w,t); this.shift=this.w/2; }
  show(pg){
    if (pg) { pg.push(); pg.translate(this.x, this.y); }
    else { push(); translate(this.x, this.y); }
    for (let i=0;i<4;i++){
      this.drawSprite((this.w/4)+this.shift,(this.w/4)+this.shift,this.size,0,pg);
      if (pg) pg.rotate(TAU/4); else rotate(TAU/4);
    }
    if (pg) pg.pop(); else pop();
  }
  updateMotion1(n){ this.size=lerp(0,this.w/4,n); }
  updateMotion2(n){ this.shift=lerp(this.w/2,0,n); this.size=lerp(this.w/4,this.w/2,n); }
}

/* ================= UTILS ================= */
function clipRect(x, y, w, h) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x, y, w, h);
  drawingContext.clip();
}
function unclip() { drawingContext.restore(); }

// Master volume in decibels
const volume = -16;

let root_note = 60;

const scales = teoria.Scale.KNOWN_SCALES;
const octaves = [2, 3, 4, 5, 6, 7];

let scale_index = 0;

let current_scale = generate_scale(root_note, scales[scale_index], octaves);

const min_note = 0;
const max_note = 127;
const min_rand_note = min_note + 24;
const max_rand_note = max_note - 24;

let display_info = true;
let display_note = false;
let display_scale = false;
let display_root = false;
let shift = false;

let info = {
  add_delete: "-  =    delete / add ball",
  bracket: "[  ]     select ball",
  note: `'  \\     change note`,
  help: "h       toggle info",
  root: "↑  ↓  change root",
  scale: "← → change scale",
  accelerate: ". /      accelerate^",
  shift: "shift  ^"
};

// The synth we'll use for audio
let synth;

function generate_scale(root, scale, oct) {
  const note = teoria.note.fromMIDI(root);
  const scale_notes = teoria.scale(note, scale).simple();
  let scaled = [];
  for (var i = 0, len = oct.length; i < len; i++) {
    scaled_notes = scale_notes.map(n => n.concat(oct[i]));
    scaled.push(scaled_notes)}
  scaled = scaled.flat().map((n) => Tone.Frequency(n).toMidi());
  return scaled;
}

// Create a new canvas to the browser size
function setup() {
  createCanvas(windowWidth, windowHeight);

  textSize(35);
  textAlign(LEFT, TOP);

  Tone.Master.volume.value = volume;

  synth = new Tone.PolySynth({
    oscillator: {
      type: "triangle"
    }
  });

  reverb = new Tone.JCReverb(0.2);
  var reverbGain = new Tone.Volume(-20);

  var detunelfo = new Tone.LFO(2, 0, 25).start();
  var detunelfo2 = new Tone.LFO(2 * 1.2, 0, 15).start();
  detunelfo.connect(synth.detune);
  detunelfo2.connect(synth.detune);

  synth.connect(Tone.Master);
  synth.connect(reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(Tone.Master);
}

// On window resize, update the canvas size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

let balls = [];
let cur_ball = 0;
let note_queue = [];

const generate_rand_note = (scale) => {
  return scale[Math.floor(Math.random()*scale.length)];
};

const newball = () => {
  return (ball = {
    x: windowWidth / 2,
    y: windowHeight / 2,
    v: 0.99 * Math.random() + 5,
    a: Math.random() * 2 * Math.PI,
    n: generate_rand_note(current_scale)
  });
};

function updateball(b) {
  b.x = b.x + Math.sin(b.a) * b.v;
  b.y = b.y + Math.cos(b.a) * b.v;

  const minx = 0 + 25;
  const miny = 0 + 25;
  const maxx = windowWidth - 25;
  const maxy = windowHeight - 25;

  if (b.x >= maxx) {
    b.x = maxx;
    b.a = 2 * Math.PI - b.a;
    enqueue_note(b, 0);
  } else if (b.x <= minx) {
    b.x = minx;
    b.a = 2 * Math.PI - b.a;
    enqueue_note(b, 1);
  } else if (b.y >= maxy) {
    b.y = maxy;
    b.a = Math.PI - b.a;
    enqueue_note(b, 2);
  } else if (b.y <= miny) {
    b.y = miny;
    b.a = Math.PI - b.a;
    enqueue_note(b, 3);
  }
}

function update_velocity(d) {
  for (let i=0; i<=balls.length -1; i++) {
      if (i === cur_ball || shift === true) {
        balls[i].v = balls[i].v + d
      }
  }
}

const enqueue_note = (b, z) => {
  if (current_scale.indexOf(b.n) === -1) {
    b.n = generate_rand_note(current_scale);
  }
  n = b.n;
  n = z == 0 ? n + 12 : n - 12;
  n = Math.max(min_note, Math.min(max_note, n));
  note_queue.push(Tone.Midi(n).toFrequency());
};

const change_scale = dir => {
  
  if (scale_index >= 0 && scale_index < scales.length) {
    if (dir == "right" && scale_index !== scales.length-1) {
      scale_index++;
    }
    if (dir == "left" && scale_index !== 0) {
      scale_index--;
    }
  }
  current_scale = generate_scale(root_note, scales[scale_index], octaves);
  display_scale = true;
  setTimeout(switch_display_scale, 1000);
}

const change_note = dir => {
  let n = balls[cur_ball].n;
  const cur_index = current_scale.indexOf(n);
  let new_note;

  if (dir == "down") {
    new_note = cur_index > 0 ? current_scale[cur_index - 1] : current_scale[0];
  }
  if (dir == "up") {
    const arrLength = current_scale.length;
    new_note = cur_index < arrLength -1 ? current_scale[cur_index + 1] : current_scale[arrLength -1];
  }
  display_note = true;
  setTimeout(switch_display_note, 1000);
  return new_note;
};

const change_root = dir => {
  if (root_note > min_note && dir === 'down') {
    root_note--;
  }
  if (root_note < max_note && dir == 'up') {
    root_note++;
  }
  current_scale = generate_scale(root_note, scales[scale_index], octaves);
  display_root = true;
  setTimeout(switch_display_root, 1000);

}

const switch_display_root = () => {
  display_root = false;
}

const switch_display_scale = () => {
  display_scale = false;
}

const switch_display_note = () => {
  display_note = false;
};

const enact_command = e => {
  switch (e.code) {
  case "Minus":
    balls.pop();
    break;
  case "Equal":
    balls.push(newball());
    break;
  case "BracketLeft":
    if (balls.length > 0) {
      cur_ball = (cur_ball - 1 + balls.length) % balls.length;
    }
    break;
  case "BracketRight":
    if (balls.length > 0) {
      cur_ball = (cur_ball + 1 + balls.length) % balls.length;
    }
    break;
  case "Quote":
    if (balls.length > 0) {
      balls[cur_ball].n = change_note("down");
    }
    break;
  case "Backslash":
    if (balls.length > 0) {
      balls[cur_ball].n = change_note("up");
    }
    break;
  case "KeyH":
    display_info = !display_info;
    break
  case "ArrowLeft": 
    change_scale('left');
    break
  case "ArrowRight":
    change_scale('right');
    break
  case "ArrowUp":
    change_root('up');
    break
  case "ArrowDown":
    change_root('down');
    break;
  case "Period":
    update_velocity(-1)
    break;
  case "Slash":
    update_velocity(1)
    break;
  case "ShiftRight":
    shift = !shift;
    break;
  case "ShiftLeft":
    shift = !shift;
    break;
  }
};

function play_notes() {
  // play queued notes
  while (note_queue.length > 0) {
    n = note_queue.shift();
    synth.triggerAttackRelease(n, "4n");
  }
}

// Render loop that draws shapes with p5
function draw() {
  play_notes();

  background(0);

  document.addEventListener("keydown", enact_command);

  // Use the minimum screen size for relative rendering
  const dim = Math.min(width, height);

  const draw_ball = (b, hilite) => {
    r = 50;
    weight = hilite ? dim * 0.008 : dim * 0.0015;
    strokeWeight(weight);
    ellipse(b.x, b.y, r);
  };

  strokeJoin(ROUND);
  stroke(255);
  noFill();

  balls.forEach((i, index) => updateball(i));

  balls.forEach((i, index) => draw_ball(i, index == cur_ball));

  if (display_note) {
    strokeWeight(1);
    text(Tone.Frequency(balls[cur_ball].n, "midi").toNote(), 25, 50);
    stroke(255);
  }

  if (display_scale) {
    strokeWeight(1);
    text(scales[scale_index], 25, 10);
    stroke(255);
  }

  if (display_root) {
    strokeWeight(1);
    text(Tone.Frequency(root_note, "midi").toNote(), 25, 90);
    stroke(255);
  }

  textSize(25);

  if (display_info) {
    strokeWeight(1);
    text(info.add_delete, 25, 140);
    text(info.bracket, 25, 190);
    text(info.note, 25, 240);
    text(info.help, 25, 290);
    text(info.root, 25, 340);
    text(info.scale, 25, 390);
    text(info.accelerate, 25, 440);
    text(info.shift, 25, 490);
    stroke(255);
  }
}

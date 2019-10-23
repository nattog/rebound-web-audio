// Master volume in decibels
const volume = -16;

const notes = ["a", "b", "c", "d", "e", "f", "g"];

const octaves = [0, 1, 2, 3, 4, 5];

// The synth we'll use for audio
let synth;

// Create a new canvas to the browser size
function setup() {
  createCanvas(windowWidth, windowHeight);

  // Make the volume quieter
  Tone.Master.volume.value = volume;

  // Setup a synth with ToneJS
  synth = new Tone.PolySynth({
    oscillator: {
      type: "triangle"
    }
  });
  reverb = new Tone.JCReverb(0.7).connect(Tone.Master);
  //SOLINA CHORUS
  var detunelfo = new Tone.LFO(2, 0, 25).start();
  var detunelfo2 = new Tone.LFO(2 * 1.2, 0, 15).start();
  detunelfo.connect(synth.detune);
  detunelfo2.connect(synth.detune);

  // Wire up our nodes:
  // synth->master
  synth.connect(reverb);
}

// On window resize, update the canvas size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

let balls = [];
let cur_ball = 0;
let scale_notes = [];
let note_queue = [];
let note_off_queue = [];

const min_note = 0;
const max_note = 127;
const min_rand_note = min_note + 24;
const max_rand_note = max_note - 24;

const generate_rand_note = () => {
  let note = notes[Math.floor(Math.random() * notes.length)];
  let octave = octaves[Math.floor(Math.random() * octaves.length)];
  return note.concat(octave);
};

const newball = () => {
  return (ball = {
    x: windowWidth / 2,
    y: windowHeight / 2,
    v: 0.99 * Math.random() + 5,
    a: Math.random() * 2 * Math.PI,
    n: generate_rand_note()
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

const enqueue_note = (b, z) => {
  let n = parseInt(b.n[1]);
  n = z == 0 ? n + 1 : n - 1;
  n = n < 1 ? 1 : n;

  n = b.n[0].concat(n);
  note_queue.push(n);
};

const change_note = dir => {
  n = balls[cur_ball].n;
  let note_value = n[0];
  let octave_value = n[1];

  if (dir == "down") {
    if (note_value === notes[0] && octave_value !== octaves[0]) {
      octave_value = octaves.find(e => e == octave_value) - 1;
    }
    if (note_value !== notes[0]) {
      note_value = notes[notes.indexOf(note_value) - 1];
    }
  }
  if (dir == "up") {
    if (
      note_value === notes[notes.length - 1] &&
      octave_value !== octaves[octaves.length - 1]
    ) {
      octave_value = octaves.find(e => e == octave_value) + 1;
      note_value = notes[0];
    } else if (note_value !== notes[notes.length - 1]) {
      note_value = notes[notes.indexOf(note_value) + 1];
    }
  }
  octave_value = isNaN(parseInt(octave_value)) ? 2 : octave_value;
  const new_note = note_value.concat(octave_value);
  return new_note;
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
  }
};

function play_notes() {
  // play queued notes
  while (note_queue.length > 0) {
    n = note_queue.shift();
    if (!isNaN(n.slice(1))) {
      freq = Tone.Midi(n).toFrequency();
      synth.triggerAttackRelease(freq, "4n");
    }
  }
}

// Render loop that draws shapes with p5
function draw() {
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

  // Set up stroke and disable fill
  strokeJoin(ROUND);
  stroke(255);
  noFill();

  balls.forEach((i, index) => updateball(i));

  balls.forEach((i, index) => draw_ball(i, index == cur_ball));
  play_notes();
  // Restore transforms
}

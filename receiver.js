// SweatAi Custom Web Receiver. The phone (mobile/src/workout/TvMode.tsx) sends the workout state
// on NAMESPACE whenever it changes; this page only renders it. Open with ?demo in a desktop
// browser to preview without a Chromecast.

const NAMESPACE = 'urn:x-cast:com.sweatai.workout';

const $ = (id) => document.getElementById(id);
let state = null;
let receivedAt = 0;
let frame = 0;

function fmt(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Countdowns run on this device's clock from when the message arrived, so the phone and
// TV clocks don't need to agree.
function secondsLeft(value) {
  return value == null ? null : value - (Date.now() - receivedAt) / 1000;
}

function render() {
  if (!state) return;
  document.body.dataset.theme = state.theme || 'vice';
  $('name').textContent = state.exercise.name;
  $('tip').textContent = state.exercise.tip || '';
  $('progress').textContent = state.phase === 'done' ? 'Workout complete' : `Set ${state.set} of ${state.totalSets}`;

  const counter = document.querySelector('.counter');
  counter.classList.toggle('rest', state.phase === 'rest');

  if (state.phase === 'rest') {
    const left = secondsLeft(state.restLeft);
    $('label').textContent = 'REST';
    $('big').textContent = fmt(left);
    $('bar').style.width = '100%';
  } else if (state.phase === 'done') {
    $('label').textContent = 'NICE WORK';
    $('big').textContent = '✓';
    $('bar').style.width = '100%';
  } else if (state.workLeft != null) {
    $('label').textContent = `SET ${state.set} OF ${state.totalSets} · ${state.target.toUpperCase()}`;
    $('big').textContent = fmt(secondsLeft(state.workLeft));
    $('bar').style.width = '100%';
  } else {
    $('label').textContent = `SET ${state.set} OF ${state.totalSets} · ${state.target.toUpperCase()}`;
    $('big').textContent = `${state.repCount}/${state.repTarget}`;
    $('bar').style.width = `${Math.min(100, (state.repCount / Math.max(1, state.repTarget)) * 100)}%`;
  }

  $('next').replaceChildren(
    ...state.upNext.map((n) => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      const span = document.createElement('span');
      b.textContent = n.name;
      span.textContent = n.scheme;
      li.append(b, span);
      return li;
    }),
  );
  $('clock').textContent = fmt(state.elapsed + (Date.now() - receivedAt) / 1000);
}

function showFrame(advance) {
  const urls = (state && state.exercise.imageUrls) || [];
  if (!urls.length) return;
  frame = advance ? (frame + 1) % urls.length : frame % urls.length;
  if ($('frame').src !== urls[frame]) $('frame').src = urls[frame];
}

function receive(data) {
  state = typeof data === 'string' ? JSON.parse(data) : data;
  receivedAt = Date.now();
  showFrame(false);
  render();
}

// Flip between the start and end photos for a simple demo loop; tick countdowns.
setInterval(() => showFrame(true), 1200);
setInterval(render, 250);

const isDemo = new URLSearchParams(location.search).has('demo');
if (isDemo || typeof cast === 'undefined') {
  receive({
    theme: new URLSearchParams(location.search).get('theme') || 'vice',
    phase: 'work',
    exercise: {
      name: 'Dumbbell Shoulder Press',
      imageUrls: [
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg',
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/1.jpg',
      ],
      tip: 'Press up until your arms are straight, then lower slowly.',
    },
    set: 3, totalSets: 4, target: '8 to 10 reps', repCount: 6, repTarget: 10,
    restLeft: 0, workLeft: null, elapsed: 872,
    upNext: [
      { name: 'Incline Dumbbell Press', scheme: '3 × 10' },
      { name: 'Side Lateral Raise', scheme: '3 × 12–15' },
    ],
  });
} else {
  const context = cast.framework.CastReceiverContext.getInstance();
  context.addCustomMessageListener(NAMESPACE, (event) => receive(event.data));
  const options = new cast.framework.CastReceiverOptions();
  options.customNamespaces = { [NAMESPACE]: cast.framework.system.MessageType.JSON };
  options.disableIdleTimeout = true; // The screen shows a workout, not media, so don't time out.
  context.start(options);
}

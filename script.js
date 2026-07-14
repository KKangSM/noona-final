// 첫 진입 화면
// - 선두의 검은 점이 심박동 경로를 따라 이동하며 선을 그림
// - 점 뒤로는 '지워지는 꼬리(trail)'가 따라오다 서서히 사라짐
// - 점이 경로 끝에 도달하면 남은 것 전체가 페이드아웃 되고 메인으로 전환
// * 끝에서 'pen' 을 남길지/지울지 등 마무리 처리는 추후 결정.

const app  = document.getElementById('app');
const main = document.getElementById('main');
const src  = document.getElementById('ecgpath');   // 기준 경로 (defs)
const dot  = document.getElementById('dot');
const trailGroup = document.getElementById('trail');

const DURATION = 5000;                              // 그리는 시간(ms)
const NS = 'http://www.w3.org/2000/svg';
const L = src.getTotalLength();                     // 경로 실제 길이
const d = src.getAttribute('d');

// 꼬리 겹 정의: [보이는 길이(pathLength=1 기준), 불투명도]
// --w 가 클수록 뒤로 더 뻗고 옅어서, 겹치면 앞은 진하고 뒤는 옅은 그라데이션이 됨
const LAYERS = [
  [0.32, 0.10],
  [0.25, 0.20],
  [0.19, 0.33],
  [0.13, 0.50],
  [0.08, 0.75],
  [0.04, 1.00],
];

// 꼬리 path 겹 생성
const layers = LAYERS.map(([w, opacity]) => {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('pathLength', '1');               // 길이를 1로 정규화 → dash 계산 단순화
  p.setAttribute('class', 'trail');
  p.setAttribute('opacity', opacity);
  p.setAttribute('stroke-dasharray', w + ' 10');   // 보이는 구간 w, 나머지는 큰 간격(안 보임)
  trailGroup.appendChild(p);
  return { p, w };
});

// 진행도 t(0~1)에 맞춰 꼬리와 점을 그림
// dashoffset = w - t  →  각 겹의 앞끝(front)이 t 로 정렬되고 뒤끝은 w 만큼 뒤처짐
function render(t) {
  for (const { p, w } of layers) {
    p.setAttribute('stroke-dashoffset', w - t);
  }
  const pt = src.getPointAtLength(t * L);
  dot.setAttribute('cx', pt.x);
  dot.setAttribute('cy', pt.y);
}

// rAF 로 애니메이션 구동
let startTime = null;
let rafId = null;
const timers = [];                                 // 예약된 setTimeout id (skip 시 취소용)
function frame(now) {
  if (startTime === null) startTime = now;
  let t = (now - startTime) / DURATION;
  if (t > 1) t = 1;
  render(t);
  if (t < 1) {
    rafId = requestAnimationFrame(frame);
  } else {
    finish();
  }
}
render(0);
rafId = requestAnimationFrame(frame);

// 다 지나간 뒤 처리
function finish() {
  timers.push(setTimeout(() => {
    app.classList.add('fade');          // 심박선 전체가 서서히 사라짐
  }, 400));
  timers.push(setTimeout(() => {
    app.classList.add('done');          // splash out + 다음 화면 in
    main.classList.add('play');         // 인트로 문구 등장 -> 사라짐 애니메이션 시작
  }, 400 + 1700));
  // 인트로 3문구가 끝나면(마지막 문구가 잠깐 머문 뒤) 메인 쇼핑 화면으로 전환
  timers.push(setTimeout(() => {
    app.classList.add('enter');         // 인트로 out + 쇼핑 화면 in
  }, 400 + 1700 + 9500));
}

// skip: 진행 중인 애니메이션/예약을 모두 멈추고 곧장 쇼핑 화면으로
const skip = document.getElementById('skip');
skip.addEventListener('click', () => {
  if (rafId) cancelAnimationFrame(rafId);           // 심박선 그리기 중단
  timers.forEach(clearTimeout);                     // 예약된 전환들 취소
  app.classList.remove('fade');
  app.classList.add('done');                        // splash out
  app.classList.add('enter');                       // 인트로 out + 쇼핑 화면 in
});

// [임시] 인트로 화면 잠깐 끄기 (개발 중 빠른 확인용) — 원복: 이 블록만 삭제
if (rafId) cancelAnimationFrame(rafId);
timers.forEach(clearTimeout);
app.classList.add('done');
app.classList.add('enter');

// 커스텀 볼펜 화면
// - Three.js(CDN)로 기본 도형(원통·원뿔·상자)을 조립해 볼펜을 만든다.
// - 색상/문양/팁 굵기/심 종류/각인 문구를 실시간으로 3D에 반영하고 드래그로 회전.
// - 구성한 결과물을 localStorage 장바구니에 담는다.

// Three.js 는 커스텀 화면을 처음 열 때 동적 import 로 불러온다.
// (정적 import 로 두면 CDN 로드 실패 시 모듈 전체가 멈춰 UI/장바구니까지 죽음)
let THREE;

/* ===== 옵션 정의 (확정값) ===== */
const COLORS = [
  { name: '블랙',     hex: '#1a1a1a' },
  { name: '네이비',   hex: '#1f2d4d' },
  { name: '버건디',   hex: '#6b1f2a' },
  { name: '아이보리', hex: '#f0ece0' },
];
const PATTERNS = ['없음', '별', '하트', '꽃'];
const TIPS     = ['0.3', '0.5', '0.7'];   // mm
const REFILLS  = ['유성', '중성', '젤'];

const PRICE = { base: 20000, pattern: 3000, text: 2000, gel: 1000 };
const MAX_TEXT = 10;

/* ===== 현재 구성 상태 ===== */
const state = {
  color:   COLORS[0],
  pattern: '없음',
  tip:     '0.5',
  refill:  '유성',
  text:    '',
};

const { won } = window.PenUtil;

function calcPrice(s = state) {
  let p = PRICE.base;
  if (s.pattern !== '없음') p += PRICE.pattern;
  if (s.text.trim())        p += PRICE.text;
  if (s.refill === '젤')    p += PRICE.gel;
  return p;
}

/* =========================================================
   3D 씬
   ========================================================= */
let renderer, scene, camera, penGroup;
let barrelMat, coneMat, tipMesh;
let inited = false, initing = false;

// 밝기 판별 → 각인(음각)을 밝은/어두운색으로
function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* 문양 그리기 (캔버스 2D) */
function drawPattern(ctx, name, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  if (name === '별') {
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.42;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (name === '하트') {
    const s = r / 16;
    ctx.moveTo(cx, cy + 6 * s);
    ctx.bezierCurveTo(cx + 12 * s, cy - 6 * s, cx + 8 * s, cy - 16 * s, cx, cy - 8 * s);
    ctx.bezierCurveTo(cx - 8 * s, cy - 16 * s, cx - 12 * s, cy - 6 * s, cx, cy + 6 * s);
    ctx.closePath();
    ctx.fill();
  } else if (name === '꽃') {
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 / 5) * i - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r * 0.55, cy + Math.sin(ang) * r * 0.55, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* 몸통 텍스처: 배경(펜 색) + 음각 문양/문구 */
function buildBarrelTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext('2d');

  // 배경 = 펜 색 + 세로 광택
  ctx.fillStyle = state.color.hex;
  ctx.fillRect(0, 0, cv.width, cv.height);
  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0,   'rgba(255,255,255,0.16)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1,   'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cv.width, cv.height);

  const etch = luminance(state.color.hex) > 0.55 ? 'rgba(20,20,20,0.62)' : 'rgba(245,245,245,0.82)';
  const cx = cv.width / 2;
  const hasText = !!state.text.trim();

  if (state.pattern !== '없음') {
    drawPattern(ctx, state.pattern, cx, hasText ? 190 : 256, 46, etch);
  }
  if (hasText) {
    ctx.fillStyle = etch;
    ctx.font = '600 92px "Segoe UI", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.text.trim(), cx, state.pattern !== '없음' ? 320 : 256);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function refreshTexture() {
  if (!barrelMat) return;          // 아직 3D 미초기화
  const tex = buildBarrelTexture();
  if (barrelMat.map) barrelMat.map.dispose();
  barrelMat.map = tex;
  barrelMat.needsUpdate = true;
  coneMat.color.set(state.color.hex);
}

function applyTip() {
  if (!tipMesh) return;            // 아직 3D 미초기화
  // 0.3 → 얇게, 0.7 → 두껍게
  const scale = { '0.3': 0.7, '0.5': 1.0, '0.7': 1.45 }[state.tip] || 1;
  tipMesh.scale.set(scale, 1, scale);
}

function buildPen() {
  penGroup = new THREE.Group();

  barrelMat = new THREE.MeshStandardMaterial({ roughness: 0.34, metalness: 0.18 });
  coneMat   = new THREE.MeshStandardMaterial({ roughness: 0.4,  metalness: 0.18 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.3, metalness: 0.65 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xb9b9c2, roughness: 0.22, metalness: 0.92 });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3, 64), barrelMat);
  barrel.position.y = 0.2;

  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.07, 1.1, 64), coneMat);
  cone.position.y = -1.85;

  tipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.016, 0.34, 24), tipMat);
  tipMesh.position.y = -2.55;

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.55, 64), capMat);
  cap.position.y = 1.95;

  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.03, 16, 48), tipMat);
  capRing.rotation.x = Math.PI / 2;
  capRing.position.y = 1.66;

  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.14), capMat);
  clip.position.set(0.35, 1.72, 0);

  penGroup.add(barrel, cone, tipMesh, cap, capRing, clip);
  penGroup.rotation.set(0.12, 0.5, -0.32);
  scene.add(penGroup);

  refreshTexture();
  applyTip();
}

async function initThree(stage) {
  initing = true;
  try {
    THREE = await import('three');
  } catch (e) {
    console.error('Three.js 로드 실패:', e);
    stage.innerHTML = '<div class="stage-fail">3D 미리보기를 불러오지 못했습니다.<br>인터넷 연결을 확인해 주세요.<br>(옵션 선택·장바구니는 그대로 사용 가능합니다.)</div>';
    initing = false;
    return;
  }

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stage.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 6, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-5, -2, 3);
  scene.add(fill);

  buildPen();
  resize(stage);

  // 드래그 회전
  let dragging = false, lastX = 0, lastY = 0, spin = true;
  const dom = renderer.domElement;
  const down = (e) => { dragging = true; spin = false; lastX = e.clientX; lastY = e.clientY; };
  const move = (e) => {
    if (!dragging) return;
    penGroup.rotation.y += (e.clientX - lastX) * 0.01;
    penGroup.rotation.x += (e.clientY - lastY) * 0.01;
    lastX = e.clientX; lastY = e.clientY;
  };
  const up = () => { dragging = false; };
  dom.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);

  function loop() {
    if (spin) penGroup.rotation.y += 0.006;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  new ResizeObserver(() => resize(stage)).observe(stage);
  inited = true;
  initing = false;
}

function resize(stage) {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* =========================================================
   컨트롤 UI (옵션 배열에서 생성)
   ========================================================= */
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

function buildControls() {
  // 색상 칩
  const colorBox = document.getElementById('colorChips');
  COLORS.forEach((c, i) => {
    const chip = el('button', 'chip color-chip' + (i === 0 ? ' on' : ''));
    chip.style.setProperty('--c', c.hex);
    chip.title = c.name;
    chip.innerHTML = `<span class="swatch"></span><span class="chip-name">${c.name}</span>`;
    chip.onclick = () => {
      state.color = c;
      colorBox.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      chip.classList.add('on');
      refreshTexture(); updatePrice();
    };
    colorBox.appendChild(chip);
  });

  // 문양 칩
  const patBox = document.getElementById('patternChips');
  PATTERNS.forEach((p, i) => {
    const chip = el('button', 'chip' + (i === 0 ? ' on' : ''), p);
    chip.onclick = () => {
      state.pattern = p;
      patBox.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      chip.classList.add('on');
      refreshTexture(); updatePrice();
    };
    patBox.appendChild(chip);
  });

  // 팁 굵기 세그먼트
  const tipBox = document.getElementById('tipSeg');
  TIPS.forEach((t, i) => {
    const b = el('button', 'seg-item' + (t === state.tip ? ' on' : ''), t);
    b.onclick = () => {
      state.tip = t;
      tipBox.querySelectorAll('.seg-item').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      applyTip();
    };
    tipBox.appendChild(b);
  });

  // 심 종류 세그먼트
  const refBox = document.getElementById('refillSeg');
  REFILLS.forEach((r) => {
    const b = el('button', 'seg-item' + (r === state.refill ? ' on' : ''), r);
    b.onclick = () => {
      state.refill = r;
      refBox.querySelectorAll('.seg-item').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      updatePrice();
    };
    refBox.appendChild(b);
  });

  // 각인 문구
  const input = document.getElementById('engrave');
  input.maxLength = MAX_TEXT;
  input.addEventListener('input', () => {
    state.text = input.value;
    refreshTexture(); updatePrice();
  });
}

function updatePrice() {
  document.getElementById('priceVal').textContent = won(calcPrice());
}

/* =========================================================
   장바구니 (localStorage)
   ========================================================= */
const CART_KEY = 'penCart';
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c));

function sameConfig(a, b) {
  return a.name === b.name && a.colorName === b.colorName && a.pattern === b.pattern &&
         a.tip === b.tip && a.refill === b.refill && a.text === b.text;
}

// 일반 담기: 커스텀 펜·일반 상품 모두 이 함수로 담는다 (디테일 페이지도 재사용)
function addItem(item) {
  const cart = loadCart();
  const found = cart.find((x) => sameConfig(x, item));
  if (found) found.qty += (item.qty || 1);
  else cart.push({ qty: 1, ...item });
  saveCart(cart);
  renderCart();
}

function addToCart() {
  addItem({
    name: '커스텀 볼펜',
    colorName: state.color.name,
    colorHex: state.color.hex,
    pattern: state.pattern,
    tip: state.tip,
    refill: state.refill,
    text: state.text.trim(),
    price: calcPrice(),
    qty: 1,
  });
  flashAdded();
}

function cartCount() { return loadCart().reduce((n, x) => n + x.qty, 0); }

function updateBadges() {
  const n = cartCount();
  ['badge1', 'badge2', 'badge3'].forEach((id) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.textContent = n;
    b.classList.toggle('show', n > 0);
  });
}

function renderCart() {
  const list = document.getElementById('cartList');
  const cart = loadCart();
  list.innerHTML = '';
  if (!cart.length) {
    list.innerHTML = '<li class="cart-empty">장바구니가 비어 있어요.</li>';
  } else {
    cart.forEach((it, idx) => {
      const li = el('li', 'cart-item');
      const specs = [
        it.colorName,
        it.pattern && it.pattern !== '없음' ? '문양 ' + it.pattern : null,
        it.tip ? '팁 ' + it.tip : null,
        it.refill ? '심 ' + it.refill : null,
        it.text ? '각인 “' + it.text + '”' : null,
      ].filter(Boolean).join(' · ');
      li.innerHTML = `
        <span class="ci-sw" style="background:${it.colorHex || '#e8e6e2'}"></span>
        <div class="ci-body">
          <span class="ci-name">${it.name}</span>
          <span class="ci-spec">${specs}</span>
          <div class="ci-row">
            <div class="qty">
              <button class="qbtn" data-act="dec" data-i="${idx}">−</button>
              <span>${it.qty}</span>
              <button class="qbtn" data-act="inc" data-i="${idx}">+</button>
            </div>
            <span class="ci-price">${won(it.price * it.qty)}</span>
          </div>
        </div>
        <button class="ci-del" data-act="del" data-i="${idx}" aria-label="삭제">×</button>`;
      list.appendChild(li);
    });
  }
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);
  document.getElementById('cartTotal').textContent = won(total);
  updateBadges();
}

function cartAction(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const i = +btn.dataset.i;
  const cart = loadCart();
  if (btn.dataset.act === 'inc') cart[i].qty += 1;
  if (btn.dataset.act === 'dec') cart[i].qty = Math.max(1, cart[i].qty - 1);
  if (btn.dataset.act === 'del') cart.splice(i, 1);
  saveCart(cart);
  renderCart();
}

/* =========================================================
   화면 전환 / 배선
   ========================================================= */
const app = document.getElementById('app');

function openCustom() {
  app.classList.add('view-custom');
  if (!inited && !initing) initThree(document.getElementById('stage'));
}
function closeCustom() { app.classList.remove('view-custom'); }
function openCart()  { app.classList.add('cart-open'); }
function closeCart() { app.classList.remove('cart-open'); }

function flashAdded() {
  const btn = document.getElementById('addCart');
  btn.classList.add('done');
  btn.textContent = '담았습니다 ✓';
  setTimeout(() => { btn.classList.remove('done'); btn.textContent = '장바구니 담기'; }, 1100);
}

function wire() {
  document.getElementById('openCustom')?.addEventListener('click', openCustom);
  document.getElementById('customBack')?.addEventListener('click', closeCustom);
  document.getElementById('addCart')?.addEventListener('click', addToCart);

  document.getElementById('shopCart')?.addEventListener('click', openCart);
  document.getElementById('customCart')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartScrim')?.addEventListener('click', closeCart);
  document.getElementById('cartList')?.addEventListener('click', cartAction);

  // 주문하기 → 로그인 필수 → 체크아웃 화면
  document.getElementById('checkout')?.addEventListener('click', () => {
    if (!cartCount()) return;
    const s = window.PenAuth && window.PenAuth.getSession && window.PenAuth.getSession();
    if (!s) {                                  // 비로그인 → 로그인 유도
      closeCart();
      if (window.PenAuth && window.PenAuth.openAuth) window.PenAuth.openAuth();
      return;
    }
    openCheckout();
  });

  document.getElementById('checkoutBack')?.addEventListener('click', () => app.classList.remove('view-checkout'));

  document.getElementById('shippingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const msg = document.getElementById('checkoutMsg');
    const s = window.PenAuth && window.PenAuth.getSession && window.PenAuth.getSession();
    if (!s) { msg.textContent = '로그인이 필요해요.'; msg.className = 'auth-msg err'; return; }

    const items = loadCart().map((it) => {
      const item = { name: it.name, price: it.price, qty: it.qty };
      if (it.colorName || it.pattern || it.tip || it.refill || it.text) {
        item.options = { color: it.colorName, pattern: it.pattern, tip: it.tip, refill: it.refill, text: it.text };
      }
      return item;
    });
    if (!items.length) { msg.textContent = '장바구니가 비어 있어요.'; msg.className = 'auth-msg err'; return; }

    try {
      const res = await fetch('/orders/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: s.userId, items,
          shipping: { name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim() },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '주문에 실패했어요.');
      saveCart([]);
      renderCart();
      app.classList.remove('view-checkout');
      f.reset();
      alert('주문이 완료되었습니다.\n주문번호: ' + data.id);
    } catch (err) { msg.textContent = err.message; msg.className = 'auth-msg err'; }
  });
}

// 체크아웃 화면에 장바구니 요약 채우고 열기
function openCheckout() {
  const cart = loadCart();
  if (!cart.length) return;
  document.getElementById('checkoutItems').innerHTML = cart.map((it) =>
    `<li class="co-item"><span class="co-name">${it.name} ×${it.qty}</span><span class="co-price">${won(it.price * it.qty)}</span></li>`
  ).join('');
  document.getElementById('checkoutTotal').textContent = won(cart.reduce((s, x) => s + x.price * x.qty, 0));
  closeCart();
  app.classList.add('view-checkout');
}

buildControls();
updatePrice();
wire();
renderCart();

// 다른 스크립트(디테일 페이지 등)에서 장바구니를 재사용할 수 있게 공개
window.PenCart = { add: addItem, open: openCart, render: renderCart };

// 상품 목록 렌더 + 상세 페이지
// - shop 그리드를 GET /products 로 채운다 (커스텀 카드는 고정)
// - 카드 클릭 → GET /products/:id 로 상세 페이지 표시
// - 상세에서 장바구니 담기 (custom.js 의 window.PenCart 재사용)
(function () {
  const app = document.getElementById('app');
  const listEl = document.getElementById('productList');
  const won = (n) => '₩ ' + Number(n).toLocaleString('ko-KR');

  async function getJson(path) {
    const res = await fetch(path);
    let d = {};
    try { d = await res.json(); } catch { /* noop */ }
    if (!res.ok) throw new Error(d.message || '요청에 실패했어요.');
    return d;
  }

  /* ===== 목록 (Read) ===== */
  let products = [];

  async function loadProducts() {
    try { products = await getJson('/products'); } catch { products = []; }
    renderGrid();
  }

  function renderGrid() {
    listEl.querySelectorAll('.product--db').forEach((x) => x.remove());
    products.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'product product--db';
      li.dataset.id = p.id;
      li.innerHTML =
        `<div class="thumb"><span class="thumb-mark">${(p.name || '').charAt(0)}</span></div>` +
        `<div class="meta"><span class="name">${p.name}</span><span class="price">${won(p.price)}</span></div>`;
      li.addEventListener('click', () => openDetail(p.id));
      listEl.appendChild(li);
    });
    const count = products.length + 1; // + 커스텀 카드
    document.getElementById('sectionCount').textContent = String(count).padStart(2, '0');
  }

  /* ===== 상세 (Read one) ===== */
  let current = null;

  async function openDetail(id) {
    app.classList.add('view-detail');
    setDetail(null);
    try { current = await getJson('/products/' + id); setDetail(current); }
    catch (e) {
      current = null;
      document.getElementById('detailName').textContent = e.message;
      document.getElementById('detailPrice').textContent = '';
    }
  }
  const closeDetail = () => app.classList.remove('view-detail');

  function setDetail(p) {
    document.getElementById('detailName').textContent = p ? p.name : '불러오는 중…';
    document.getElementById('detailPrice').textContent = p ? won(p.price) : '';
    document.getElementById('detailBuyPrice').textContent = p ? won(p.price) : '-';
    document.getElementById('detailHero').textContent = p ? (p.name || '').charAt(0) : '';
  }

  document.getElementById('detailBack').addEventListener('click', closeDetail);
  document.getElementById('detailCart').addEventListener('click', () => window.PenCart && window.PenCart.open());
  document.getElementById('detailAdd').addEventListener('click', () => {
    if (!current || !window.PenCart) return;
    window.PenCart.add({ name: current.name, price: current.price, qty: 1 });
    const btn = document.getElementById('detailAdd');
    btn.classList.add('done');
    btn.textContent = '담았습니다 ✓';
    setTimeout(() => { btn.classList.remove('done'); btn.textContent = '장바구니 담기'; }, 1100);
  });

  loadProducts();
})();

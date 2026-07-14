// 컬렉션(상품 목록) + 상품 상세 페이지
// - "컬렉션" 내비 → 목록 화면(GET /products) → 카드 클릭 → 상세(GET /products/:id)
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

  /* ===== 상품 라인아트 (이름 키워드로 매칭) ===== */
  const SVG_OPEN = '<svg class="pen-svg" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  const ART = {
    fountain: `<g transform="rotate(40 100 100)"><rect x="86" y="24" width="28" height="30" rx="11"/><path d="M108 30 v22"/><rect x="88" y="54" width="24" height="60" rx="5"/><path d="M90 114 h20"/><path d="M91 116 L100 158 L109 116 Z"/><path d="M100 122 v28"/><circle cx="100" cy="126" r="3"/></g>`,
    ball: `<g transform="rotate(40 100 100)"><rect x="90" y="34" width="20" height="80" rx="10"/><path d="M90 114 L100 152 L110 114"/><path d="M100 152 v8"/><path d="M108 42 v30"/></g>`,
    ink: `<rect x="74" y="40" width="52" height="20" rx="5"/><rect x="86" y="58" width="28" height="16"/><rect x="66" y="72" width="68" height="72" rx="16"/><path d="M80 102 h40"/><path d="M80 118 h26"/>`,
    note: `<rect x="60" y="44" width="80" height="104" rx="6"/><path d="M76 44 v104"/><path d="M90 74 h36"/><path d="M90 94 h36"/><path d="M90 114 h24"/><path d="M126 44 v28 l-7 -7 l-7 7 v-28"/>`,
  };
  function penArt(name) {
    const n = name || '';
    let key = 'ball';
    if (n.includes('만년필')) key = 'fountain';
    else if (n.includes('잉크')) key = 'ink';
    else if (n.includes('노트')) key = 'note';
    return SVG_OPEN + ART[key] + '</svg>';
  }

  /* ===== 컬렉션 목록 (Read) ===== */
  let products = [];

  async function loadProducts() {
    try { products = await getJson('/products'); } catch { products = []; }
    renderGrid();
  }

  function renderGrid() {
    if (!listEl) return;
    listEl.innerHTML = products.map((p) => `
      <li class="product product--db" data-id="${p.id}">
        <div class="thumb">${p.image ? `<img class="thumb-img" src="${p.image}" alt="${p.name}" />` : penArt(p.name)}</div>
        <div class="meta"><span class="name">${p.name}</span><span class="price">${won(p.price)}</span></div>
      </li>`).join('') || '<li class="collection-empty">상품이 없어요.</li>';
    listEl.querySelectorAll('.product--db').forEach((li) => li.addEventListener('click', () => openDetail(li.dataset.id)));
  }

  const openCollection = () => { app.classList.add('view-collection'); loadProducts(); };
  const closeCollection = () => app.classList.remove('view-collection');

  /* ===== 상품 상세 (Read one) ===== */
  let current = null;
  let detailQty = 1;
  let detailOpt = null;   // 선택된 옵션 { label, extra } 또는 null

  async function openDetail(id) {
    app.classList.add('view-detail');
    setDetail(null);
    try { current = await getJson('/products/' + id); setDetail(current); }
    catch (e) {
      current = null;
      document.getElementById('detailName').textContent = e.message;
      document.getElementById('detailPrice').textContent = '';
      document.getElementById('detailHero').innerHTML = '';
    }
  }
  const closeDetail = () => app.classList.remove('view-detail');

  function setDetail(p) {
    detailQty = 1;
    detailOpt = null;
    const optWrap = document.getElementById('detailOptions');
    const stockEl = document.getElementById('detailStock');
    const addBtn = document.getElementById('detailAdd');

    document.getElementById('detailName').textContent = p ? p.name : '불러오는 중…';
    document.getElementById('detailHero').innerHTML = p
      ? (p.image ? `<img class="detail-img" src="${p.image}" alt="${p.name}" />` : penArt(p.name))
      : '';
    const desc = document.getElementById('detailDesc');
    if (desc) desc.textContent = p ? (p.description || '장인의 손끝에서 완성된 하나의 도구.') : '';

    // 옵션 칩
    if (p && Array.isArray(p.options) && p.options.length) {
      optWrap.hidden = false;
      optWrap.innerHTML = '<span class="detail-opt-label">옵션</span>' +
        p.options.map((o, i) => `<button type="button" class="opt-chip" data-i="${i}">${o.label}${o.extra ? ` (+${Number(o.extra).toLocaleString('ko-KR')})` : ''}</button>`).join('');
      optWrap.querySelectorAll('.opt-chip').forEach((b) => b.addEventListener('click', () => {
        detailOpt = p.options[+b.dataset.i];
        optWrap.querySelectorAll('.opt-chip').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        updatePrices();
      }));
    } else {
      optWrap.hidden = true;
      optWrap.innerHTML = '';
    }

    // 재고 / 품절
    if (stockEl) {
      const soldout = !!p && p.stock === 0;
      stockEl.textContent = p ? (soldout ? '품절' : (p.stock ? `재고 ${p.stock}개` : '')) : '';
      stockEl.classList.toggle('soldout', soldout);
      if (addBtn) { addBtn.disabled = soldout; addBtn.textContent = soldout ? '품절' : '장바구니 담기'; }
    }

    updatePrices();
  }

  function updatePrices() {
    document.getElementById('detailQtyVal').textContent = detailQty;
    if (!current) {
      document.getElementById('detailPrice').textContent = '';
      document.getElementById('detailBuyPrice').textContent = '-';
      return;
    }
    const unit = current.price + (detailOpt ? detailOpt.extra : 0);
    document.getElementById('detailPrice').textContent = won(unit);
    document.getElementById('detailBuyPrice').textContent = won(unit * detailQty);
  }

  /* ===== 배선 ===== */
  document.getElementById('openCollection')?.addEventListener('click', openCollection);
  document.getElementById('collectionBack')?.addEventListener('click', closeCollection);
  document.getElementById('detailBack').addEventListener('click', closeDetail);
  document.getElementById('detailCart').addEventListener('click', () => window.PenCart && window.PenCart.open());
  document.getElementById('detailQtyMinus').addEventListener('click', () => { detailQty = Math.max(1, detailQty - 1); updatePrices(); });
  document.getElementById('detailQtyPlus').addEventListener('click', () => { detailQty += 1; updatePrices(); });
  document.getElementById('detailAdd').addEventListener('click', () => {
    if (!current || !window.PenCart || current.stock === 0) return;
    if (Array.isArray(current.options) && current.options.length && !detailOpt) {
      alert('옵션을 선택해 주세요.');
      return;
    }
    const item = {
      name: current.name + (detailOpt ? ' · ' + detailOpt.label : ''),
      price: current.price + (detailOpt ? detailOpt.extra : 0),
      qty: detailQty,
    };
    window.PenCart.add(item);
    const btn = document.getElementById('detailAdd');
    btn.classList.add('done');
    btn.textContent = '담았습니다 ✓';
    setTimeout(() => { btn.classList.remove('done'); btn.textContent = '장바구니 담기'; }, 1100);
  });

  if (listEl) loadProducts();
})();

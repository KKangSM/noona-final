// 관리자 페이지 — 상품 관리(목록/등록/수정/삭제) + 전체 주문 목록
// 상품 등록/수정은 전용 화면(#productEditor)에서 처리.
(function () {
  const app = document.getElementById('app');
  const { won, esc, apiGet: jget, apiPost: jpost } = window.PenUtil;
  const session = () => (window.PenAuth && window.PenAuth.getSession && window.PenAuth.getSession()) || null;
  const isAdmin = () => { const s = session(); return !!(s && s.role === 'ADMIN'); };

  /* ===== 관리자 페이지 ===== */
  const openAdmin = () => { if (!isAdmin()) { closeAdmin(); return; } app.classList.add('view-admin'); loadAll(); };
  const closeAdmin = () => app.classList.remove('view-admin');

  /* ===== 상품 목록 ===== */
  let productItems = [];
  async function loadProducts() {
    productItems = await jget('/products').catch(() => []);
    const ul = document.getElementById('adminProductList');
    ul.innerHTML = productItems.map((p) => `
      <li class="admin-row">
        <span class="admin-thumb">${p.image ? `<img src="${esc(p.image)}" alt="" />` : ''}</span>
        <span class="admin-cell name">${p.name}<span class="admin-sub">재고 ${p.stock || 0}${p.options && p.options.length ? ' · 옵션 ' + p.options.length : ''}</span></span>
        <span class="admin-cell price">${won(p.price)}</span>
        <span class="admin-cell act">
          <button class="admin-mini" data-act="edit" data-id="${p.id}">수정</button>
          <button class="admin-mini admin-mini--del" data-act="del" data-id="${p.id}">삭제</button>
        </span>
      </li>`).join('') || '<li class="admin-empty">등록된 상품이 없어요.</li>';
  }

  document.getElementById('adminProductList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const p = productItems.find((x) => x.id === btn.dataset.id);
    if (btn.dataset.act === 'edit' && p) openEditor(p);
    if (btn.dataset.act === 'del') {
      if (!confirm('이 상품을 삭제할까요?')) return;
      try { await jpost('/products/' + btn.dataset.id + '/delete', {}); await loadProducts(); }
      catch (err) { alert(err.message); }
    }
  });

  /* ===== 전체 주문 목록 ===== */
  async function loadOrders() {
    const s = session();
    const ul = document.getElementById('adminOrderList');
    if (!s) { ul.innerHTML = '<li class="admin-empty">로그인이 필요해요.</li>'; return; }
    try {
      const list = await jget('/admin/orders?userId=' + encodeURIComponent(s.userId));
      ul.innerHTML = list.map((o) => {
        const when = new Date(o.createdAt).toLocaleString('ko-KR');
        const names = o.items.map((it) => `${it.name}×${it.qty}`).join(', ');
        return `<li class="admin-order">
          <div class="ao-top"><span class="ao-email">${o.memberEmail}</span><span class="ao-total">${won(o.total)}</span></div>
          <div class="ao-items">${names}</div>
          <div class="ao-meta">${o.status} · ${when}</div>
        </li>`;
      }).join('') || '<li class="admin-empty">주문이 없어요.</li>';
    } catch (err) { ul.innerHTML = `<li class="admin-empty">${err.message}</li>`; }
  }

  function loadAll() { loadProducts(); loadOrders(); }

  /* ===== 상품 등록/수정 에디터 ===== */
  const peId = document.getElementById('peId');
  const peName = document.getElementById('peName');
  const pePrice = document.getElementById('pePrice');
  const peStock = document.getElementById('peStock');
  const peDesc = document.getElementById('peDesc');
  const peOptions = document.getElementById('peOptions');
  const peMsg = document.getElementById('peMsg');
  const peTitle = document.getElementById('peTitle');
  const peImage = document.getElementById('peImage');
  const pePreview = document.getElementById('pePreview');
  let pendingImage = null;
  let currentImage = null;

  peImage?.addEventListener('change', () => {
    const f = peImage.files && peImage.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { pendingImage = r.result; pePreview.innerHTML = `<img src="${pendingImage}" alt="미리보기" />`; };
    r.readAsDataURL(f);
  });

  function addOptionRow(label = '', extra = '') {
    const div = document.createElement('div');
    div.className = 'pe-opt-row';
    div.innerHTML = `
      <input class="admin-input" placeholder="옵션명 (예: 네이비)" data-opt="label" value="${esc(label)}" />
      <input class="admin-input pe-opt-price" type="number" placeholder="추가금" data-opt="extra" value="${esc(extra)}" />
      <button type="button" class="admin-mini admin-mini--del" data-opt-remove>삭제</button>`;
    div.querySelector('[data-opt-remove]').addEventListener('click', () => div.remove());
    peOptions.appendChild(div);
  }
  document.getElementById('peAddOption')?.addEventListener('click', () => addOptionRow());

  function gatherOptions() {
    return [...peOptions.querySelectorAll('.pe-opt-row')].map((row) => ({
      label: row.querySelector('[data-opt="label"]').value.trim(),
      extra: Number(row.querySelector('[data-opt="extra"]').value) || 0,
    })).filter((o) => o.label);
  }

  function openEditor(p) {
    peId.value = p ? p.id : '';
    peName.value = p ? p.name : '';
    pePrice.value = p ? p.price : '';
    peStock.value = p ? (p.stock || 0) : '';
    peDesc.value = p ? (p.description || '') : '';
    pendingImage = null;
    currentImage = p ? (p.image || null) : null;
    pePreview.innerHTML = currentImage ? `<img src="${esc(currentImage)}" alt="미리보기" />` : '＋ 이미지 업로드';
    peOptions.innerHTML = '';
    if (p && Array.isArray(p.options)) p.options.forEach((o) => addOptionRow(o.label, o.extra));
    peMsg.textContent = ''; peMsg.className = 'auth-msg';
    peTitle.textContent = p ? '상품 수정' : '새 상품 등록';
    if (peImage) peImage.value = '';
    app.classList.add('view-peditor');
  }
  const closeEditor = () => app.classList.remove('view-peditor');

  document.getElementById('newProductBtn')?.addEventListener('click', () => openEditor(null));
  document.getElementById('peBack')?.addEventListener('click', closeEditor);

  document.getElementById('peSubmit')?.addEventListener('click', async () => {
    peMsg.className = 'auth-msg';
    if (!peName.value.trim()) { peMsg.textContent = '상품명을 입력해 주세요.'; peMsg.className = 'auth-msg err'; return; }
    if (pePrice.value === '' || Number(pePrice.value) < 0) { peMsg.textContent = '가격을 입력해 주세요.'; peMsg.className = 'auth-msg err'; return; }
    try {
      let image = currentImage;
      if (pendingImage) {
        const s = session();
        const up = await jpost('/admin/upload', { userId: s && s.userId, dataUrl: pendingImage });
        image = up.url;
      }
      const body = {
        name: peName.value.trim(),
        price: pePrice.value,
        stock: peStock.value,
        description: peDesc.value.trim(),
        image,
        options: gatherOptions(),
      };
      const id = peId.value;
      if (id) await jpost('/products/' + id + '/edit', body);
      else await jpost('/products/register', body);
      closeEditor();
      await loadProducts();
    } catch (err) { peMsg.textContent = err.message; peMsg.className = 'auth-msg err'; }
  });

  /* ===== 진입/버튼 노출 ===== */
  document.getElementById('adminBtn')?.addEventListener('click', openAdmin);
  document.getElementById('adminBack')?.addEventListener('click', closeAdmin);

  window.PenAdmin = {
    refresh() {
      const btn = document.getElementById('adminBtn');
      if (btn) btn.style.display = isAdmin() ? 'inline-flex' : 'none';
      if (!isAdmin()) { closeAdmin(); closeEditor(); }
    },
  };
  window.PenAdmin.refresh();
})();

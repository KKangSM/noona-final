// 로그인 / 회원가입 / 내정보(마이페이지)
// ─────────────────────────────────────────────────────────────
// 서버(server.js) + MongoDB 로 실제 인증. URL 은 K-Evolution 규칙:
//   /auth/login · /auth/signup · /auth/checkId
//   /mypage(조회) · /mypage/edit · /mypage/changePassword · /mypage/withdraw
// 로그인 세션(표시용)만 localStorage 에 보관.
// ─────────────────────────────────────────────────────────────
(function () {
  const app = document.getElementById('app');
  const { won, apiGet: get, apiPost: post } = window.PenUtil;
  const SESSION_KEY = 'penSession';

  const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
  const setSession = (s) => s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s))
                              : localStorage.removeItem(SESSION_KEY);

  window.PenAuth = { getSession };   // 다른 스크립트에서 세션 조회용

  /* ===== 화면 전환 ===== */
  const openAuth    = () => app.classList.add('view-auth');
  const closeAuth   = () => app.classList.remove('view-auth');
  const openMypage  = () => { app.classList.add('view-mypage'); loadMypage(); };
  const closeMypage = () => app.classList.remove('view-mypage');

  // 다른 스크립트(장바구니 등)에서 로그인 창을 열 수 있게 공개
  window.PenAuth.openAuth = openAuth;
  window.PenAuth.openMypage = openMypage;

  function renderMyOrders(list) {
    const ul = document.getElementById('myOrders');
    if (!ul) return;
    ul.innerHTML = (list && list.length)
      ? list.map((o) => {
          const when = new Date(o.createdAt).toLocaleDateString('ko-KR');
          const names = o.items.map((it) => `${it.name}×${it.qty}`).join(', ');
          return `<li class="my-order">
            <div class="mo-top"><span class="mo-when">${when}</span><span class="mo-total">${won(o.total)}</span></div>
            <div class="mo-items">${names}</div>
            <div class="mo-status">${o.status}</div>
          </li>`;
        }).join('')
      : '<li class="cart-empty">주문 내역이 없어요.</li>';
  }

  /* ===== 헤더 계정 영역 ===== */
  const PERSON_SVG =
    `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 4-7 8-7s8 2.5 8 7"/></svg>`;

  function renderAccount() {
    const wrap = document.getElementById('acctWrap');
    if (!wrap) return;
    const s = getSession();
    if (!s) {
      // 비로그인 — 아이콘 클릭 시 로그인 화면
      wrap.innerHTML = `<button type="button" class="shop-acct" id="accountBtn" aria-label="계정">${PERSON_SVG}</button>`;
      document.getElementById('accountBtn').onclick = openAuth;
    } else {
      // 로그인 — 아이콘 클릭 시 드롭다운(내정보 · 로그아웃)
      wrap.innerHTML =
        `<button type="button" class="shop-acct" id="accountBtn" aria-label="계정">${PERSON_SVG}</button>` +
        `<div class="acct-menu" id="acctMenu" hidden>` +
          `<span class="acct-menu-name">${s.name}님</span>` +
          `<button type="button" class="acct-menu-item" id="menuMypage">내정보</button>` +
          `<button type="button" class="acct-menu-item acct-menu-item--danger" id="menuLogout">로그아웃</button>` +
        `</div>`;
      const menu = document.getElementById('acctMenu');
      document.getElementById('accountBtn').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
      document.getElementById('menuMypage').onclick = () => { menu.hidden = true; openMypage(); };
      document.getElementById('menuLogout').onclick = () => { setSession(null); renderAccount(); closeMypage(); };
    }
    if (window.PenAdmin) window.PenAdmin.refresh();   // ★ 어드민 버튼 노출 갱신
  }

  // 바깥 클릭 시 드롭다운 닫기
  document.addEventListener('click', () => { const m = document.getElementById('acctMenu'); if (m) m.hidden = true; });

  const setMsg = (el, text, kind) => { el.textContent = text; el.className = 'auth-msg' + (kind ? ' ' + kind : ''); };

  /* ===== 로그인 / 회원가입 탭 ===== */
  function showTab(name) {
    document.querySelectorAll('.auth-tab').forEach((x) => x.classList.toggle('on', x.dataset.tab === name));
    document.getElementById('loginForm').classList.toggle('hidden', name !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', name !== 'signup');
    document.getElementById('loginMsg').textContent = '';
    document.getElementById('signupMsg').textContent = '';
  }

  document.querySelectorAll('.auth-tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  document.getElementById('authBack').addEventListener('click', closeAuth);

  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('signupMsg');
    const userId = f.userId.value.trim(), name = f.name.value.trim(), email = f.email.value.trim();
    const pw = f.password.value, pw2 = f.password2.value;
    if (!userId || !name || !pw) return setMsg(msg, '아이디·이름·비밀번호를 입력해 주세요.', 'err');
    if (!/^[A-Za-z0-9_]{4,20}$/.test(userId)) return setMsg(msg, '아이디는 영문·숫자 4~20자예요.', 'err');
    if (pw.length < 4)           return setMsg(msg, '비밀번호는 4자 이상이어야 해요.', 'err');
    if (pw !== pw2)              return setMsg(msg, '비밀번호가 일치하지 않아요.', 'err');
    try {
      await post('/auth/signup', { userId, name, email, password: pw });
      f.reset();
      alert('회원가입이 완료되었습니다! 🎉\n아이디: ' + userId + '\n로그인해 주세요.');
      showTab('login');
      document.querySelector('#loginForm [name=userId]').value = userId;
      document.querySelector('#loginForm [name=password]').focus();
    } catch (err) { setMsg(msg, err.message, 'err'); }
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('loginMsg');
    const userId = f.userId.value.trim(), pw = f.password.value;
    if (!userId || !pw) return setMsg(msg, '아이디와 비밀번호를 입력해 주세요.', 'err');
    try {
      const user = await post('/auth/login', { userId, password: pw });
      setSession(user);
      renderAccount();
      closeAuth();
      f.reset();
    } catch (err) { setMsg(msg, err.message, 'err'); }
  });

  /* ===== 내정보(마이페이지) ===== */
  async function loadMypage() {
    const s = getSession();
    if (!s) { closeMypage(); openAuth(); return; }
    // 서버에서 최신 프로필 조회 (Read)
    let me = s;
    try { me = await get('/mypage?userId=' + encodeURIComponent(s.userId)); setSession(me); renderAccount(); }
    catch { /* 조회 실패 시 세션 값으로 표시 */ }

    document.getElementById('meInitial').textContent = (me.name || '?').charAt(0).toUpperCase();
    document.getElementById('meName').textContent  = me.name + '님';
    document.getElementById('meEmail').textContent = '@' + me.userId + (me.email ? ' · ' + me.email : '');
    const since = me.createdAt ? new Date(me.createdAt) : null;
    document.getElementById('meSince').textContent =
      since ? '가입일 ' + since.toLocaleDateString('ko-KR') : '';
    document.querySelector('#editForm [name=name]').value = me.name;

    // 주문 내역
    try { renderMyOrders(await get('/orders?userId=' + encodeURIComponent(me.userId))); }
    catch { renderMyOrders([]); }

    // 메시지/입력 초기화
    ['editMsg', 'pwMsg', 'withdrawMsg'].forEach((id) => (document.getElementById(id).textContent = ''));
  }

  document.getElementById('mypageBack').addEventListener('click', closeMypage);
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    setSession(null);
    renderAccount();
    closeMypage();
  });

  // 이름 수정 (Update)
  document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('editMsg');
    const s = getSession();
    try {
      const r = await post('/mypage/edit', { userId: s.userId, password: f.password.value, name: f.name.value.trim() });
      setSession({ ...s, name: r.name });
      renderAccount();
      document.getElementById('meName').textContent = r.name + '님';
      document.getElementById('meInitial').textContent = r.name.charAt(0).toUpperCase();
      f.password.value = '';
      setMsg(msg, '이름을 변경했어요.', 'ok');
    } catch (err) { setMsg(msg, err.message, 'err'); }
  });

  // 비밀번호 변경 (Update)
  document.getElementById('pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('pwMsg');
    const s = getSession();
    if (f.newPassword.value.length < 4) return setMsg(msg, '새 비밀번호는 4자 이상이어야 해요.', 'err');
    if (f.newPassword.value !== f.newPassword2.value) return setMsg(msg, '새 비밀번호가 일치하지 않아요.', 'err');
    try {
      await post('/mypage/changePassword', { userId: s.userId, password: f.password.value, newPassword: f.newPassword.value });
      f.reset();
      setMsg(msg, '비밀번호를 변경했어요.', 'ok');
    } catch (err) { setMsg(msg, err.message, 'err'); }
  });

  // 회원 탈퇴 (soft-delete)
  const withdrawBtn = document.getElementById('withdrawBtn');
  const withdrawConfirm = document.getElementById('withdrawConfirm');
  withdrawBtn.addEventListener('click', () => withdrawConfirm.classList.toggle('hidden'));
  document.getElementById('withdrawConfirmBtn').addEventListener('click', async () => {
    const msg = document.getElementById('withdrawMsg');
    const s = getSession();
    const pw = document.getElementById('withdrawPw').value;
    if (!pw) return setMsg(msg, '비밀번호를 입력해 주세요.', 'err');
    try {
      await post('/mypage/withdraw', { userId: s.userId, password: pw });
      setSession(null);
      renderAccount();
      closeMypage();
      alert('회원 탈퇴가 완료되었습니다.');
    } catch (err) { setMsg(msg, err.message, 'err'); }
  });

  /* ===== 초기화 ===== */
  renderAccount();
  showTab('login');
})();

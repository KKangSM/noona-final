// 로그인 / 회원가입 / 내정보(마이페이지)
// ─────────────────────────────────────────────────────────────
// 서버(server.js) + MongoDB 로 실제 인증. URL 은 K-Evolution 규칙:
//   /auth/login · /auth/signup · /auth/checkId
//   /mypage(조회) · /mypage/edit · /mypage/changePassword · /mypage/withdraw
// 로그인 세션(표시용)만 localStorage 에 보관.
// ─────────────────────────────────────────────────────────────
(function () {
  const app = document.getElementById('app');
  const SESSION_KEY = 'penSession';

  const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
  const setSession = (s) => s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s))
                              : localStorage.removeItem(SESSION_KEY);

  window.PenAuth = { getSession };   // 다른 스크립트에서 세션 조회용

  /* ===== 서버 API 호출 ===== */
  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch { /* noop */ }
    if (!res.ok) throw new Error(data.message || '요청에 실패했어요.');
    return data;
  }
  async function get(path) {
    const res = await fetch(path);
    let data = {};
    try { data = await res.json(); } catch { /* noop */ }
    if (!res.ok) throw new Error(data.message || '요청에 실패했어요.');
    return data;
  }

  /* ===== 화면 전환 ===== */
  const openAuth    = () => app.classList.add('view-auth');
  const closeAuth   = () => app.classList.remove('view-auth');
  const openMypage  = () => { app.classList.add('view-mypage'); loadMypage(); };
  const closeMypage = () => app.classList.remove('view-mypage');

  /* ===== 헤더 계정 영역 ===== */
  function renderAccount() {
    const wrap = document.getElementById('acctWrap');
    if (!wrap) return;
    const s = getSession();
    if (s) {
      wrap.innerHTML =
        `<button type="button" class="acct-name" id="mypageBtn" title="내정보">${s.name}님</button>` +
        `<button type="button" class="acct-logout" id="logoutBtn">로그아웃</button>`;
      document.getElementById('mypageBtn').onclick = openMypage;
      document.getElementById('logoutBtn').onclick = () => { setSession(null); renderAccount(); };
    } else {
      wrap.innerHTML =
        `<button type="button" class="shop-acct" id="accountBtn" aria-label="계정"><span aria-hidden="true">👤</span></button>`;
      document.getElementById('accountBtn').onclick = openAuth;
    }
  }

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
    const name = f.name.value.trim(), email = f.email.value.trim();
    const pw = f.password.value, pw2 = f.password2.value;
    if (!name || !email || !pw) return setMsg(msg, '모든 항목을 입력해 주세요.', 'err');
    if (pw.length < 4)          return setMsg(msg, '비밀번호는 4자 이상이어야 해요.', 'err');
    if (pw !== pw2)             return setMsg(msg, '비밀번호가 일치하지 않아요.', 'err');
    try {
      await post('/auth/signup', { name, email, password: pw });
      setMsg(msg, '가입 완료! 로그인해 주세요.', 'ok');
      f.reset();
      setTimeout(() => showTab('login'), 900);
    } catch (err) { setMsg(msg, err.message, 'err'); }
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('loginMsg');
    const email = f.email.value.trim(), pw = f.password.value;
    if (!email || !pw) return setMsg(msg, '이메일과 비밀번호를 입력해 주세요.', 'err');
    try {
      const user = await post('/auth/login', { email, password: pw });
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
    try { me = await get('/mypage?email=' + encodeURIComponent(s.email)); setSession(me); renderAccount(); }
    catch { /* 조회 실패 시 세션 값으로 표시 */ }

    document.getElementById('meInitial').textContent = (me.name || '?').charAt(0).toUpperCase();
    document.getElementById('meName').textContent  = me.name + '님';
    document.getElementById('meEmail').textContent = me.email;
    const since = me.createdAt ? new Date(me.createdAt) : null;
    document.getElementById('meSince').textContent =
      since ? '가입일 ' + since.toLocaleDateString('ko-KR') : '';
    document.querySelector('#editForm [name=name]').value = me.name;

    // 메시지/입력 초기화
    ['editMsg', 'pwMsg', 'withdrawMsg'].forEach((id) => (document.getElementById(id).textContent = ''));
  }

  document.getElementById('mypageBack').addEventListener('click', closeMypage);

  // 이름 수정 (Update)
  document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = document.getElementById('editMsg');
    const s = getSession();
    try {
      const r = await post('/mypage/edit', { email: s.email, password: f.password.value, name: f.name.value.trim() });
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
      await post('/mypage/changePassword', { email: s.email, password: f.password.value, newPassword: f.newPassword.value });
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
      await post('/mypage/withdraw', { email: s.email, password: pw });
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

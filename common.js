// 여러 스크립트가 함께 쓰는 공통 유틸
// - classic <script> 로 다른 스크립트들보다 먼저 로드 → window.PenUtil 로 노출
// - custom.js(모듈)도 defer 실행이라 window.PenUtil 을 그대로 참조 가능
(function () {
  // 원화 표시:  1234 → "₩ 1,234"
  const won = (n) => '₩ ' + Number(n).toLocaleString('ko-KR');

  // HTML 속성값에 넣기 전 따옴표 이스케이프
  const esc = (s) => String(s == null ? '' : s).replace(/"/g, '&quot;');

  // fetch 공통 처리: JSON 파싱 + 응답 실패 시 에러 throw
  async function request(path, options) {
    const res = await fetch(path, options);
    let data = {};
    try { data = await res.json(); } catch { /* noop */ }
    if (!res.ok) throw new Error(data.message || '요청에 실패했어요.');
    return data;
  }
  const apiGet = (path) => request(path);
  const apiPost = (path, body) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });

  window.PenUtil = { won, esc, apiGet, apiPost };
})();

// 하단 갤러리 3분할 존 — 클릭하면 지정 페이지로 이동
// (슬라이드 올라오는 시각효과는 style.css 의 :hover 로 처리)
// 각 .gallery-item 의 data-go 값으로 목적지 지정:
//   custom → 커스텀 펜 페이지 · detail → 상품 상세 · cart → 장바구니
//   "/경로" 또는 "https://..." → 해당 주소로 이동
(function () {
  const app = document.getElementById('app');
  const go = {
    custom: () => app.classList.add('view-custom'),
    detail: () => app.classList.add('view-detail'),
    cart:   () => app.classList.add('cart-open'),
  };

  document.querySelectorAll('.gallery-item').forEach((item) => {
    const target = item.getAttribute('data-go');
    if (!target) return;
    item.setAttribute('role', 'link');
    item.setAttribute('tabindex', '0');

    const navigate = () => {
      if (go[target]) go[target]();
      else if (/^(https?:|\/)/.test(target)) location.href = target;
    };
    item.addEventListener('click', navigate);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); }
    });
  });
})();

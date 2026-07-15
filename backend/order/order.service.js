// 주문 비즈니스 로직 — 회원만 주문(Create), 내 주문 조회(Read), 결제 반영(markPaid)
const orderRepo = require('./order.repository');
const memberRepo = require('../member/member.repository');
const { STATUS, PAY_STATUS, makeOrderNo, newOrder, toOrder } = require('./order.entity');
const { DomainError } = require('../lib/errors');

// 배송비 정책: 5만원 이상 무료, 그 외 3,000원
const FREE_SHIP_OVER = 50000;
const SHIP_FEE = 3000;

// 장바구니 아이템 정규화 + 검증 (주문 시점 스냅샷)
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new DomainError(400, '주문할 상품이 없어요.');
  return items.map((it) => {
    const price = Math.round(Number(it.price));
    const qty = Math.round(Number(it.qty)) || 1;
    if (!it.name || !Number.isFinite(price) || price < 0 || qty < 1) {
      throw new DomainError(400, '상품 정보가 올바르지 않아요.');
    }
    const item = { name: String(it.name), price, qty };
    if (it.productId) item.productId = String(it.productId);
    if (it.image) item.image = String(it.image);
    if (it.options && typeof it.options === 'object') item.options = it.options; // 커스텀 옵션 보존
    return item;
  });
}

// 금액 분해 (항상 서버가 계산 — 클라 값 신뢰 X)
function calcAmount(items) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const shippingFee = subtotal >= FREE_SHIP_OVER || subtotal === 0 ? 0 : SHIP_FEE;
  const discount = 0;
  return { subtotal, shippingFee, discount, total: subtotal + shippingFee - discount };
}

// 배송지 정규화 (신규 필드 + 옛 {name,address} 형태 모두 수용)
function normalizeShipping(s) {
  if (!s || typeof s !== 'object') return null;
  const receiver = (s.receiver || s.name || '').trim();
  const address1 = (s.address1 || s.address || '').trim();
  if (!receiver || !address1) throw new DomainError(400, '받는 사람과 주소를 입력해 주세요.');
  return {
    receiver,
    phone: (s.phone || '').trim(),
    zipcode: (s.zipcode || '').trim(),
    address1,
    address2: (s.address2 || '').trim(),
  };
}

// 주문 생성 — 로그인 회원만. 상태 PENDING(결제 전)으로 만들고 주문번호·금액 반환.
async function create({ userId, items, shipping, memo }) {
  const member = await memberRepo.findActiveByUserId(userId);
  if (!member) throw new DomainError(401, '로그인이 필요해요. (회원만 주문 가능)');

  const norm = normalizeItems(items);
  const amount = calcAmount(norm);
  const shipTo = normalizeShipping(shipping);

  // 주문번호 유니크 보장 — 드문 충돌 시 재시도
  let doc, inserted;
  for (let tries = 0; tries < 5; tries++) {
    doc = newOrder({
      orderNo: makeOrderNo(),
      memberUserId: userId,
      memberEmail: member.email || '',
      items: norm, amount, shipping: shipTo, memo,
    });
    try { inserted = await orderRepo.insert(doc); break; }
    catch (e) { if (e && e.code === 11000) continue; throw e; }   // 중복키 → 재시도
  }
  if (!inserted) throw new DomainError(500, '주문번호 생성에 실패했어요. 다시 시도해 주세요.');
  return toOrder({ _id: inserted.insertedId, ...doc });
}

// 결제 승인 반영 — payment.service 가 PG 승인 성공 후 호출.
// 금액 대사(order.total === 승인금액) 후 상태 PAID 전이. 이미 PAID 면 멱등 처리.
async function markPaid(orderNo, payment) {
  const order = await orderRepo.findByOrderNo(orderNo);
  if (!order) throw new DomainError(404, '주문을 찾을 수 없어요.');
  if (order.status === STATUS.PAID && order.payment) return toOrder(order); // 이미 결제됨(중복 승인 방지)
  if (order.status !== STATUS.PENDING) throw new DomainError(409, '결제할 수 없는 주문 상태예요.');

  const expected = order.amount ? order.amount.total : order.total;
  if (Number(payment.amount) !== Number(expected)) {
    throw new DomainError(400, `결제 금액이 주문 금액과 달라요. (주문 ${expected} / 결제 ${payment.amount})`);
  }
  if (payment.status !== PAY_STATUS.PAID) throw new DomainError(400, '승인되지 않은 결제예요.');

  const r = await orderRepo.markPaid(orderNo, payment, STATUS.PAID);
  return toOrder(r.value || r);   // 드라이버 버전별 반환형 대응
}

// 내 주문 목록
async function myOrders(userId) {
  const member = userId && await memberRepo.findActiveByUserId(userId);
  if (!member) throw new DomainError(401, '로그인이 필요해요.');
  return (await orderRepo.findByUserId(userId)).map(toOrder);
}

// 주문 상세 — 본인 것만
async function detail(id, userId) {
  const o = await orderRepo.findById(id);
  if (!o) throw new DomainError(404, '주문을 찾을 수 없어요.');
  if (!userId || o.memberUserId !== userId) throw new DomainError(403, '본인 주문만 볼 수 있어요.');
  return toOrder(o);
}

// 전체 주문 — 어드민만
async function allOrders(requesterUserId) {
  const m = requesterUserId && await memberRepo.findActiveByUserId(requesterUserId);
  if (!m || m.role !== 'ADMIN') throw new DomainError(403, '관리자만 접근할 수 있어요.');
  return (await orderRepo.findAll()).map(toOrder);
}

module.exports = { create, markPaid, myOrders, detail, allOrders, calcAmount };

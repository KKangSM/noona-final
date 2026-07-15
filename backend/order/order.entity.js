// 주문(Order) 엔티티 정의
// 결제(토스페이먼츠·KG이니시스) 확장 스키마: 금액 분해(amount) · 배송지(shipping) ·
// 결제정보(payment: 정규화 코어 + PG 원응답 raw) · 상태 이력(statusHistory).

// 주문 상태
const STATUS = Object.freeze({
  PENDING: 'PENDING',       // 주문 접수(결제 전)
  PAID: 'PAID',             // 결제 완료
  SHIPPED: 'SHIPPED',       // 출고
  DELIVERED: 'DELIVERED',   // 배송 완료
  CANCELLED: 'CANCELLED',   // 취소
});

// 결제 상태 (PG 중립 — 각 PG 상태를 여기로 매핑)
const PAY_STATUS = Object.freeze({
  READY: 'READY',                       // 주문 생성됨, 승인 전
  PAID: 'PAID',                         // 승인 완료
  CANCELLED: 'CANCELLED',               // 전액 취소
  PARTIAL_CANCELLED: 'PARTIAL_CANCELLED', // 부분 취소
  FAILED: 'FAILED',                     // 실패
});

// 결제 수단 (PG 중립)
const PAY_METHOD = Object.freeze({
  CARD: 'CARD', VBANK: 'VBANK', TRANSFER: 'TRANSFER', EASY_PAY: 'EASY_PAY',
});

// 사람이 읽는 주문번호:  20260715-3F9A2C
function makeOrderNo(now = new Date()) {
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 8).padEnd(6, '0');
  return `${d}-${rnd}`;
}

// 신규 주문 도큐먼트 생성 (금액·상태·주문번호는 서버가 정함)
function newOrder({ orderNo, memberUserId, memberEmail, items, amount, shipping, memo }) {
  const now = new Date();
  return {
    orderNo,
    memberUserId,
    memberEmail: memberEmail || '',
    items,                    // [{ productId?, name, price, qty, image?, options? }]
    amount,                   // { subtotal, shippingFee, discount, total }
    shipping: shipping || null, // { receiver, phone, zipcode?, address1, address2? }
    memo: memo || '',
    payment: null,            // 승인 전엔 null → 결제 후 정규화 payment 로 채움
    status: STATUS.PENDING,
    statusHistory: [{ status: STATUS.PENDING, at: now }],
    createdAt: now,
    updatedAt: now,
  };
}

// 외부로 내보낼 형태 (_id → id). payment.raw(PG 원응답)는 노출하지 않음.
const toOrder = (o) => ({
  id: o._id.toString(),
  orderNo: o.orderNo,
  memberUserId: o.memberUserId,
  memberEmail: o.memberEmail || '',
  items: o.items,
  amount: o.amount,
  total: o.amount ? o.amount.total : o.total,   // 하위호환(옛 문서)
  shipping: o.shipping,
  memo: o.memo || '',
  payment: o.payment ? {
    provider: o.payment.provider,
    method: o.payment.method,
    status: o.payment.status,
    amount: o.payment.amount,
    receiptUrl: o.payment.receiptUrl || null,
    approvedAt: o.payment.approvedAt || null,
  } : null,
  status: o.status,
  createdAt: o.createdAt,
});

module.exports = { STATUS, PAY_STATUS, PAY_METHOD, makeOrderNo, newOrder, toOrder };

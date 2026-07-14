// 주문(Order) 엔티티 정의
const STATUS = Object.freeze({
  PENDING: 'PENDING',      // 주문 접수(결제 전)
  PAID: 'PAID',            // 결제 완료
  SHIPPED: 'SHIPPED',      // 배송
  CANCELLED: 'CANCELLED',  // 취소
});

// 신규 주문 도큐먼트 생성 (금액·상태는 서버가 정함)
function newOrder({ memberUserId, items, total, shipping }) {
  const now = new Date();
  return {
    memberUserId,
    items,                 // [{ name, price, qty, options? }]
    total,
    status: STATUS.PENDING,
    shipping: shipping || null,
    createdAt: now,
    updatedAt: now,
  };
}

// 외부로 내보낼 형태 (_id → id)
const toOrder = (o) => ({
  id: o._id.toString(),
  memberUserId: o.memberUserId,
  items: o.items,
  total: o.total,
  status: o.status,
  shipping: o.shipping,
  createdAt: o.createdAt,
});

module.exports = { STATUS, newOrder, toOrder };

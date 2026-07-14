// 주문 비즈니스 로직 — 회원만 주문(Create), 내 주문 조회(Read)
const orderRepo = require('./order.repository');
const memberRepo = require('../member/member.repository');
const { newOrder, toOrder } = require('./order.entity');
const { DomainError } = require('../lib/errors');

// 장바구니 아이템 정규화 + 검증
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new DomainError(400, '주문할 상품이 없어요.');
  return items.map((it) => {
    const price = Math.round(Number(it.price));
    const qty = Math.round(Number(it.qty)) || 1;
    if (!it.name || !Number.isFinite(price) || price < 0 || qty < 1) {
      throw new DomainError(400, '상품 정보가 올바르지 않아요.');
    }
    const item = { name: String(it.name), price, qty };
    if (it.options && typeof it.options === 'object') item.options = it.options; // 커스텀 옵션 보존
    return item;
  });
}

// 주문 생성 — 로그인 회원만
async function create({ userId, items, shipping }) {
  const member = await memberRepo.findActiveByUserId(userId);
  if (!member) throw new DomainError(401, '로그인이 필요해요. (회원만 주문 가능)');

  const norm = normalizeItems(items);
  const total = norm.reduce((sum, it) => sum + it.price * it.qty, 0); // 합계는 서버가 계산

  const doc = newOrder({ memberUserId: userId, items: norm, total, shipping });
  const r = await orderRepo.insert(doc);
  return toOrder({ _id: r.insertedId, ...doc });
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

module.exports = { create, myOrders, detail, allOrders };

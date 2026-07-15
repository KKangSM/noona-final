// 결제 비즈니스 로직 (현재 KG이니시스). PG 중립 payment 로 저장 → 주문 PAID 전이.
const inicis = require('./payment.inicis');
const { INICIS } = require('./payment.config');
const orderService = require('../order/order.service');
const orderRepo = require('../order/order.repository');
const memberRepo = require('../member/member.repository');
const { STATUS, PAY_STATUS, toOrder } = require('../order/order.entity');
const { DomainError } = require('../lib/errors');

// 이니시스 결제창 요청 파라미터 준비 (서버 서명). 본인·PENDING 주문만.
async function prepareInicis({ orderNo, userId, origin }) {
  const order = await orderRepo.findByOrderNo(orderNo);
  if (!order) throw new DomainError(404, '주문을 찾을 수 없어요.');
  if (order.memberUserId !== userId) throw new DomainError(403, '본인 주문만 결제할 수 있어요.');
  if (order.status !== STATUS.PENDING) throw new DomainError(409, '이미 처리된 주문이에요.');

  const price = order.amount.total;
  const timestamp = Date.now();
  const { signature, verification, mKey } = inicis.signStdPay({ oid: orderNo, price, timestamp, signKey: INICIS.signKey });
  const first = order.items[0] ? order.items[0].name : '주문상품';
  const goodname = order.items.length > 1 ? `${first} 외 ${order.items.length - 1}건` : first;

  return {
    mid: INICIS.mid,
    oid: orderNo,
    price,
    timestamp,
    signature,
    verification,
    mKey,
    goodname,
    buyername: order.shipping ? order.shipping.receiver : '',
    buyertel: order.shipping ? order.shipping.phone : '',
    buyeremail: order.memberEmail || '',
    returnUrl: `${origin}/payment/inicis/return`,
    closeUrl: `${origin}/payment/inicis/close`,
  };
}

// returnUrl 콜백 처리: 승인 요청 → 금액 대사 → 주문 PAID
async function confirmInicis(body) {
  const { resultCode, resultMsg, authToken, authUrl, netCancelUrl, mid, orderNumber } = body;
  if (resultCode !== '0000') throw new DomainError(400, resultMsg || '결제가 취소되었거나 실패했어요.');
  if (!authToken || !authUrl) throw new DomainError(400, '결제 인증 정보가 없어요.');

  const approval = await inicis.approve({ authUrl, mid: mid || INICIS.mid, authToken, signKey: INICIS.signKey });
  const payment = inicis.normalize(approval);
  if (payment.status !== PAY_STATUS.PAID) {
    throw new DomainError(400, approval.resultMsg || '결제 승인에 실패했어요.');
  }

  try {
    return await orderService.markPaid(orderNumber || payment.merchantOrderId, payment);
  } catch (e) {
    // 승인은 됐는데 금액 대사 실패 등 → 망취소 시도 후 에러 전파
    await inicis.netCancel({ netCancelUrl, mid: mid || INICIS.mid, authToken, signKey: INICIS.signKey });
    throw e;
  }
}

// 결제 취소(환불) — 관리자 또는 본인, PAID(배송 전) 주문만.
async function cancelInicis({ orderNo, userId, reason, clientIp }) {
  const order = await orderRepo.findByOrderNo(orderNo);
  if (!order) throw new DomainError(404, '주문을 찾을 수 없어요.');

  const member = userId && await memberRepo.findActiveByUserId(userId);
  if (!member) throw new DomainError(401, '로그인이 필요해요.');
  const isAdmin = member.role === 'ADMIN';
  if (!isAdmin && order.memberUserId !== userId) throw new DomainError(403, '본인 또는 관리자만 취소할 수 있어요.');

  if (order.status !== STATUS.PAID) throw new DomainError(409, '결제 완료(배송 전) 주문만 취소할 수 있어요.');
  if (!order.payment || order.payment.provider !== 'INICIS' || !order.payment.pgTid) {
    throw new DomainError(400, '취소할 결제 정보가 없어요.');
  }

  const mid = (order.payment.raw && (order.payment.raw.mid || order.payment.raw.MID)) || INICIS.mid;

  // 실제 PG 환불: INIAPI 키가 있으면 호출해서 성공해야 취소.
  //   - 키 있음        → 이니시스 환불 API 실제 호출(실환불).  refunded=true
  //   - 키 없음+실상점  → 오취소 방지 위해 막음.
  //   - 키 없음+테스트  → 애초에 실제 청구가 없으니 로컬 취소만.  refunded=false
  let refunded = false;
  if (INICIS.apiKey) {
    const r = await inicis.cancel({
      mid, tid: order.payment.pgTid, apiKey: INICIS.apiKey,
      method: order.payment.method, reason, clientIp,
    });
    const ok = r && (r.resultCode === '00' || r.resultCode === '0000');
    if (!ok) throw new DomainError(400, (r && r.resultMsg) || '결제 취소(환불)에 실패했어요.');
    refunded = true;
  } else if (mid !== 'INIpayTest') {
    throw new DomainError(400, '실 상점 취소에는 INICIS_API_KEY(환불 API 키)가 필요해요. secrets.json 에 넣어주세요.');
  }

  const updatedPayment = { ...order.payment, status: PAY_STATUS.CANCELLED, cancelledAt: new Date() };
  const res = await orderRepo.cancel(orderNo, updatedPayment);
  return { ...toOrder(res.value || res), refunded };
}

module.exports = { prepareInicis, confirmInicis, cancelInicis };

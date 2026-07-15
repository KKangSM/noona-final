// 결제 컨트롤러 (/payment) — KG이니시스
const { sendJson, readBody, readForm } = require('../lib/http');
const service = require('./payment.service');

const originOf = (req) => `http://${req.headers.host || 'localhost'}`;

// POST /payment/inicis/prepare  { orderNo, userId } → 결제창 파라미터(서버 서명)
async function inicisPrepare(req, res) {
  const { orderNo, userId } = await readBody(req);
  sendJson(res, 200, await service.prepareInicis({ orderNo, userId, origin: originOf(req) }));
}

// POST /payment/inicis/cancel  { orderNo, userId, reason } → 결제 취소(환불)
async function inicisCancel(req, res) {
  const { orderNo, userId, reason } = await readBody(req);
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  sendJson(res, 200, await service.cancelInicis({ orderNo, userId, reason, clientIp }));
}

// POST /payment/inicis/return  (이니시스가 form-urlencoded 로 POST) → 승인 후 SPA 로 리다이렉트
async function inicisReturn(req, res) {
  const body = await readForm(req);
  try {
    const order = await service.confirmInicis(body);
    redirect(res, `/index.html?pay=done&orderNo=${encodeURIComponent(order.orderNo)}`);
  } catch (e) {
    const msg = (e && e.message) || '결제 처리 중 오류가 발생했어요.';
    redirect(res, `/index.html?pay=fail&msg=${encodeURIComponent(msg)}`);
  }
}

// GET /payment/inicis/close — 사용자가 결제창을 닫았을 때
function inicisClose(req, res) {
  redirect(res, '/index.html?pay=cancel');
}

// 결제창(최상위 창)을 SPA 로 되돌림
function redirect(res, url) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><script>location.replace(${JSON.stringify(url)});</script>`);
}

module.exports = { inicisPrepare, inicisCancel, inicisReturn, inicisClose };

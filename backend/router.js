// API 라우팅 — 경로 파라미터(:id) 지원. "METHOD URL" → 컨트롤러 핸들러 매핑.
// DomainError 는 지정 상태코드로, 그 외 예외는 500 으로 응답.
const auth = require('./auth/auth.controller');
const mypage = require('./mypage/mypage.controller');
const product = require('./product/product.controller');
const order = require('./order/order.controller');
const upload = require('./upload/upload.controller');
const payment = require('./payment/payment.controller');
const { sendJson } = require('./lib/http');
const { DomainError } = require('./lib/errors');

// [method, pathPattern, handler] — 리터럴 경로를 :param 경로보다 먼저 둔다.
const routes = [
  ['POST', '/auth/signup',           auth.signup],
  ['POST', '/auth/login',            auth.login],
  ['POST', '/auth/checkId',          auth.checkId],

  ['GET',  '/mypage',                mypage.detail],
  ['POST', '/mypage/edit',           mypage.edit],
  ['POST', '/mypage/changePassword', mypage.changePassword],
  ['POST', '/mypage/withdraw',       mypage.withdraw],

  ['GET',  '/products',              product.list],
  ['POST', '/products/register',     product.register],
  ['GET',  '/products/:id',          product.detail],
  ['POST', '/products/:id/edit',     product.edit],
  ['POST', '/products/:id/delete',   product.remove],

  ['POST', '/orders/register',       order.register],
  ['GET',  '/orders',                order.list],
  ['GET',  '/orders/:id',            order.detail],

  ['GET',  '/admin/orders',          order.adminList],
  ['POST', '/admin/upload',          upload.upload],

  ['POST', '/payment/inicis/prepare', payment.inicisPrepare],
  ['POST', '/payment/inicis/cancel',  payment.inicisCancel],
  ['POST', '/payment/inicis/return',  payment.inicisReturn],
  ['GET',  '/payment/inicis/close',   payment.inicisClose],
];

// 패턴과 URL 을 세그먼트 단위로 비교 → 일치하면 params, 아니면 null
function matchPath(pattern, url) {
  const pp = pattern.split('/');
  const up = url.split('/');
  if (pp.length !== up.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(up[i]);
    else if (pp[i] !== up[i]) return null;
  }
  return params;
}

// API 요청을 처리했으면 true, 라우트가 없으면 false(→ 정적 파일로 넘김)
async function handle(req, res) {
  const url = req.url.split('?')[0];
  let matched = null;
  for (const [method, pattern, handler] of routes) {
    if (method !== req.method) continue;
    const params = matchPath(pattern, url);
    if (params) { matched = { handler, params }; break; }
  }
  if (!matched) return false;

  try {
    await matched.handler(req, res, matched.params);
  } catch (e) {
    if (e instanceof DomainError) sendJson(res, e.status, { message: e.message });
    else { console.error(e); sendJson(res, 500, { message: '서버 오류가 발생했어요.' }); }
  }
  return true;
}

module.exports = { handle };

// KG이니시스 (INIStdPay 표준결제) 어댑터
// - signStdPay: 결제창 요청용 서명(서버에서만 생성, signKey 비노출)
// - approve   : returnUrl 콜백의 authUrl 로 승인 요청 → 승인 JSON
// - netCancel : 승인 실패/대사 오류 시 망취소(best-effort)
// - normalize : 승인 JSON → PG 중립 payment 로 변환
const https = require('https');
const crypto = require('crypto');
const { PAY_STATUS, PAY_METHOD } = require('../order/order.entity');

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const sha512 = (s) => crypto.createHash('sha512').update(String(s), 'utf8').digest('hex');

// INIAPI timestamp: yyyyMMddHHmmss
function apiTimestamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// 이니시스 payMethod → 정규화 결제수단
const METHOD_MAP = {
  Card: PAY_METHOD.CARD,
  VBank: PAY_METHOD.VBANK,
  DirectBank: PAY_METHOD.TRANSFER,
  EasyPay: PAY_METHOD.EASY_PAY,
  HPP: PAY_METHOD.CARD,
};

// 결제창 요청 서명 3종
function signStdPay({ oid, price, timestamp, signKey }) {
  return {
    signature: sha256(`oid=${oid}&price=${price}&timestamp=${timestamp}`),
    verification: sha256(`oid=${oid}&price=${price}&signKey=${signKey}&timestamp=${timestamp}`),
    mKey: sha256(signKey),
  };
}

// 승인/망취소 요청 서명 2종
function signAuth({ authToken, timestamp, signKey }) {
  return {
    signature: sha256(`authToken=${authToken}&timestamp=${timestamp}`),
    verification: sha256(`authToken=${authToken}&signKey=${signKey}&timestamp=${timestamp}`),
  };
}

// x-www-form-urlencoded POST → JSON 응답
function postForm(urlStr, form) {
  const body = new URLSearchParams(form).toString();
  const u = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ resultCode: '9999', resultMsg: 'PG 응답 파싱 실패', _raw: data }); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 승인 요청 — authUrl 은 이니시스가 준 값(이니시스 도메인이어야 함)
async function approve({ authUrl, mid, authToken, signKey }) {
  if (!/^https:\/\/[a-z0-9.-]*inicis\.com\//i.test(authUrl)) {
    throw new Error('승인 URL이 올바르지 않아요.');
  }
  const timestamp = Date.now();
  const { signature, verification } = signAuth({ authToken, timestamp, signKey });
  return postForm(authUrl, { mid, authToken, timestamp, signature, verification, charset: 'UTF-8', format: 'JSON' });
}

// 망취소 (승인 전 단계 되돌림) — best-effort
async function netCancel({ netCancelUrl, mid, authToken, signKey }) {
  if (!netCancelUrl) return null;
  const timestamp = Date.now();
  const { signature, verification } = signAuth({ authToken, timestamp, signKey });
  try { return await postForm(netCancelUrl, { mid, authToken, timestamp, signature, verification, charset: 'UTF-8', format: 'JSON' }); }
  catch { return null; }
}

// 승인 JSON → PG 중립 payment
function normalize(json) {
  const ok = json.resultCode === '0000';
  const appl = String(json.applDate || '') + String(json.applTime || '');
  let approvedAt = null;
  if (/^\d{14}$/.test(appl)) {
    approvedAt = new Date(`${appl.slice(0, 4)}-${appl.slice(4, 6)}-${appl.slice(6, 8)}T${appl.slice(8, 10)}:${appl.slice(10, 12)}:${appl.slice(12, 14)}`);
  }
  return {
    provider: 'INICIS',
    method: METHOD_MAP[json.payMethod] || PAY_METHOD.CARD,
    status: ok ? PAY_STATUS.PAID : PAY_STATUS.FAILED,
    amount: Number(json.TotPrice) || 0,
    pgTid: json.tid || json.TID || null,
    merchantOrderId: json.MOID || json.oid || null,
    receiptUrl: json.receiptUrl || null,
    approvedAt,
    raw: json,
  };
}

// 승인된 결제 취소(환불) — INIAPI. apiKey(환불 API 키) 필요.
// hashData = SHA512(apiKey + type + paymethod + timestamp + clientIp + mid + tid)
async function cancel({ mid, tid, apiKey, method, reason, clientIp }) {
  const type = 'Refund';
  const paymethod = method === PAY_METHOD.VBANK ? 'VBank' : 'Card';
  const timestamp = apiTimestamp();
  const ip = clientIp || '127.0.0.1';
  const hashData = sha512(`${apiKey}${type}${paymethod}${timestamp}${ip}${mid}${tid}`);
  return postForm('https://iniapi.inicis.com/api/v1/refund', {
    type, paymethod, timestamp, clientIp: ip, mid, tid,
    msg: reason || '고객 요청 취소', hashData,
  });
}

module.exports = { signStdPay, approve, netCancel, normalize, cancel };

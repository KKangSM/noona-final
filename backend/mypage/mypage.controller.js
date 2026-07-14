// 마이페이지 컨트롤러 (/mypage/*) — 요청 파싱 후 서비스 호출, 응답만 담당
const { sendJson, readBody } = require('../lib/http');
const service = require('./mypage.service');

// GET /mypage?email=...
async function detail(req, res) {
  const email = new URL(req.url, 'http://localhost').searchParams.get('email');
  sendJson(res, 200, await service.detail(email));
}

// POST /mypage/edit
async function edit(req, res) {
  sendJson(res, 200, await service.edit(await readBody(req)));
}

// POST /mypage/changePassword
async function changePassword(req, res) {
  sendJson(res, 200, await service.changePassword(await readBody(req)));
}

// POST /mypage/withdraw
async function withdraw(req, res) {
  sendJson(res, 200, await service.withdraw(await readBody(req)));
}

module.exports = { detail, edit, changePassword, withdraw };

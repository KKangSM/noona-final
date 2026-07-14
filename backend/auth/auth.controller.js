// 인증 컨트롤러 (/auth/*) — 요청 파싱 후 서비스 호출, 응답만 담당
const { sendJson, readBody } = require('../lib/http');
const service = require('./auth.service');

async function signup(req, res) {
  const out = await service.signup(await readBody(req));
  sendJson(res, 201, out);
}

async function login(req, res) {
  const out = await service.login(await readBody(req));
  sendJson(res, 200, out);
}

async function checkId(req, res) {
  const { email } = await readBody(req);
  sendJson(res, 200, await service.checkId(email));
}

module.exports = { signup, login, checkId };

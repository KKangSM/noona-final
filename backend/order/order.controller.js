// 주문 컨트롤러 (/orders)
const { sendJson, readBody } = require('../lib/http');
const service = require('./order.service');

// POST /orders/register — 주문 생성
async function register(req, res) {
  sendJson(res, 201, await service.create(await readBody(req)));
}

// GET /orders?userId=... — 내 주문 목록
async function list(req, res) {
  const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
  sendJson(res, 200, await service.myOrders(userId));
}

// GET /orders/:id?userId=... — 주문 상세(본인)
async function detail(req, res, params) {
  const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
  sendJson(res, 200, await service.detail(params.id, userId));
}

// GET /admin/orders?userId=... — 전체 주문(어드민)
async function adminList(req, res) {
  const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
  sendJson(res, 200, await service.allOrders(userId));
}

module.exports = { register, list, detail, adminList };

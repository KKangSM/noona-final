// 상품 컨트롤러 (/products) — K-Evolution CRUD 규칙: list/detail/register/edit/delete
const { sendJson, readBody } = require('../lib/http');
const service = require('./product.service');

// GET /products
async function list(req, res) {
  sendJson(res, 200, await service.list());
}

// GET /products/:id
async function detail(req, res, params) {
  sendJson(res, 200, await service.detail(params.id));
}

// POST /products/register
async function register(req, res) {
  sendJson(res, 201, await service.register(await readBody(req)));
}

// POST /products/:id/edit
async function edit(req, res, params) {
  sendJson(res, 200, await service.edit(params.id, await readBody(req)));
}

// POST /products/:id/delete
async function remove(req, res, params) {
  sendJson(res, 200, await service.remove(params.id));
}

module.exports = { list, detail, register, edit, remove };

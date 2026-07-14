// 상품 비즈니스 로직 (목록 R · 상세 R · 등록 C · 수정 U · 삭제 D)
const repo = require('./product.repository');
const { newProduct, toProduct } = require('./product.entity');
const { DomainError } = require('../lib/errors');

function parsePrice(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function list() {
  return (await repo.findAll()).map(toProduct);
}

async function detail(id) {
  const p = await repo.findById(id);
  if (!p) throw new DomainError(404, '상품을 찾을 수 없어요.');
  return toProduct(p);
}

async function register({ name, price }) {
  if (!name || !String(name).trim()) throw new DomainError(400, '상품명을 입력해 주세요.');
  const p = parsePrice(price);
  if (p === null) throw new DomainError(400, '가격을 올바르게 입력해 주세요.');
  const doc = newProduct({ name: String(name).trim(), price: p });
  const r = await repo.insert(doc);
  return toProduct({ _id: r.insertedId, ...doc });
}

async function edit(id, { name, price }) {
  const set = {};
  if (name !== undefined) {
    if (!String(name).trim()) throw new DomainError(400, '상품명을 입력해 주세요.');
    set.name = String(name).trim();
  }
  if (price !== undefined) {
    const p = parsePrice(price);
    if (p === null) throw new DomainError(400, '가격을 올바르게 입력해 주세요.');
    set.price = p;
  }
  if (!Object.keys(set).length) throw new DomainError(400, '수정할 내용이 없어요.');
  const r = await repo.update(id, set);
  const doc = r && (r.value || r);   // 드라이버 버전별 반환 형태 대응
  if (!doc || !doc._id) throw new DomainError(404, '상품을 찾을 수 없어요.');
  return toProduct(doc);
}

async function remove(id) {
  const r = await repo.remove(id);
  if (!r.deletedCount) throw new DomainError(404, '상품을 찾을 수 없어요.');
  return { id };
}

module.exports = { list, detail, register, edit, remove };

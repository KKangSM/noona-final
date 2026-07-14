// 상품 데이터 접근 계층 (MongoDB products 컬렉션)
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { DEFAULT_PRODUCTS } = require('./product.entity');

const col = () => getDb().collection('products');
const oid = (id) => { try { return new ObjectId(id); } catch { return null; } };

const findAll = () => col().find().sort({ createdAt: 1 }).toArray();

async function findById(id) {
  const _id = oid(id);
  return _id ? col().findOne({ _id }) : null;
}

const insert = (doc) => col().insertOne(doc);

async function update(id, set) {
  const _id = oid(id);
  if (!_id) return null;
  return col().findOneAndUpdate({ _id }, { $set: { ...set, updatedAt: new Date() } }, { returnDocument: 'after' });
}

async function remove(id) {
  const _id = oid(id);
  if (!_id) return { deletedCount: 0 };
  return col().deleteOne({ _id });
}

// 컬렉션이 비어 있으면 기본 상품 투입
async function ensureSeed() {
  if (await col().countDocuments() === 0) {
    const now = new Date();
    await col().insertMany(DEFAULT_PRODUCTS.map((p) => ({ ...p, createdAt: now, updatedAt: now })));
  }
}

module.exports = { findAll, findById, insert, update, remove, ensureSeed };

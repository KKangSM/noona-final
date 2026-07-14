// 주문 데이터 접근 계층 (MongoDB orders 컬렉션)
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');

const col = () => getDb().collection('orders');
const oid = (id) => { try { return new ObjectId(id); } catch { return null; } };

async function ensureIndexes() {
  await col().createIndex({ memberUserId: 1, createdAt: -1 });
}

const insert = (doc) => col().insertOne(doc);

// 회원 아이디로 내 주문 목록 — 최신순
const findByUserId = (userId) => col().find({ memberUserId: userId }).sort({ createdAt: -1 }).toArray();

// 전체 주문 — 최신순 (어드민)
const findAll = () => col().find().sort({ createdAt: -1 }).toArray();

async function findById(id) {
  const _id = oid(id);
  return _id ? col().findOne({ _id }) : null;
}

async function updateStatus(id, status) {
  const _id = oid(id);
  if (!_id) return null;
  return col().findOneAndUpdate({ _id }, { $set: { status, updatedAt: new Date() } }, { returnDocument: 'after' });
}

module.exports = { ensureIndexes, insert, findByUserId, findAll, findById, updateStatus };

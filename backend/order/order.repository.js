// 주문 데이터 접근 계층 (MongoDB orders 컬렉션)
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');

const col = () => getDb().collection('orders');
const oid = (id) => { try { return new ObjectId(id); } catch { return null; } };

async function ensureIndexes() {
  const c = col();
  await c.createIndex({ memberUserId: 1, createdAt: -1 });   // 내 주문 목록
  await c.createIndex({ orderNo: 1 }, { unique: true, sparse: true });  // 주문번호 조회(PG 대사). 옛 문서(orderNo 없음)는 sparse 로 제외
  await c.createIndex({ 'payment.pgTid': 1 });                // 결제키로 조회(취소/조회)
  await c.createIndex({ status: 1, createdAt: -1 });          // 관리자 상태별
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

const findByOrderNo = (orderNo) => col().findOne({ orderNo });

// 결제 승인 반영: payment 저장 + 주문 상태 전이 + 이력 추가 (원자적)
async function markPaid(orderNo, payment, status) {
  const now = new Date();
  return col().findOneAndUpdate(
    { orderNo },
    {
      $set: { payment, status, updatedAt: now },
      $push: { statusHistory: { status, at: now } },
    },
    { returnDocument: 'after' },
  );
}

// 결제 취소 반영: payment 갱신 + 상태 CANCELLED + 이력
async function cancel(orderNo, payment) {
  const now = new Date();
  return col().findOneAndUpdate(
    { orderNo },
    {
      $set: { payment, status: 'CANCELLED', updatedAt: now },
      $push: { statusHistory: { status: 'CANCELLED', at: now } },
    },
    { returnDocument: 'after' },
  );
}

// 상태만 전이 + 이력
async function setStatus(id, status) {
  const _id = oid(id);
  if (!_id) return null;
  const now = new Date();
  return col().findOneAndUpdate(
    { _id },
    { $set: { status, updatedAt: now }, $push: { statusHistory: { status, at: now } } },
    { returnDocument: 'after' },
  );
}

module.exports = { ensureIndexes, insert, findByUserId, findAll, findById, findByOrderNo, markPaid, cancel, setStatus };

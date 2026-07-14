// 회원 데이터 접근 계층 (MongoDB users 컬렉션)
// K-Evolution Repository 규칙에 맞춘 파생 조회 메서드명: findByEmail / existsByEmail ...
const { getDb } = require('../config/db');
const { STATUS } = require('./member.entity');

const col = () => getDb().collection('users');

async function ensureIndexes() {
  const c = col();
  // 예전 email 유니크 인덱스 제거 (이제 로그인 키는 userId)
  try { await c.dropIndex('email_1'); } catch { /* 없으면 무시 */ }
  // userId 유니크 (userId 없는 옛 도큐먼트는 sparse 로 제외)
  await c.createIndex({ userId: 1 }, { unique: true, sparse: true });
}

const findByUserId = (userId) => col().findOne({ userId });

async function findActiveByUserId(userId) {
  const u = await col().findOne({ userId });
  return u && u.status !== STATUS.WITHDRAWN ? u : null;
}

const existsByUserId = async (userId) => !!(await col().findOne({ userId }));

const insert = (member) => col().insertOne(member);

const updateName = (userId, name) =>
  col().updateOne({ userId }, { $set: { name, updatedAt: new Date() } });

const updatePassword = (userId, passwordHash) =>
  col().updateOne({ userId }, { $set: { password: passwordHash, updatedAt: new Date() } });

// soft-delete: 상태만 WITHDRAWN 으로 (row 유지)
const withdraw = (userId) =>
  col().updateOne({ userId }, { $set: { status: STATUS.WITHDRAWN, updatedAt: new Date() } });

const setRole = (userId, role) =>
  col().updateOne({ userId }, { $set: { role, updatedAt: new Date() } });

module.exports = {
  ensureIndexes, findByUserId, findActiveByUserId, existsByUserId,
  insert, updateName, updatePassword, withdraw, setRole,
};

// 회원 데이터 접근 계층 (MongoDB users 컬렉션)
// K-Evolution Repository 규칙에 맞춘 파생 조회 메서드명: findByEmail / existsByEmail ...
const { getDb } = require('../config/db');
const { STATUS } = require('./member.entity');

const col = () => getDb().collection('users');

async function ensureIndexes() {
  await col().createIndex({ email: 1 }, { unique: true });
}

const findByEmail = (email) => col().findOne({ email });

async function findActiveByEmail(email) {
  const u = await col().findOne({ email });
  return u && u.status !== STATUS.WITHDRAWN ? u : null;
}

const existsByEmail = async (email) => !!(await col().findOne({ email }));

const insert = (member) => col().insertOne(member);

const updateName = (email, name) =>
  col().updateOne({ email }, { $set: { name, updatedAt: new Date() } });

const updatePassword = (email, passwordHash) =>
  col().updateOne({ email }, { $set: { password: passwordHash, updatedAt: new Date() } });

// soft-delete: 상태만 WITHDRAWN 으로 (row 유지)
const withdraw = (email) =>
  col().updateOne({ email }, { $set: { status: STATUS.WITHDRAWN, updatedAt: new Date() } });

module.exports = {
  ensureIndexes, findByEmail, findActiveByEmail, existsByEmail,
  insert, updateName, updatePassword, withdraw,
};

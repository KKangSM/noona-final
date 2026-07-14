// 인증 비즈니스 로직 (회원가입 · 로그인 · 이메일 중복확인 · 재인증)
const bcrypt = require('bcryptjs');
const repo = require('../member/member.repository');
const { newMember, toProfile } = require('../member/member.entity');
const { DomainError } = require('../lib/errors');
const { isEmail } = require('../lib/http');

async function signup({ name, email, password }) {
  if (!name || !email || !password) throw new DomainError(400, '모든 항목을 입력해 주세요.');
  if (!isEmail(email))              throw new DomainError(400, '이메일 형식이 올바르지 않아요.');
  if (String(password).length < 4)  throw new DomainError(400, '비밀번호는 4자 이상이어야 해요.');
  if (await repo.existsByEmail(email)) throw new DomainError(409, '이미 가입된 이메일이에요.');

  const trimmed = String(name).trim();
  const passwordHash = await bcrypt.hash(String(password), 10);
  await repo.insert(newMember({ name: trimmed, email, passwordHash }));
  return { name: trimmed, email };
}

// 이메일 + 비밀번호로 재인증 → 회원 도큐먼트 또는 null (로그인·마이페이지 공용)
async function authenticate(email, password) {
  const member = await repo.findActiveByEmail(email);
  if (!member) return null;
  const ok = await bcrypt.compare(String(password || ''), member.password);
  return ok ? member : null;
}

async function login({ email, password }) {
  if (!email || !password) throw new DomainError(400, '이메일과 비밀번호를 입력해 주세요.');
  const member = await authenticate(email, password);
  if (!member) throw new DomainError(401, '이메일 또는 비밀번호가 올바르지 않아요.');
  return toProfile(member);
}

async function checkId(email) {
  if (!isEmail(email)) throw new DomainError(400, '이메일 형식이 올바르지 않아요.');
  return { available: !(await repo.existsByEmail(email)) };
}

module.exports = { signup, login, checkId, authenticate };

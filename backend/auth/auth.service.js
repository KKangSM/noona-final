// 인증 비즈니스 로직 (회원가입 · 로그인 · 이메일 중복확인 · 재인증)
const bcrypt = require('bcryptjs');
const repo = require('../member/member.repository');
const { newMember, toProfile, ROLE } = require('../member/member.entity');
const { DomainError } = require('../lib/errors');
const { isEmail } = require('../lib/http');

// 서버 시작 시 어드민 계정 보장 (없으면 생성, 있으면 ADMIN 권한 부여)
async function ensureAdmin({ userId, name, password }) {
  if (!userId || !password) return;
  const existing = await repo.findByUserId(userId);
  if (!existing) {
    const hash = await bcrypt.hash(String(password), 10);
    await repo.insert(newMember({ userId, name: name || '관리자', email: '', passwordHash: hash, role: ROLE.ADMIN }));
    console.log('  ✓ 어드민 계정 생성됨 (' + userId + ')');
  } else if (existing.role !== ROLE.ADMIN) {
    await repo.setRole(userId, ROLE.ADMIN);
  }
}

async function signup({ userId, name, email, password }) {
  if (!userId || !name || !password) throw new DomainError(400, '아이디·이름·비밀번호를 입력해 주세요.');
  if (!/^[A-Za-z0-9_]{4,20}$/.test(String(userId))) throw new DomainError(400, '아이디는 영문·숫자 4~20자예요.');
  if (String(password).length < 4)  throw new DomainError(400, '비밀번호는 4자 이상이어야 해요.');
  if (email && !isEmail(email))      throw new DomainError(400, '이메일 형식이 올바르지 않아요.');
  if (await repo.existsByUserId(userId)) throw new DomainError(409, '이미 사용 중인 아이디예요.');

  const trimmed = String(name).trim();
  const passwordHash = await bcrypt.hash(String(password), 10);
  await repo.insert(newMember({ userId: String(userId), name: trimmed, email: email || '', passwordHash }));
  return { userId: String(userId), name: trimmed };
}

// 아이디 + 비밀번호로 재인증 → 회원 도큐먼트 또는 null (로그인·마이페이지 공용)
async function authenticate(userId, password) {
  const member = await repo.findActiveByUserId(userId);
  if (!member) return null;
  const ok = await bcrypt.compare(String(password || ''), member.password);
  return ok ? member : null;
}

async function login({ userId, password }) {
  if (!userId || !password) throw new DomainError(400, '아이디와 비밀번호를 입력해 주세요.');
  const member = await authenticate(userId, password);
  if (!member) throw new DomainError(401, '아이디 또는 비밀번호가 올바르지 않아요.');
  return toProfile(member);
}

async function checkId(userId) {
  if (!userId) throw new DomainError(400, '아이디를 입력해 주세요.');
  return { available: !(await repo.existsByUserId(userId)) };
}

module.exports = { signup, login, checkId, authenticate, ensureAdmin };

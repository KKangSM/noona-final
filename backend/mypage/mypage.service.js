// 마이페이지 비즈니스 로직 (회원 조회 R · 이름/비번 수정 U · 탈퇴 D)
const bcrypt = require('bcryptjs');
const repo = require('../member/member.repository');
const { toProfile } = require('../member/member.entity');
const { authenticate } = require('../auth/auth.service');
const { DomainError } = require('../lib/errors');

// Read
async function detail(userId) {
  const member = await repo.findActiveByUserId(userId);
  if (!member) throw new DomainError(404, '회원 정보를 찾을 수 없어요.');
  return toProfile(member);
}

// Update — 이름
async function edit({ userId, password, name }) {
  const member = await authenticate(userId, password);
  if (!member) throw new DomainError(401, '비밀번호가 올바르지 않아요.');
  if (!name || !String(name).trim()) throw new DomainError(400, '이름을 입력해 주세요.');
  const trimmed = String(name).trim();
  await repo.updateName(userId, trimmed);
  return { userId, name: trimmed };
}

// Update — 비밀번호
async function changePassword({ userId, password, newPassword }) {
  const member = await authenticate(userId, password);
  if (!member) throw new DomainError(401, '현재 비밀번호가 올바르지 않아요.');
  if (String(newPassword || '').length < 4) throw new DomainError(400, '새 비밀번호는 4자 이상이어야 해요.');
  const hash = await bcrypt.hash(String(newPassword), 10);
  await repo.updatePassword(userId, hash);
  return { ok: true };
}

// Delete — 탈퇴(soft-delete)
async function withdraw({ userId, password }) {
  const member = await authenticate(userId, password);
  if (!member) throw new DomainError(401, '비밀번호가 올바르지 않아요.');
  await repo.withdraw(userId);
  return { ok: true };
}

module.exports = { detail, edit, changePassword, withdraw };

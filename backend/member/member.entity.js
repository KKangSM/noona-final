// 회원(Member) 엔티티 정의
// K-Evolution 규칙: 상태는 enum(ACTIVE/WITHDRAWN), 탈퇴는 soft-delete(row 유지),
//                   시간 필드 createdAt/updatedAt.
const STATUS = Object.freeze({ ACTIVE: 'ACTIVE', WITHDRAWN: 'WITHDRAWN' });

// 신규 회원 도큐먼트 생성 (비밀번호는 이미 해시된 값을 받는다)
function newMember({ name, email, passwordHash }) {
  const now = new Date();
  return {
    name,
    email,
    password: passwordHash,
    status: STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
}

// 외부로 내보낼 프로필 (민감정보 제외)
const toProfile = (m) => ({ name: m.name, email: m.email, createdAt: m.createdAt });

module.exports = { STATUS, newMember, toProfile };

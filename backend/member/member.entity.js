// 회원(Member) 엔티티 정의
// K-Evolution 규칙: 상태는 enum(ACTIVE/WITHDRAWN), 탈퇴는 soft-delete(row 유지),
//                   시간 필드 createdAt/updatedAt.
const STATUS = Object.freeze({ ACTIVE: 'ACTIVE', WITHDRAWN: 'WITHDRAWN' });
const ROLE = Object.freeze({ ADMIN: 'ADMIN', USER: 'USER' });

// 신규 회원 도큐먼트 생성 (비밀번호는 이미 해시된 값을 받는다)
// userId = 로그인 아이디(고유), email = 개인정보
function newMember({ userId, name, email, passwordHash, role }) {
  const now = new Date();
  return {
    userId,
    name,
    email: email || '',
    password: passwordHash,
    status: STATUS.ACTIVE,
    role: role || ROLE.USER,
    createdAt: now,
    updatedAt: now,
  };
}

// 외부로 내보낼 프로필 (민감정보 제외)
const toProfile = (m) => ({ userId: m.userId, name: m.name, email: m.email || '', role: m.role || ROLE.USER, createdAt: m.createdAt });

module.exports = { STATUS, ROLE, newMember, toProfile };

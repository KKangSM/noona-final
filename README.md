# 펜의 끝 · The Tip of the Pen

> *The world begins at the tip of my pen.*

바닐라 프론트엔드 + Node/MongoDB 백엔드로 만든 미니멀 펜 쇼핑몰입니다.
3D 커스텀 볼펜, 회원(로그인·회원가입·내정보), 상품 목록·상세를 지원합니다.

---

## ✨ 주요 기능

- **스플래시/인트로** — 심박선이 필기체 `pen` 으로 이어지는 진입 애니메이션
- **커스텀 볼펜 (3D)** — Three.js 로 조립한 펜을 드래그로 돌려보며 색상·문양·팁 굵기·심 종류·각인을 실시간 반영, 장바구니 담기
- **회원** — 회원가입 · 로그인 · 내정보(이름 수정 · 비밀번호 변경 · 회원 탈퇴)
- **상품** — 목록 · 상세 페이지 · 장바구니 (상품 CRUD API 제공)
- **장바구니** — localStorage 기반, 커스텀 펜과 일반 상품 공유

---

## 🛠 기술 스택

| 구분 | 사용 |
|------|------|
| 프론트 | HTML · CSS · Vanilla JS · Three.js (`vendor/`) |
| 백엔드 | Node.js (내장 `http`) |
| DB | MongoDB (Atlas) |
| 인증 | bcryptjs 해시 |

프레임워크 없이 순수 웹 기술로 구현했습니다.

---

## 📁 구조

```
final/
├─ index.html · style.css
├─ script.js          스플래시/인트로
├─ auth.js            로그인·회원가입·내정보 (프론트)
├─ products.js        상품 목록·상세 (프론트)
├─ custom.js          3D 커스텀 펜 + 장바구니
├─ vendor/            three.module.js
├─ server.js          서버 진입점
└─ backend/           계층형 백엔드 (도메인 우선)
   ├─ config/db.js
   ├─ lib/            http · errors · static
   ├─ member/         entity · repository
   ├─ auth/           service · controller
   ├─ mypage/         service · controller
   ├─ product/        entity · repository · service · controller
   └─ router.js
```

요청 흐름: **브라우저 → server.js → router → controller → service → repository → MongoDB**
자세한 내용은 [`코드리뷰.md`](./코드리뷰.md) 참고.

---

## 🚀 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. `secrets.json` 생성 (Git 에 포함되지 않음)
프로젝트 루트에 아래 형식으로 직접 만듭니다:
```json
{
  "MONGODB_URI": "mongodb+srv://<user>:<password>@<cluster>/?appName=Cluster0",
  "DB_NAME": "penshop",
  "PORT": 5173
}
```

### 3. 서버 실행
```bash
node server.js
```
→ 브라우저에서 **http://localhost:5173** 접속

> ⚠️ `index.html` 을 `file://` 로 직접 열면 ES 모듈/CORS 제약으로 3D·로그인이 동작하지 않습니다. 반드시 위 서버로 접속하세요.

---

## 🔌 API

### auth
- `POST /auth/signup` — 회원가입
- `POST /auth/login` — 로그인
- `POST /auth/checkId` — 이메일 중복확인

### mypage
- `GET  /mypage?email=` — 내정보 조회
- `POST /mypage/edit` — 이름 수정
- `POST /mypage/changePassword` — 비밀번호 변경
- `POST /mypage/withdraw` — 회원 탈퇴 (soft-delete)

### product
- `GET  /products` — 목록
- `GET  /products/:id` — 상세
- `POST /products/register` — 등록
- `POST /products/:id/edit` — 수정
- `POST /products/:id/delete` — 삭제

> URL·핸들러 네이밍은 K-Evolution 규칙을 따릅니다(리소스 소문자, 다단어 액션 camelCase, 상태변경 POST).

---

## 🔒 보안 메모

- 접속 정보는 `secrets.json` 에만 두고 `.gitignore` 로 제외합니다.
- 비밀번호는 bcrypt 로 해시 저장, 정보 수정·탈퇴 시 현재 비밀번호를 재확인합니다.
- 회원 탈퇴는 실제 삭제가 아닌 상태 변경(`WITHDRAWN`)으로 처리합니다.

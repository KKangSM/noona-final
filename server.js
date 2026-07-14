// 펜의 끝 — 진입점
// 정적 파일(프론트) + 회원 인증/마이페이지 API 를 한 서버에서 제공한다.
// 백엔드 계층은 backend/ 아래에 도메인 우선(config·lib·member·auth·mypage)으로 분리.
// 실행:  node server.js   →  http://localhost:5173  (file:// 로 열면 안 됨)

const http = require('http');
const db = require('./backend/config/db');
const memberRepo = require('./backend/member/member.repository');
const productRepo = require('./backend/product/product.repository');
const router = require('./backend/router');
const { createStaticHandler } = require('./backend/lib/static');

const PORT = db.cfg.PORT || 5173;
const serveStatic = createStaticHandler(db.ROOT);

const server = http.createServer(async (req, res) => {
  if (await router.handle(req, res)) return;   // API 라우트
  serveStatic(req, res);                        // 없으면 정적 파일
});

async function start() {
  try {
    await db.connect();
    await memberRepo.ensureIndexes();
    await productRepo.ensureSeed();
    console.log('  ✓ MongoDB 연결됨 (' + db.cfg.DB_NAME + ')');
  } catch (e) {
    console.error('  ✗ MongoDB 연결 실패:', e.message);
    console.error('    (정적 페이지는 뜨지만 로그인/가입은 안 됩니다. secrets.json 확인)');
  }
  server.listen(PORT, () => {
    console.log('\n  펜의 끝 · 서버 실행 중');
    console.log('  →  http://localhost:' + PORT + '\n');
  });
}

start();

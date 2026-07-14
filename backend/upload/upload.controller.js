// 이미지 업로드 (어드민 전용) — base64 data URL 을 받아 assets/uploads/ 에 저장
const fs = require('fs');
const path = require('path');
const { sendJson, readBody } = require('../lib/http');
const { DomainError } = require('../lib/errors');
const memberRepo = require('../member/member.repository');
const { ROOT } = require('../config/db');

const UPLOAD_DIR = path.join(ROOT, 'assets', 'uploads');
const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
};

// POST /admin/upload  { userId, dataUrl }
async function upload(req, res) {
  const { userId, dataUrl } = await readBody(req);
  const m = userId && await memberRepo.findActiveByUserId(userId);
  if (!m || m.role !== 'ADMIN') throw new DomainError(403, '관리자만 업로드할 수 있어요.');

  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) throw new DomainError(400, '이미지 형식이 올바르지 않아요.');
  const ext = EXT[match[1].toLowerCase()];
  if (!ext) throw new DomainError(400, '지원하지 않는 이미지 형식이에요.');

  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) throw new DomainError(400, '이미지가 너무 커요 (8MB 이하).');

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const fname = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);

  sendJson(res, 201, { url: '/assets/uploads/' + fname });
}

module.exports = { upload };

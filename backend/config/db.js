// MongoDB 연결 (secrets.json 에서 접속 정보 로드)
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const ROOT = path.join(__dirname, '..', '..');            // 프로젝트 루트
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'secrets.json'), 'utf8'));

let db = null;

async function connect() {
  const client = new MongoClient(cfg.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  await client.db(cfg.DB_NAME).command({ ping: 1 });
  db = client.db(cfg.DB_NAME);
  return db;
}

const getDb = () => db;

module.exports = { connect, getDb, cfg, ROOT };

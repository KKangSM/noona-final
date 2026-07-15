// 결제 PG 설정. secrets.json 에 값이 없으면 KG이니시스 공식 "테스트 상점"으로 동작(로컬 테스트용).
// 실서비스: secrets.json 에 INICIS_MID · INICIS_SIGN_KEY 를 넣으면 그 값이 우선.
const { cfg } = require('../config/db');

const INICIS = {
  mid: cfg.INICIS_MID || 'INIpayTest',
  signKey: cfg.INICIS_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS',
  // 환불(INIAPI) 키 — signKey 와 별개. 실 상점 취소에 필요. 없으면 테스트 상점 로컬 취소만 허용.
  apiKey: cfg.INICIS_API_KEY || '',
};

module.exports = { INICIS };

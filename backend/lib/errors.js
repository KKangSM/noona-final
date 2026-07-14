// 도메인 오류: HTTP 상태 코드 + 사용자 메시지를 함께 담는다.
// 컨트롤러/라우터가 이 오류를 잡아 상태코드로 응답한다.
class DomainError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'DomainError';
  }
}

module.exports = { DomainError };

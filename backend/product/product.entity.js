// 상품(Product) 엔티티 정의
function newProduct({ name, price }) {
  const now = new Date();
  return { name, price, createdAt: now, updatedAt: now };
}

// 외부로 내보낼 형태 (_id → id 문자열)
const toProduct = (p) => ({ id: p._id.toString(), name: p.name, price: p.price });

// 최초 실행 시 시드용 기본 상품 (컬렉션이 비어 있을 때만 투입)
const DEFAULT_PRODUCTS = [
  { name: '만년필 · 흑요', price: 128000 },
  { name: '볼펜 · 백야',   price: 64000 },
  { name: '잉크 · 심해',   price: 22000 },
  { name: '노트 · 여백',   price: 18000 },
];

module.exports = { newProduct, toProduct, DEFAULT_PRODUCTS };

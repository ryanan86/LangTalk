# RevenueCat 인앱결제 설정 가이드

## RevenueCat이란?
Apple/Google 인앱결제를 통합 관리하는 서비스.
- 영수증 검증 자동화
- 구독 상태 관리
- 크로스 플랫폼 동기화
- 월 $10,000 매출까지 무료

---

## 1단계: RevenueCat 가입

1. https://www.revenuecat.com 접속
2. "Get Started" 클릭
3. Google/GitHub 계정으로 가입

---

## 2단계: 프로젝트 생성

1. Dashboard에서 "Create New Project"
2. Project Name: `TapTalk`
3. 생성 완료

---

## 3단계: 앱 등록

### Google Play 앱 추가
1. Project → Apps → "Add App"
2. Platform: Google Play Store
3. App Name: TapTalk
4. Package Name: `com.taptalk.app`

### Google Play 연동
1. Play Console → 설정 → API 액세스
2. 서비스 계정 생성 (JSON 키 다운로드)
3. RevenueCat에 JSON 키 업로드

---

## 4단계: 구독 상품 생성

### Play Console에서 상품 생성
1. Play Console → 앱 → 수익 창출 → 구독
2. 구독 상품 추가:
   - 상품 ID: `taptalk_monthly`
   - 가격: ₩9,900/월

   - 상품 ID: `taptalk_yearly`
   - 가격: ₩99,000/년

### RevenueCat에서 상품 연결
1. Dashboard → Products → "Add Product"
2. Play Store 상품 ID 입력
3. Entitlement 연결: `premium`

---

## 5단계: Entitlement 설정

1. Dashboard → Entitlements → "Create New"
2. Identifier: `premium`
3. 모든 구독 상품을 이 Entitlement에 연결

---

## 6단계: API 키 복사

Dashboard → Project Settings → API Keys

필요한 키:
- `REVENUECAT_PUBLIC_API_KEY` (앱에서 사용)
- `REVENUECAT_SECRET_API_KEY` (서버에서 사용, 선택)

---

## 7단계: 앱에 SDK 설치

```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

---

## 8단계: 코드 연동

### 초기화
```typescript
import { Purchases } from '@revenuecat/purchases-capacitor';

// 앱 시작 시
await Purchases.configure({
  apiKey: 'your_revenuecat_public_api_key',
});

// 사용자 로그인 시 (Google 로그인 후)
await Purchases.logIn({ appUserID: userEmail });
```

### 구독 상태 확인
```typescript
const customerInfo = await Purchases.getCustomerInfo();
const isPremium = customerInfo.customerInfo.entitlements.active['premium'] !== undefined;
```

### 구매 진행
```typescript
const offerings = await Purchases.getOfferings();
const monthlyPackage = offerings.current?.monthly;

if (monthlyPackage) {
  const result = await Purchases.purchasePackage({ aPackage: monthlyPackage });
  // 구매 완료 처리
}
```

---

## 환경 변수

```env
NEXT_PUBLIC_REVENUECAT_API_KEY=your_public_api_key
REVENUECAT_SECRET_API_KEY=your_secret_api_key  # 서버용 (선택)
```

---

## 테스트

### 테스트 사용자 등록
1. Play Console → 설정 → 라이선스 테스트
2. 테스터 이메일 추가
3. 테스터는 결제 없이 구독 테스트 가능

### 테스트 모드
RevenueCat Dashboard → Project Settings → Sandbox Mode 활성화

---

## 체크리스트

- [ ] RevenueCat 가입
- [ ] 프로젝트 생성
- [ ] Google Play 앱 연동
- [ ] 서비스 계정 JSON 업로드
- [ ] 구독 상품 생성 (Play Console)
- [ ] 상품 연결 (RevenueCat)
- [ ] Entitlement 설정
- [ ] API 키 복사
- [ ] 앱에 SDK 설치
- [ ] 테스트 사용자 등록

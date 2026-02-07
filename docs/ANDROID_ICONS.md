# Android 앱 아이콘 생성 가이드

## 필요한 아이콘 사이즈

| 폴더 | 사이즈 | 용도 |
|------|--------|------|
| mipmap-mdpi | 48x48 | 일반 화면 |
| mipmap-hdpi | 72x72 | 고화질 |
| mipmap-xhdpi | 96x96 | 초고화질 |
| mipmap-xxhdpi | 144x144 | 초초고화질 |
| mipmap-xxxhdpi | 192x192 | 최고화질 |
| Play Store | 512x512 | 스토어 등록 |

---

## 방법 1: Android Asset Studio (추천)

1. https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html 접속
2. "Image" 탭에서 TapTalk 아이콘 업로드 (1024x1024 권장)
3. 배경색, 패딩 조절
4. "Download ZIP" 클릭
5. 압축 해제 후 `res/mipmap-*` 폴더를 프로젝트에 복사

복사 위치:
```
android/app/src/main/res/mipmap-*/
```

---

## 방법 2: Android Studio에서 생성

1. Android Studio에서 프로젝트 열기
2. `res` 폴더 우클릭 → New → Image Asset
3. "Launcher Icons (Adaptive and Legacy)" 선택
4. Source Asset에서 이미지 선택
5. 배경, 전경 레이어 설정
6. Finish 클릭

---

## 방법 3: Figma/Canva에서 직접 제작

### 디자인 가이드라인
- 원본: 1024 x 1024px
- 배경: 단색 또는 그라데이션
- 아이콘: 중앙에 위치, 여백 20% 이상
- 둥근 모서리 불필요 (Android가 자동 적용)

### TapTalk 현재 디자인
```
배경: #f5f5f5 (밝은 회색)
아이콘: 음성 막대 3개 (파랑-보라 그라데이션)
색상: #38bdf8 → #818cf8
```

---

## 아이콘 파일 교체

생성된 아이콘을 다음 위치에 복사:

```bash
# 복사 명령어 (ZIP 압축 해제 후)
cp -r downloaded/res/mipmap-* android/app/src/main/res/
```

또는 수동으로:
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

---

## Adaptive Icon (Android 8.0+)

최신 Android는 Adaptive Icon 사용:
- `ic_launcher_foreground.png` - 전경 레이어
- `ic_launcher_background.png` - 배경 레이어

Android Asset Studio에서 자동 생성됨.

---

## 체크리스트

- [ ] 원본 아이콘 1024x1024 준비
- [ ] Android Asset Studio에서 변환
- [ ] 모든 mipmap 폴더에 복사
- [ ] 512x512 Play Store 아이콘 별도 저장
- [ ] 앱 빌드 후 확인

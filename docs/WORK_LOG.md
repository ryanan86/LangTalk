# TapTalk Work Log

Daily development history for TapTalk (taptalk.xyz).

---

## 2026-02-21 (Fri)

### Summary
펜딩항목 일괄 진행: AbortSignal 타임아웃 전환, Debate Motion 명제형 전환, Vocab Book 페이지, 다크/라이트 모드 통일(10파일).

### Changes
| Category | Description |
|----------|-------------|
| Performance | chat/route.ts: withTimeout → AbortSignal 전환 (실제 요청 취소) |
| Performance | talk/page.tsx: playTTS/prefetchAudio/queueTTS에 AbortController 적용 |
| Debate | debateTopicsV2.ts: 27개 토픽 질문형→명제형 전환 + proArguments/conArguments 추가 |
| Debate | debateTopicsV2.ts: generateTopicFromContext 명제형 변경 |
| UI | vocab-book/page.tsx: 전체 단어장 페이지 신규 (stats/탭/카드그리드) |
| UI | talk/page.tsx: 단어장 섹션에 "전체 보기" 버튼 + "+N개 더 보기→" 링크 |
| Theme | globals.css: .report-glass 듀얼 테마 (light/dark) |
| Theme | 홈 컴포넌트 4개 (DashboardStats, LessonHistory, QuickActions, TutorCard) 듀얼 테마 |
| Theme | vocab-book, BottomNavDock, AnalysisReview 듀얼 테마 |
| Theme | talk/page.tsx 리포트/요약 섹션 + page.tsx 홈 장식 섹션 듀얼 테마 |

### Files Changed
- `src/app/globals.css` - .report-glass 테마 인식
- `src/app/api/chat/route.ts` - createAbortTimeout, withGeminiTimeout, signal 전달
- `src/app/talk/page.tsx` - ttsAbortRef, queueAbortRef, vocab-book 링크, 리포트 듀얼 테마
- `src/app/page.tsx` - 홈 장식 섹션 듀얼 테마
- `src/app/vocab-book/page.tsx` - NEW: 전체 단어장 페이지 + 듀얼 테마
- `src/lib/debateTopicsV2.ts` - 27토픽 명제형 + proArguments/conArguments
- `src/components/AnalysisReview.tsx` - 전체 듀얼 테마
- `src/components/BottomNavDock.tsx` - 듀얼 테마 nav bar
- `src/components/home/DashboardStats.tsx` - 듀얼 테마
- `src/components/home/LessonHistory.tsx` - 듀얼 테마
- `src/components/home/QuickActions.tsx` - 듀얼 테마
- `src/components/home/TutorCard.tsx` - 듀얼 테마

### Key Decisions
- OpenAI SDK는 signal 네이티브 지원, Gemini SDK는 미지원 → 이원화 전략
- Debate 토픽: 질문형은 찬반 구분이 모호 → 명제형으로 전환하여 isDebateReadyTopic 필터 활성화
- Vocab Book: mastered 탭은 API scope 미지원 → scope=all + 클라이언트 필터링
- 테마 통일 패턴: dark-only bg-white/[0.04] → dark:bg-white/[0.04] bg-black/[0.03]

---

## 2026-02-18 (Tue)

### Summary
CEFR 평가체계 전환(미국 학년제 폐기), 실시간 세션 안정성 개선(timeout/fallback/응답길이), nukai 코드리뷰 적용(vocabBook/learningRank/토론품질게이트).

### Changes
| Category | Description |
|----------|-------------|
| Evaluation | speakingMetrics.ts: US Grade -> CEFR 전환 (Pre-A1~C2), IELTS/TOEFL/TOEIC 변환 테이블 |
| Evaluation | speaking-evaluate/route.ts: cefrLevel 응답, getCefrIndex, methodology 변경 |
| Evaluation | speechMetrics.ts: scoreToCefr() 추가, scoreToGrade deprecated |
| Reliability | chat/route.ts: withTimeout 래퍼(Gemini 8s/OpenAI 10s), CONVERSATION_FALLBACK |
| Reliability | chat/route.ts: max_tokens 상향(interview 150->350, conversation 500->600) |
| Reliability | chat/route.ts: 프롬프트 수정 - "under 20 words" 제거, "2-4 sentences" 자연스러운 길이 |
| nukai Review | vocabBook.ts: proficiency 방향 수정(빈도높은=숙련도높게), 난이도 스코어링 개선 |
| nukai Review | learningRank.ts: 가짜 percentile 제거, compositeScore + 서술적 밴드로 교체 |
| nukai Review | debate-topics/route.ts: isDebateReadyTopic + topicQualityScore 품질게이트 |
| nukai Review | debate-chat/route.ts: resolveDebateMotion 자동 랩핑 |
| nukai Review | sheetHelper.ts: A:F->A:G, vocabBook 읽기/쓰기 |
| UI | talk/page.tsx: cefrLevel 표시(gradeLevel fallback), layout.tsx 테마감지 수정 |
| UI | page.tsx: 라이트모드 지원, test-report/page.tsx: CEFR 목업 데이터 |

### Commits
| Hash | Type | Description |
|------|------|-------------|
| (pending) | feat | CEFR evaluation + session reliability + nukai code review integration |

### Files Changed
- `src/lib/speakingMetrics.ts` - CEFR_BENCHMARKS, calculateCefrLevel, CEFR_TO_IELTS/TOEFL/TOEIC
- `src/lib/speechMetrics.ts` - scoreToCefr(), scoreToGrade deprecated alias
- `src/lib/vocabBook.ts` - NEW: proficiency 수정, BASIC_WORDS, ADVANCED_PATTERNS
- `src/lib/learningRank.ts` - NEW: compositeScore, 서술적 밴드(Advanced~Beginner)
- `src/lib/sheetHelper.ts` - A:G 확장, vocabBook column
- `src/lib/sheetTypes.ts` - VocabBookItem interface, vocabBook field
- `src/app/api/chat/route.ts` - withTimeout, fallback, max_tokens, prompt fixes
- `src/app/api/speaking-evaluate/route.ts` - cefrLevel response, getCefrIndex
- `src/app/api/debate-topics/route.ts` - quality gate functions
- `src/app/api/debate-chat/route.ts` - resolveDebateMotion
- `src/app/api/vocab-book/route.ts` - NEW: vocab book API endpoint
- `src/app/talk/page.tsx` - cefrLevel display with fallback
- `src/app/layout.tsx` - theme detection bug fix
- `src/app/page.tsx` - light mode support

### Key Decisions
- US Grade 평가 완전 폐기, CEFR이 ESL 학습자에게 적합
- 글로벌 사용자 전제 -> 동일 모국어 집단 기반 퍼센타일은 나중에
- nukai의 가짜 percentile 제거, 정직한 compositeScore 사용
- 세션 무응답 방지: 이중 fallback(Gemini->OpenAI->static)

### Known Issues Resolved
- 평가 결과가 항상 Kindergarten으로 고정되던 문제 -> CEFR로 해결
- 세션 중 튜터 무응답/멈춤 -> withTimeout + fallback으로 개선
- 응답이 너무 짧고 피상적 -> max_tokens 상향 + 프롬프트 제한 제거

---

## 2026-02-17 (Mon)

### Summary
전체 팀 회의(3팀 보고서) 완료, 텔레그램 봇 안정성 개선, 글로벌 스킬 17개 구축. Skills 리서치(공식문서 + 커뮤니티 3곳 + 블로그 2곳) 기반 4주 로드맵을 1일에 완료.

### Changes
| Category | Description |
|----------|-------------|
| Team Meeting | 젬팀장+클이사+오팀장 3팀 보고서 (OMC vs AI플랫폼, 구독 최적화, Skills) |
| Telegram Bot | httpGet timeout(60s) + health check(5min) 추가, auto-restart 안정화 |
| Global Skills | 17개 글로벌 스킬 구축 (~/.claude/skills/) |
| Codex Fix | codex login --with-api-key 인증 해결 |
| Context Mgmt | strategic-compact 스킬에 5계층 방어체계 + remember 태그 반영 |

### Files Changed
- `~/.claude/skills/` - 17개 SKILL.md 파일 신규 생성
- `scripts/telegram-bot-v2.mjs` - httpGet timeout + health check 추가
- `.omc/team-report-{gemini,claude,codex}.md` - 3팀 보고서
- `~/.claude/settings.json` - MCP PATH env 수정

### Key Decisions
- 스킬은 글로벌 우선, 프로젝트 전용은 나중에
- CLI+웹 이중구조는 Ryan 추가 검토 후 결정
- 브라우저 자동화(Playwright)는 전원 비추천

### Global Skills Built (17)
1주차: skill-creator, strategic-compact, verification-loop, session-wrap, quick-fix
2주차: tdd, subagent-dev, webapp-testing, changelog-gen
3주차: continuous-learning, design-review, code-review-checklist, dependency-check
4주차: deep-research, article-extractor, youtube-transcript, project-init

---

## 2026-02-16 (Sun)

### Summary
목업폰 튜터 아바타 애니메이션 사각형 아티팩트 수정, 비로그인 튜터 이미지 눈감김 문제 해결.

### Commits
| Hash | Type | Description |
|------|------|-------------|
| `3e32943` | fix | Mockup phone animation artifact + non-login tutor image display |

### Files Changed
- `src/components/hero/MockupChat.tsx` - animate-ping + inline transform 충돌 제거, 커스텀 mockup-ping 애니메이션, 타이머 메모리 누수 수정
- `src/app/globals.css` - @keyframes mockup-ping 추가 (원형 pulse 애니메이션)
- `src/app/page.tsx` - 비로그인 데모 섹션에 img 기본 레이어 추가, 구독 상태 체크 개선

### Key Decisions
- Tailwind animate-ping 대신 커스텀 CSS 애니메이션 사용 (인라인 transform과의 충돌 방지)
- 비로그인 데모 섹션을 로그인 섹션과 동일한 img+video 레이어 구조로 통일

---

## 2026-02-15 (Sat)

### Summary
Recurring mistake tracking & habit correction feature, saveAsImage mobile bug fix, report UI recurring pattern indicators, Stitch MCP setup.

### Commits
| Hash | Type | Description |
|------|------|-------------|
| `b991109` | feat | Recurring mistake detection with visual highlights + Galaxy Fold bottom fix |
| `5881f4a` | fix | saveAsImage single merged image + report recurring pattern indicators |
| `7c0c76e` | config | (private) Claude settings with Stitch MCP + API keys backup |

### Files Changed
- `src/app/talk/page.tsx` - saveAsImage merged canvas fix, repeatedCategories in summary phase, pattern repeat rendering
- `src/app/review/page.tsx` - Review flashcard amber styling for repeated corrections + Habit Alert badge
- `src/app/api/corrections/route.ts` - Dynamic repeat detection by category count
- `scripts/decision-injector.mjs` - Telegram permission response handling
- `scripts/ask_gemini.mjs` - ROLES system with --role flag (meeting, researcher, ux)
- `scripts/ask_gpt.mjs` - Added meeting role
- `~/.claude/settings.json` - Stitch MCP server + STITCH_API_KEY added

### Key Decisions
- Recurring patterns detected dynamically from existing corrections data (no new DB columns)
- saveAsImage changed from split multi-download to single merged canvas (mobile browsers block rapid sequential downloads)
- Pattern-to-category mapping uses keyword heuristic (grammar/vocabulary/pronunciation)
- Stitch MCP installed via `@_davideast/stitch-mcp proxy` for UI design generation

### Known Issues Resolved
- saveAsImage only saving last image on mobile (was: rapid link.click() blocked by browser)
- Galaxy Fold 2 bottom UI overlap (was: missing safe-area-inset-bottom)

---

## 2026-02-11 (Tue)

### Summary
Landing page major overhaul, global expansion, tutor system rename, conversation page UX improvements.

### Commits (18 total)
| Hash | Type | Description |
|------|------|-------------|
| `df6c420` | feat | Hero section: 6 video crossfade -> single `tutors_hero.mp4` loop with timeline sync |
| `3707767` | perf | Mobile performance: reduce blur, particles (20->8), static backgrounds |
| `36ec706` | perf | Scroll optimization: GPU promotion, targeted transitions, throttled handlers |
| `2bee1e0` | fix | Hero video missing from git + tutor card bg-white restoration |
| `df56891` | fix | Tutor greeting video audio restored (re-encoded from originals with AAC 96k) |
| `4f150cc` | fix | Mobile play button overlay removed (desktop hover only) |
| `3b55da6` | feat | Footer WhatsApp contact button added (85270742030) |
| `d14ad5b` | refactor | KakaoTalk disabled button removed, WhatsApp unified for all languages |
| `557247b` | fix | Tutor card bg-white + video poster JPG extraction |
| `b70dbdd` | feat | 14 global reviews added (35 total from 14 countries) |
| `1e80951` | fix | Tutor poster replaced with original profile images (natural expression) |
| `2ccfcd0` | fix | Desktop hover video playback - browser autoplay policy unlock |
| `805d0f7` | docs | WORK_LOG.md daily work log added |
| `88c482f` | fix | henly.png missing - tutor avatar not displaying |
| `b5b69f1` | refactor | henly -> henry full codebase rename (10 files) |
| `d7b1e51` | fix | Henry avatar RGBA image restored for circular crop |
| `d540d38` | fix | Conversation page tutor avatar size increased (320/384/448px) |

### Files Changed
- `src/app/page.tsx` - Hero video, performance, tutor cards, footer, video unlock, henry rename
- `src/lib/i18n.tsx` - `contactUs` translations, henlyDesc -> henryDesc rename
- `src/lib/personas.ts` - henly -> henry ID rename
- `src/components/TutorAvatar.tsx` - henly -> henry, avatar size increased (w-80/96/[28rem])
- `src/components/hero/reviewData.ts` - 14 global reviews added
- `src/components/onboarding/TutorIntroCarousel.tsx` - henly -> henry
- `src/components/home/TutorCard.tsx` - henly -> henry
- `src/components/home/LessonHistory.tsx` - henly -> henry
- `src/app/admin/tts-test/page.tsx` - henly -> henry
- `src/app/api/tts-test/route.ts` - henly -> henry
- `src/app/api/chat/route.ts` - henly -> henry
- `public/tutors/` - Hero video, posters, greeting videos (audio), JPG/PNG images, henry.png RGBA restored
- `docs/WORK_LOG.md` - Daily work log created

### Key Decisions
- Hero: Single combined video with `timeupdate` timeline sync instead of 6 separate videos
- Performance: Mobile gets static backgrounds, desktop keeps animations (quality preservation principle)
- Contact: WhatsApp unified (KakaoTalk removed until channel is ready)
- Reviews: Korean + global mix for international credibility
- Tutor posters: Original profile JPG images instead of video frame extraction (eyes-closed issue)
- Naming: `henly` -> `henry` full codebase rename for consistency
- Git: Public (LangTalk) / Private (langtalk-config) repo separation enforced

### Known Issues Resolved
- Scroll jank on mobile (backdrop-blur, heavy animations)
- Hero video not deployed (missing from git)
- Greeting video audio stripped by ffmpeg `-an` flag
- Play button overlay persistent on mobile after tap
- Video poster showing eyes-closed frames
- Desktop hover requiring click before video plays
- Henry tutor avatar not displaying (henly.png missing after rename)
- Henry avatar square crop in conversation page (RGB -> RGBA restored)
- Conversation page tutor avatar too small

---

## 2026-02-12 (Wed)

### Summary
Scheduled call notification system (Firebase + Web Push + GitHub Actions cron), DeepSeek V3 analysis engine, lip-sync implementation and rollback, session/dashboard fixes.

### Commits (25 total)
| Hash | Type | Description |
|------|------|-------------|
| `c4400aa` | fix | Remove unused filler audio code to fix Vercel build |
| `9a60d2c` | feat | Contextual first-sentence reactions in tutor prompt |
| `5cff679` | feat | Real-time lip-sync for tutor avatars using Web Audio API |
| `673e16b` | refactor | Optimize lip-sync parameters with team-reviewed values |
| `6cd7036` | fix | Per-tutor lip-sync split positions based on actual mouth locations |
| `d264aff` | fix | Session count not persisting + dashboard showing fake data |
| `8a8be7b` | feat | AI tutor scheduled call notifications (Phase 1-4) |
| `37f5252` | feat | Web Push support for browser users |
| `7b505ae` | feat | Push notification test API for admin |
| `c9d7274` | fix | Request notification permission on user gesture (toggle tap) |
| `6aa9b04` | feat | Profile image now links to profile/settings page |
| `ff017e6` | fix | Profile image Link + KST day calc fix + web push from settings |
| `1ac17b3` | feat | Per-user timezone support for scheduled call notifications |
| `89e94db` | fix | Pass now parameter to getUserLocalTime in cron scheduler |
| `2de3ccf` | fix | Profile image not clickable on mobile Chrome |
| `7d893c0` | chore | Trigger Vercel deployment after Git reconnect |
| `deee4b1` | chore | Verify Vercel-GitHub integration after reinstall |
| `c4d9663` | fix | Change cron to daily for Vercel Hobby plan |
| `ba3ac26` | fix | Downgrade push-notifications to v6 for Capacitor 6 compat |
| `c24fd38` | feat | Use GitHub Actions for 30-min cron instead of Vercel |
| `92997a2` | feat | DeepSeek V3 analysis engine + profile integration + scoring differentiation |
| `69fe236` | fix | Web push notification registration with error feedback and test button |
| `f24453f` | fix | Notification permission prompt not showing + toggle guard |
| `bc06ac5` | fix | Tutor name text ordering + mobile safe area for start button |
| `222caeb` | fix | Disable lip sync animation causing face split glitch + reply stuck |
| `b273f01` | fix | Remove unused lip sync imports to fix build lint errors |

### Files Changed
- `src/app/talk/page.tsx` - Filler audio removal, lip-sync integration/rollback, tutor name ordering, safe area
- `src/app/api/chat/route.ts` - Contextual first-sentence reactions, DeepSeek V3 analysis engine (+107 lines)
- `src/components/TutorAvatar.tsx` - Lip-sync animation added then disabled (face split glitch)
- `src/hooks/useLipSync.ts` - **New** Web Audio API lip-sync hook (implemented then disabled)
- `src/app/api/cron/scheduled-calls/route.ts` - **New** Cron scheduled call logic with timezone support
- `src/app/api/push/register/route.ts` - **New** Push notification device registration
- `src/app/api/push/register-web/route.ts` - **New** Web Push subscription registration
- `src/app/api/push/test/route.ts` - **New** Admin push notification test endpoint
- `src/app/incoming-call/page.tsx` - **New** Incoming call UI page
- `src/components/settings/ScheduleSettings.tsx` - **New** Schedule settings UI with notification permission handling
- `src/hooks/usePushNotifications.ts` - **New** Push notification hook (native + web)
- `src/lib/firebaseAdmin.ts` - **New** Firebase Admin SDK initialization
- `src/lib/sheetTypes.ts` - Push token + timezone fields added
- `src/lib/sheetHelper.ts` - Session count persistence fix
- `src/app/api/lesson-history/route.ts` - Session count query fix
- `src/components/home/DashboardStats.tsx` - Fake data removed, real session data displayed
- `src/app/page.tsx` - Profile image link to settings, session count fix
- `src/app/profile/page.tsx` - Schedule settings integration
- `src/lib/i18n.tsx` - Tutor name text ordering fix
- `public/sw.js` - **New** Service worker for Web Push
- `public/manifest.json` - App icon paths updated
- `public/app-icon-192.png`, `public/app-icon-512.png` - **New** App icons for PWA
- `.github/workflows/scheduled-calls.yml` - **New** GitHub Actions 30-min cron
- `vercel.json` - Cron config added then replaced by GitHub Actions
- `capacitor.config.ts` - Push notification plugin config
- `package.json` - web-push, firebase-admin, @capacitor/push-notifications added

### Key Decisions
- Scheduled Notifications: Firebase Cloud Messaging (native) + Web Push API (browser) dual-stack
- Cron: Vercel Hobby plan doesn't support frequent cron -> GitHub Actions 30-min interval
- Lip-sync: Web Audio API frequency analysis approach, but rolled back due to face split glitch
- DeepSeek V3: Separate analysis engine for scoring differentiation from GPT-4o-mini conversation
- Push permissions: Request only on user gesture (toggle tap) to comply with browser policies
- Capacitor: push-notifications downgraded to v6 for Capacitor 6 compatibility
- Profile: Image now acts as navigation link to profile/settings page

### Known Issues Resolved
- Vercel build failure (unused filler audio imports)
- Session count not persisting across sessions
- Dashboard displaying fake/placeholder data instead of real stats
- Notification permission prompt not appearing (browser policy - needs user gesture)
- KST day calculation error in cron scheduler
- Profile image not clickable on mobile Chrome (button -> Link)
- Tutor name text ordering incorrect
- Mobile start button overlapping with system UI (safe area)
- Lip-sync face split glitch (resolved by disabling the feature)
- Build lint errors from unused lip-sync imports

---

## 2026-02-13 (Thu)

### Summary
Incoming call page overhaul (audio, slide-to-answer, visual effects), tutor card bug fixes (Android + iOS), schedule unsaved warning UX, cron migration to cron-job.org, timezone auto-sync.

### Commits (8 total)
| Hash | Type | Description |
|------|------|-------------|
| `96d9028` | fix | cron-job.org migration + isWithinWindow time matching |
| `562cf5c` | fix | manifest.json id field + timezone auto-sync on app load |
| `3c80025` | fix | Replace PWA icons with official TapTalk logo |
| `c30c254` | chore | Add setup-bundle to gitignore |
| `2e10cde` | feat | Overhaul incoming call with ringtone, slide-to-answer, and visual effects |
| `c8e0063` | fix | Tutor card image overflow on Android WebView when selected |
| `7c8224d` | fix | Tutor card image sizing on iOS PWA |
| `cafaf44` | feat | Warn when schedule changes are unsaved on profile save |

### Files Changed
- `src/app/incoming-call/page.tsx` - Full overhaul: audio ringtone, slide-to-answer gesture, shake animation, background pulse rings, auto-dismiss timer (30s), haptic feedback
- `src/app/globals.css` - Shake keyframe animation added
- `public/audio/ringtone.mp3` - **New** Marimba ringtone (Ryan's choice, 417KB, 26s loop)
- `src/components/onboarding/TutorIntroCarousel.tsx` - Android WebView overflow fix (transition-all -> transition-colors transition-shadow, added rounded-t-2xl overflow-hidden)
- `src/app/page.tsx` - Tutor card image fix for iOS PWA (video poster -> img base layer + video overlay), timezone auto-sync on load
- `src/components/settings/ScheduleSettings.tsx` - Dirty state tracking via onDirtyChange callback (markDirty/markClean)
- `src/app/profile/page.tsx` - Unsaved schedule warning banner with "Go Save Schedule" / "Save Profile Only" options
- `scripts/ask_gpt.mjs` - Multi-model support (gpt-4o-mini, gpt-4o, o3-mini, o1) + role system (strategist, reviewer, ux, architect)
- `src/app/api/cron/scheduled-calls/route.ts` - isWithinWindow +-15min matching, cron-job.org auth
- `public/manifest.json` - id field added for iOS PWA
- `.gitignore` - setup-bundle/ added

### Key Decisions
- Cron: GitHub Actions -> cron-job.org (free, 30-min interval, more reliable)
- Incoming call ringtone: Ryan's marimba file (Opening-Marimba-.mp3)
- iOS PWA: video poster doesn't respect object-cover -> img tag as base layer with video overlay
- Android WebView: transition-all breaks overflow-hidden -> use transition-colors transition-shadow
- Schedule UX: Warning banner when profile save clicked with unsaved schedule changes
- Tutor card images have inconsistent aspect ratios (emma 1645x1318, charlotte 1024x559) -> fixed with object-cover img

### Known Issues Resolved
- Incoming call page had no audio or visual feedback (now has ringtone, pulse, shake)
- Tutor card image corners become square on Android WebView when selected
- Tutor cards have uneven sizes on iOS PWA (inconsistent image aspect ratios)
- Schedule changes silently lost when only "Save Profile" clicked

---

## Template

```
## YYYY-MM-DD (Day)

### Summary
[One-line summary of the day's work]

### Commits
| Hash | Type | Description |
|------|------|-------------|
| `hash` | feat/fix/perf/refactor | Description |

### Files Changed
- file - what changed

### Key Decisions
- Decision and reasoning

### Known Issues Resolved
- Issue description
```

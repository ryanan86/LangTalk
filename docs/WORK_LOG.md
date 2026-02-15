# TapTalk Work Log

Daily development history for TapTalk (taptalk.xyz).

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

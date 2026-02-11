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

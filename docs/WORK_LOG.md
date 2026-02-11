# TapTalk Work Log

Daily development history for TapTalk (taptalk.xyz).

---

## 2026-02-11 (Tue)

### Summary
Landing page major overhaul - hero video consolidation, performance optimization, global expansion, UX fixes.

### Commits
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

### Files Changed
- `src/app/page.tsx` - Hero video, performance, tutor cards, footer, video unlock
- `src/lib/i18n.tsx` - `contactUs` translations (8 languages)
- `src/components/hero/reviewData.ts` - 14 global reviews added
- `public/tutors/` - Hero video, posters, audio-restored greeting videos, JPG images

### Key Decisions
- Hero: Single combined video with `timeupdate` timeline sync instead of 6 separate videos
- Performance: Mobile gets static backgrounds, desktop keeps animations (quality preservation principle)
- Contact: WhatsApp unified (KakaoTalk removed until channel is ready)
- Reviews: Korean + global mix for international credibility
- Tutor posters: Original profile JPG images instead of video frame extraction (eyes-closed issue)

### Known Issues Resolved
- Scroll jank on mobile (backdrop-blur, heavy animations)
- Hero video not deployed (missing from git)
- Greeting video audio stripped by ffmpeg `-an` flag
- Play button overlay persistent on mobile after tap
- Video poster showing eyes-closed frames
- Desktop hover requiring click before video plays

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

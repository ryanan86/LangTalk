'use client';

import { useState, useCallback } from 'react';

interface ScheduleData {
  enabled: boolean;
  times: string[];
  days: number[];
  preferredTutor: string;
  timezone?: string;
}

interface ScheduleSettingsProps {
  language: 'ko' | 'en';
  initialSchedule?: ScheduleData;
  onSave: (schedule: ScheduleData) => Promise<void>;
}

const TUTORS = [
  { id: 'random', nameEn: 'Random', nameKo: 'Random' },
  { id: 'emma', nameEn: 'Emma', nameKo: 'Emma' },
  { id: 'james', nameEn: 'James', nameKo: 'James' },
  { id: 'charlotte', nameEn: 'Charlotte', nameKo: 'Charlotte' },
  { id: 'oliver', nameEn: 'Oliver', nameKo: 'Oliver' },
  { id: 'alina', nameEn: 'Alina', nameKo: 'Alina' },
  { id: 'henry', nameEn: 'Henry', nameKo: 'Henry' },
];

const DAYS = [
  { value: 0, labelEn: 'Sun', labelKo: '일' },
  { value: 1, labelEn: 'Mon', labelKo: '월' },
  { value: 2, labelEn: 'Tue', labelKo: '화' },
  { value: 3, labelEn: 'Wed', labelKo: '수' },
  { value: 4, labelEn: 'Thu', labelKo: '목' },
  { value: 5, labelEn: 'Fri', labelKo: '금' },
  { value: 6, labelEn: 'Sat', labelKo: '토' },
];

// Generate time slots from 06:00 to 23:00 in 30-min intervals
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

export default function ScheduleSettings({ language, initialSchedule, onSave }: ScheduleSettingsProps) {
  const [enabled, setEnabled] = useState(initialSchedule?.enabled ?? false);
  const [times, setTimes] = useState<string[]>(initialSchedule?.times ?? ['09:00']);
  const [days, setDays] = useState<number[]>(initialSchedule?.days ?? [1, 2, 3, 4, 5]);
  const [preferredTutor, setPreferredTutor] = useState(initialSchedule?.preferredTutor ?? 'random');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [pushError, setPushError] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  // Request notification permission and register web push subscription
  const requestNotificationPermission = useCallback(async () => {
    console.log('[TapTalk Push] === Permission Request Start ===');

    // Check if Notification API is available
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[TapTalk Push] Notification API not available in this browser');
      setPushError(language === 'ko'
        ? '이 브라우저에서는 알림을 지원하지 않습니다.'
        : 'Notifications not supported in this browser.');
      setPushStatus('error');
      return false;
    }

    const currentPermission = Notification.permission;
    console.log('[TapTalk Push] Current permission:', currentPermission);

    // Already denied - browser won't re-prompt, user must change in settings
    if (currentPermission === 'denied') {
      console.warn('[TapTalk Push] Permission previously denied by user');
      setNotifPermission('denied');
      return false;
    }

    // Already granted - go straight to push registration
    if (currentPermission === 'granted') {
      console.log('[TapTalk Push] Permission already granted, registering push...');
      const ok = await registerWebPushSubscription();
      return ok;
    }

    // Permission is 'default' - show browser prompt
    console.log('[TapTalk Push] Requesting permission from browser...');
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      console.log('[TapTalk Push] Permission result:', permission);

      if (permission === 'granted') {
        const ok = await registerWebPushSubscription();
        return ok;
      }
      return false;
    } catch (err) {
      console.error('[TapTalk Push] Permission request error:', err);
      setPushError(language === 'ko'
        ? '알림 권한 요청 중 오류가 발생했습니다.'
        : 'Error requesting notification permission.');
      setPushStatus('error');
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Register web push subscription after permission is granted
  const registerWebPushSubscription = async (): Promise<boolean> => {
    setPushStatus('registering');
    setPushError('');
    try {
      if (!('serviceWorker' in navigator)) {
        setPushError('Service Worker not supported');
        setPushStatus('error');
        console.error('[TapTalk Push] Service Worker not supported');
        return false;
      }
      if (!('PushManager' in window)) {
        setPushError('Push API not supported');
        setPushStatus('error');
        console.error('[TapTalk Push] PushManager not supported');
        return false;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setPushError('VAPID key not configured');
        setPushStatus('error');
        console.error('[TapTalk Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is empty/undefined');
        return false;
      }
      console.log('[TapTalk Push] VAPID key found:', vapidKey.substring(0, 10) + '...');

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[TapTalk Push] SW registered, scope:', registration.scope);
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('[TapTalk Push] No existing subscription, creating new...');
        const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
        const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const keyArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) keyArray[i] = rawData.charCodeAt(i);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray.buffer as ArrayBuffer,
        });
        console.log('[TapTalk Push] New subscription created');
      } else {
        console.log('[TapTalk Push] Using existing subscription');
      }

      const res = await fetch('/api/push/register-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setPushError(`Server error: ${res.status}`);
        setPushStatus('error');
        console.error('[TapTalk Push] Server registration failed:', res.status, errData);
        return false;
      }

      setPushStatus('success');
      console.log('[TapTalk Push] Subscription registered successfully');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPushError(msg);
      setPushStatus('error');
      console.error('[TapTalk Push] Registration error:', err);
      return false;
    }
  };

  // Send test notification to self
  const sendTestNotification = async () => {
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(language === 'ko' ? 'Test 알림을 전송했습니다!' : 'Test notification sent!');
      } else {
        alert(language === 'ko' ? `알림 전송 실패: ${data.error}` : `Notification failed: ${data.error}`);
      }
    } catch {
      alert(language === 'ko' ? '테스트 실패' : 'Test failed');
    }
  };

  const toggleDay = (day: number) => {
    setDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
    setSaved(false);
  };

  const addTime = () => {
    if (times.length >= 3) return;
    // Find next available slot
    const next = TIME_SLOTS.find(t => !times.includes(t)) || '12:00';
    setTimes(prev => [...prev, next].sort());
    setSaved(false);
  };

  const removeTime = (index: number) => {
    if (times.length <= 1) return;
    setTimes(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const updateTime = (index: number, value: string) => {
    setTimes(prev => {
      const next = [...prev];
      next[index] = value;
      return next.sort();
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Auto-detect user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await onSave({ enabled, times, days, preferredTutor, timezone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {language === 'ko' ? 'AI 튜터 예약 알림' : 'Scheduled Call Reminders'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ko'
              ? '설정한 시간에 AI 튜터가 알림을 보내드려요.'
              : 'Get notified at your scheduled times to practice.'}
          </p>
        </div>
        {/* Toggle switch */}
        <button
          onClick={async () => {
            if (!enabled) {
              // Turning ON - request notification permission (user gesture required)
              console.log('[TapTalk Push] Toggle ON clicked, requesting permission...');
              const ok = await requestNotificationPermission();
              console.log('[TapTalk Push] Permission + registration result:', ok);
              if (!ok) return; // Don't enable if permission denied or registration failed
            }
            setEnabled(!enabled);
            setSaved(false);
          }}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            enabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Permission denied warning */}
      {notifPermission === 'denied' && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300">
            {language === 'ko'
              ? '알림이 차단되어 있습니다. 브라우저 설정에서 taptalk.xyz의 알림을 허용해주세요.'
              : 'Notifications are blocked. Please enable notifications for taptalk.xyz in your browser settings.'}
          </p>
        </div>
      )}

      {/* Push registration status */}
      {pushStatus === 'error' && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300">
            {language === 'ko' ? `Push 등록 실패: ${pushError}` : `Push registration failed: ${pushError}`}
          </p>
          <button
            onClick={() => registerWebPushSubscription()}
            className="mt-2 text-xs text-red-600 dark:text-red-400 underline"
          >
            {language === 'ko' ? '다시 시도' : 'Retry'}
          </button>
        </div>
      )}
      {pushStatus === 'success' && (
        <div className="space-y-2">
          <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl">
            <p className="text-sm text-green-700 dark:text-green-300">
              {language === 'ko' ? 'Push 알림이 활성화되었습니다.' : 'Push notifications enabled.'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {language === 'ko'
                ? 'iPhone/iPad: 무음 모드(사이드 스위치)에서는 알림 소리가 지원되지 않습니다. 소리 알림을 받으려면 설정 > 알림 > TapTalk에서 소리를 켜고, 무음 모드를 해제해주세요.'
                : 'iPhone/iPad: Notification sounds are not supported in silent mode. To receive sound alerts, go to Settings > Notifications > TapTalk and enable Sound, then turn off silent mode.'}
            </p>
          </div>
        </div>
      )}

      {enabled && (
        <div className="space-y-5 pl-1">
          {/* Days selection */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">
              {language === 'ko' ? '요일 선택' : 'Select Days'}
            </label>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                    days.includes(day.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {language === 'ko' ? day.labelKo : day.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">
              {language === 'ko' ? `알림 시간 (${times.length}/3)` : `Reminder Times (${times.length}/3)`}
            </label>
            <div className="space-y-2">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={time}
                    onChange={(e) => updateTime(index, e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {times.length > 1 && (
                    <button
                      onClick={() => removeTime(index)}
                      className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {times.length < 3 && (
                <button
                  onClick={addTime}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 text-sm hover:border-primary-400 hover:text-primary-500 transition-colors"
                >
                  + {language === 'ko' ? '시간 추가' : 'Add Time'}
                </button>
              )}
            </div>
          </div>

          {/* Preferred tutor */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">
              {language === 'ko' ? '선호 튜터' : 'Preferred Tutor'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TUTORS.map(tutor => (
                <button
                  key={tutor.id}
                  onClick={() => { setPreferredTutor(tutor.id); setSaved(false); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    preferredTutor === tutor.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {language === 'ko' ? tutor.nameKo : tutor.nameEn}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || days.length === 0}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'btn-primary disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isSaving
              ? (language === 'ko' ? '저장 중...' : 'Saving...')
              : saved
                ? (language === 'ko' ? '저장 완료' : 'Saved')
                : (language === 'ko' ? '알림 설정 저장' : 'Save Schedule')}
          </button>

          {/* Test notification button */}
          {pushStatus === 'success' && (
            <button
              onClick={sendTestNotification}
              className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {language === 'ko' ? '테스트 알림 보내기' : 'Send Test Notification'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

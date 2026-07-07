'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

const STORAGE_KEY = 'taptalk-ai-notice-v1';

export default function AiDisclosureNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // Safari private mode: skip
    }
  }, []);

  const handleConfirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Safari private mode: skip
    }
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleConfirm}
      disableBackdropClose
      title="생성형 AI 안내"
      actions={
        <button
          onClick={handleConfirm}
          className="pressable w-full py-3 rounded-2xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          확인
        </button>
      }
    >
      탭톡의 튜터 대화, 교정, 학습 분석, 시험 채점 결과는 생성형 AI가 만들어냅니다. AI 결과물은 부정확할 수 있으며, 학습 참고용으로 활용해 주세요.
    </Modal>
  );
}

'use client';

import { Suspense } from 'react';
import ExamSessionRunner from './ExamSessionRunner';

export default function ExamSessionPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <ExamSessionRunner />
    </Suspense>
  );
}

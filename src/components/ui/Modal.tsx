'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Modal title rendered in the header slot */
  title?: React.ReactNode;
  /** Main body content */
  children?: React.ReactNode;
  /** Footer action buttons */
  actions?: React.ReactNode;
  /** Prevent closing when clicking the backdrop */
  disableBackdropClose?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      title,
      children,
      actions,
      disableBackdropClose = false,
      className,
    },
    ref
  ) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<Element | null>(null);

    // Body scroll lock
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    // Save trigger element and auto-focus first focusable element when opening
    useEffect(() => {
      if (open) {
        triggerRef.current = document.activeElement;
        const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      } else if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }, [open]);

    // Focus trap + Escape key handler
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }
        if (e.key === 'Tab' && panelRef.current) {
          const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
          const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      },
      [onClose]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
      <div
        ref={panelRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onClick={disableBackdropClose ? undefined : onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" aria-hidden="true" />

        {/* Panel */}
        <div
          ref={ref}
          className={cn(
            // Base layout
            'relative z-10 w-full max-w-sm',
            'flex flex-col',
            // Glass morphism — same pattern as LevelUpModal / existing cards
            'bg-white/95 dark:bg-neutral-900/95',
            'backdrop-blur-xl',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'rounded-2xl',
            'shadow-premium-lg',
            // Entrance animation
            'animate-scale-in',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100 dark:border-white/[0.06]">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-xl -mr-1',
                  'text-neutral-400 dark:text-neutral-500',
                  'hover:text-neutral-700 dark:hover:text-white',
                  'hover:bg-neutral-100 dark:hover:bg-white/[0.06]',
                  'transition-colors duration-200'
                )}
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Body */}
          {children && (
            <div className="px-6 py-5 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {children}
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="px-6 pb-5 pt-1 flex flex-col gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;

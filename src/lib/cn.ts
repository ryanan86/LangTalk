/**
 * Lightweight className utility — no external dependencies.
 *
 * Usage:  cn('base', condition && 'extra', ['a', 'b'])
 *
 * When clsx + tailwind-merge are available you can replace the body:
 *
 *   import { clsx, type ClassValue } from 'clsx';
 *   import { twMerge } from 'tailwind-merge';
 *   export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
 */

// Use a JSON-safe recursive type that TypeScript handles without circularity issues
export type ClassValue = string | number | boolean | null | undefined | ClassValue[];

function flatten(val: ClassValue): string[] {
  if (val === null || val === undefined || val === false || val === '') return [];
  if (Array.isArray(val)) {
    const result: string[] = [];
    for (const item of val) {
      const sub = flatten(item as ClassValue);
      for (const s of sub) result.push(s);
    }
    return result;
  }
  if (typeof val === 'boolean') return [];
  return [String(val)];
}

export function cn(...inputs: ClassValue[]): string {
  const parts: string[] = [];
  for (const input of inputs) {
    const sub = flatten(input);
    for (const s of sub) parts.push(s);
  }
  return parts.join(' ');
}

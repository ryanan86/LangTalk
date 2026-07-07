'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';
import { SHOP_ITEMS, ShopItem } from '@/lib/shopItems';
import { ShopItemIcon, CoinIcon } from '@/components/shop/ShopIcons';
import BottomNav from '@/components/BottomNav';
import { Badge } from '@/components/ui';

interface InventoryItem {
  itemId: string;
  quantity: number;
  acquiredAt: string;
}

const CATEGORY_TONE: Record<ShopItem['category'], { ring: string; bg: string; text: string; badgeVariant: 'warning' | 'default' | 'info' }> = {
  hint: {
    ring: 'ring-amber-400/30 dark:ring-amber-300/20',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    badgeVariant: 'warning',
  },
  boost: {
    ring: 'ring-violet-400/30 dark:ring-violet-300/20',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-300',
    badgeVariant: 'default',
  },
  cosmetic: {
    ring: 'ring-sky-400/30 dark:ring-sky-300/20',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    badgeVariant: 'info',
  },
};

export default function ShopPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { language } = useLanguage();

  const [userXP, setUserXP] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categoryTab, setCategoryTab] = useState<'all' | 'hint' | 'boost' | 'cosmetic'>('all');
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchData = async () => {
    try {
      const [xpRes, invRes] = await Promise.all([
        fetch('/api/check-subscription'),
        fetch('/api/shop'),
      ]);
      if (xpRes.ok) {
        const d = await xpRes.json();
        setUserXP(d.xp ?? 0);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setInventory(d.inventory || []);
      }
    } catch (err) {
      console.error('Shop fetchData error:', err);
    }
  };

  const handlePurchase = async () => {
    if (!confirmItem) return;
    setPurchasing(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: confirmItem.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserXP(data.newXP);
        setInventory(data.inventory || []);
        setConfirmItem(null);
        showToast(language === 'ko' ? `${confirmItem.name.ko} 구매 완료` : `${confirmItem.name.en} purchased`);
      } else {
        showToast(language === 'ko' ? `오류: ${data.error}` : `Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      showToast(language === 'ko' ? '구매 중 오류가 발생했습니다.' : 'Purchase failed.');
    } finally {
      setPurchasing(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = categoryTab === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === categoryTab);
  const getInventoryQty = (itemId: string) => inventory.find(i => i.itemId === itemId)?.quantity ?? 0;

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  const tabs: { key: 'all' | 'hint' | 'boost' | 'cosmetic'; label: string }[] = [
    { key: 'all', label: language === 'ko' ? '전체' : 'All' },
    { key: 'hint', label: language === 'ko' ? '힌트' : 'Hint' },
    { key: 'boost', label: language === 'ko' ? '부스트' : 'Boost' },
    { key: 'cosmetic', label: language === 'ko' ? '코스메틱' : 'Cosmetic' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] px-4 sm:px-6 py-4 sticky top-0 z-50 safe-top">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="pressable p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h1 className="text-base font-semibold text-neutral-900 dark:text-white">
            {language === 'ko' ? '상점' : 'Shop'}
          </h1>

          {/* XP balance pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full">
            <CoinIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {userXP !== null ? userXP.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 motion-safe:animate-fade-up">

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategoryTab(tab.key)}
              className={`pressable px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                categoryTab === tab.key
                  ? 'bg-brand-gradient text-white shadow-glow-sm'
                  : 'bg-white dark:bg-white/[0.05] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.14]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Item grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item, i) => {
            const canAfford = userXP !== null && userXP >= item.xpCost;
            const owned = getInventoryQty(item.id);
            const tone = CATEGORY_TONE[item.category];

            return (
              <div
                key={item.id}
                className={`
                  group relative rounded-card-lg border bg-white dark:bg-white/[0.03]
                  border-neutral-200 dark:border-white/[0.06]
                  shadow-card dark:shadow-card-dark
                  hover:shadow-card-hover dark:hover:shadow-card-hover-dark
                  hover:-translate-y-0.5
                  transition-all duration-200
                  motion-safe:animate-fade-up
                  p-5
                  ${!canAfford ? 'opacity-60' : ''}
                `}
                style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'both' }}
              >
                {/* Owned badge */}
                {owned > 0 && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="success" size="sm" dot>
                      {owned}
                    </Badge>
                  </div>
                )}

                <div className="flex items-start gap-3.5">
                  {/* Icon tile */}
                  <div className={`w-12 h-12 rounded-xl ${tone.bg} ring-1 ${tone.ring} flex items-center justify-center ${tone.text} shrink-0`}>
                    <ShopItemIcon icon={item.icon} className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-[15px] leading-tight">
                      {language === 'ko' ? item.name.ko : item.name.en}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                      {language === 'ko' ? item.description.ko : item.description.en}
                    </p>
                  </div>
                </div>

                {/* Footer: price + buy */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CoinIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
                      {item.xpCost.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">XP</span>
                  </div>

                  <button
                    onClick={() => canAfford && setConfirmItem(item)}
                    disabled={!canAfford}
                    className={`pressable px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      canAfford
                        ? 'bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900'
                        : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford
                      ? (language === 'ko' ? '구매하기' : 'Buy')
                      : (language === 'ko' ? 'XP 부족' : 'Not enough')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-neutral-400 dark:text-neutral-500">
            {language === 'ko' ? '해당 카테고리에 아이템이 없습니다.' : 'No items in this category.'}
          </div>
        )}
      </main>

      {/* Purchase confirm modal */}
      {confirmItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => !purchasing && setConfirmItem(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-card-lg p-6 w-full max-w-sm border border-neutral-200 dark:border-white/[0.08] shadow-float dark:shadow-float-dark motion-safe:animate-ds-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Item preview */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className={`w-16 h-16 rounded-2xl ${CATEGORY_TONE[confirmItem.category].bg} ring-1 ${CATEGORY_TONE[confirmItem.category].ring} flex items-center justify-center ${CATEGORY_TONE[confirmItem.category].text} mb-3`}>
                <ShopItemIcon icon={confirmItem.icon} className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ko' ? confirmItem.name.ko : confirmItem.name.en}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                {language === 'ko' ? confirmItem.description.ko : confirmItem.description.en}
              </p>
            </div>

            {/* Cost breakdown */}
            <div className="bg-neutral-50 dark:bg-white/[0.04] rounded-2xl p-4 mb-5 space-y-2.5 border border-neutral-100 dark:border-white/[0.05]">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '현재 보유' : 'Current'}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white tabular-nums flex items-center gap-1">
                  <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                  {userXP?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '가격' : 'Price'}
                </span>
                <span className="font-semibold text-red-500 tabular-nums">
                  − {confirmItem.xpCost.toLocaleString()} XP
                </span>
              </div>
              <div className="border-t border-neutral-200 dark:border-white/[0.06] pt-2.5 flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '구매 후' : 'After'}
                </span>
                <span className="font-bold text-neutral-900 dark:text-white tabular-nums flex items-center gap-1">
                  <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                  {((userXP ?? 0) - confirmItem.xpCost).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmItem(null)}
                disabled={purchasing}
                className="pressable flex-1 py-3 rounded-xl border border-neutral-200 dark:border-white/[0.08] text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="pressable flex-1 py-3 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {purchasing
                  ? (language === 'ko' ? '구매 중...' : 'Processing...')
                  : (language === 'ko' ? '구매 확인' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 motion-safe:animate-fade-up pointer-events-none">
          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 rounded-full text-sm font-semibold shadow-float">
            {toast}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

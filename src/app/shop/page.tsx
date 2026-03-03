'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';
import { SHOP_ITEMS, ShopItem } from '@/lib/shopItems';
import BottomNav from '@/components/BottomNav';

interface InventoryItem {
  itemId: string;
  quantity: number;
  acquiredAt: string;
}

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
        showToast(language === 'ko' ? `${confirmItem.name.ko} 구매 완료!` : `${confirmItem.name.en} purchased!`);
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

  const getInventoryQty = (itemId: string) => {
    return inventory.find(i => i.itemId === itemId)?.quantity ?? 0;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {language === 'ko' ? '상점' : 'Shop'}
          </h1>
          {/* XP balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-full">
            <span className="text-yellow-500">🪙</span>
            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
              {userXP !== null ? userXP.toLocaleString() : '—'} XP
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategoryTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                categoryTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => {
            const canAfford = userXP !== null && userXP >= item.xpCost;
            const owned = getInventoryQty(item.id);
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition-all ${
                  canAfford
                    ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                    : 'bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/50 opacity-70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">
                        {language === 'ko' ? item.name.ko : item.name.en}
                      </h3>
                      {owned > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                          x{owned}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {language === 'ko' ? item.description.ko : item.description.en}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">🪙</span>
                    <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{item.xpCost} XP</span>
                  </div>
                  <button
                    onClick={() => canAfford && setConfirmItem(item)}
                    disabled={!canAfford}
                    className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      canAfford
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford
                      ? (language === 'ko' ? '구매' : 'Buy')
                      : (language === 'ko' ? 'XP 부족' : 'Not enough XP')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 text-neutral-400">
            {language === 'ko' ? '해당 카테고리에 아이템이 없습니다.' : 'No items in this category.'}
          </div>
        )}
      </main>

      {/* Confirm Purchase Modal */}
      {confirmItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-sm border border-neutral-200 dark:border-neutral-700 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{confirmItem.icon}</div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ko' ? confirmItem.name.ko : confirmItem.name.en}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {language === 'ko' ? confirmItem.description.ko : confirmItem.description.en}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-3 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '현재 XP' : 'Current XP'}
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">🪙 {userXP?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '가격' : 'Price'}
                </span>
                <span className="font-medium text-red-500">- {confirmItem.xpCost} XP</span>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-600 pt-2 flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {language === 'ko' ? '구매 후 XP' : 'After purchase'}
                </span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  🪙 {((userXP ?? 0) - confirmItem.xpCost).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {purchasing
                  ? (language === 'ko' ? '구매 중...' : 'Purchasing...')
                  : (language === 'ko' ? '구매 확인' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

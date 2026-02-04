'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserData {
  email: string;
  subscription: {
    status: string;
    expiryDate: string;
    signupDate: string;
    name: string;
    plan: string;
  };
  profile: {
    type: string;
    grade?: string;
    interests: string[];
  };
  stats: {
    sessionCount: number;
    totalMinutes: number;
    debateCount: number;
  };
  updatedAt: string;
  rowIndex: number;
}

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null);
  const [expiryValue, setExpiryValue] = useState('');

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (email: string, newStatus: string, expiryDate?: string) => {
    setUpdating(email);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: newStatus, expiryDate }),
      });
      const data = await response.json();
      if (data.success) {
        // Update local state
        setUsers(prev => prev.map(u =>
          u.email === email
            ? {
                ...u,
                subscription: {
                  ...u.subscription,
                  status: newStatus,
                  expiryDate: expiryDate || u.subscription.expiryDate,
                }
              }
            : u
        ));
        setEditingExpiry(null);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setUpdating(null);
    }
  };

  const startEditingExpiry = (email: string, currentExpiry: string) => {
    setEditingExpiry(email);
    setExpiryValue(currentExpiry || getDefaultExpiry());
  };

  const getDefaultExpiry = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    if (filter === 'all') return true;
    return u.subscription.status === filter;
  });

  const pendingCount = users.filter(u => u.subscription.status === 'pending').length;
  const activeCount = users.filter(u => u.subscription.status === 'active').length;

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/setup')}
            className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Admin Setup
          </button>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-neutral-400 mt-2">사용자 구독 상태 관리</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
            <p className="text-neutral-400 text-sm">전체</p>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-amber-900/30 rounded-xl p-4 border border-amber-700/50">
            <p className="text-amber-400 text-sm">대기중 (Pending)</p>
            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          </div>
          <div className="bg-green-900/30 rounded-xl p-4 border border-green-700/50">
            <p className="text-green-400 text-sm">활성 (Active)</p>
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'active'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {f === 'all' ? '전체' : f === 'pending' ? '대기중' : '활성'}
            </button>
          ))}
          <button
            onClick={fetchUsers}
            className="ml-auto px-4 py-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-neutral-700"
          >
            새로고침
          </button>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              {filter === 'pending' ? '대기중인 사용자가 없습니다.' : '사용자가 없습니다.'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.email}
                className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-white font-medium">{user.email}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.subscription.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : user.subscription.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-neutral-500/20 text-neutral-400'
                    }`}>
                      {user.subscription.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-neutral-500">
                    <span>가입: {user.subscription.signupDate || '-'}</span>
                    <span>세션: {user.stats.sessionCount}회</span>
                    <span>프로필: {user.profile.type || '-'}</span>
                    {user.profile.grade && <span>학년: {user.profile.grade}</span>}
                  </div>
                  {/* Expiry date section */}
                  {user.subscription.status === 'active' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-neutral-400">만료일:</span>
                      {editingExpiry === user.email ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={expiryValue}
                            onChange={(e) => setExpiryValue(e.target.value)}
                            className="px-2 py-1 bg-neutral-700 text-white rounded border border-neutral-600 text-sm"
                          />
                          <button
                            onClick={() => updateUserStatus(user.email, 'active', expiryValue)}
                            disabled={updating === user.email}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingExpiry(null)}
                            className="px-2 py-1 bg-neutral-600 hover:bg-neutral-500 text-white rounded text-sm"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingExpiry(user.email, user.subscription.expiryDate)}
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          {user.subscription.expiryDate || '설정안됨'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {user.subscription.status !== 'active' && (
                    <button
                      onClick={() => updateUserStatus(user.email, 'active', getDefaultExpiry())}
                      disabled={updating === user.email}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {updating === user.email ? '처리중...' : '승인'}
                    </button>
                  )}
                  {user.subscription.status === 'active' && (
                    <button
                      onClick={() => updateUserStatus(user.email, 'inactive')}
                      disabled={updating === user.email}
                      className="px-4 py-2 bg-neutral-600 hover:bg-neutral-500 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {updating === user.email ? '처리중...' : '비활성화'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

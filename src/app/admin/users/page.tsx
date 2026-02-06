'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SessionSummary {
  id: string;
  date: string;
  type: string;
  tutor?: string;
  duration: number;
  topics: string[];
  level?: string;
}

interface TopicHistory {
  topic: string;
  count: number;
  lastDiscussed: string;
}

interface CorrectionStats {
  total: number;
  due: number;
  completed: number;
  categoryBreakdown: Record<string, number>;
}

interface LevelHistoryItem {
  date: string;
  level: string;
}

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
    currentStreak?: number;
    longestStreak?: number;
    currentLevel?: string;
  };
  updatedAt: string;
  rowIndex: number;
  recentSessions: SessionSummary[];
  corrections: unknown[];
  topicsHistory: TopicHistory[];
  debateHistory: unknown[];
  correctionStats: CorrectionStats;
  levelHistory: LevelHistoryItem[];
  lastActivity: string | null;
  isActiveToday: boolean;
  isActiveThisWeek: boolean;
}

interface OverallStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalMinutes: number;
  avgMinutesPerUser: number;
  totalCorrections: number;
  activeToday: number;
  activeThisWeek: number;
  popularTutors: { tutor: string; count: number }[];
  categoryCounts: Record<string, number>;
}

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

const LEVEL_ORDER = ['K', '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', 'College'];
const LEVEL_COLORS: Record<string, string> = {
  'K': 'bg-red-500',
  '1-2': 'bg-orange-500',
  '3-4': 'bg-yellow-500',
  '5-6': 'bg-lime-500',
  '7-8': 'bg-green-500',
  '9-10': 'bg-teal-500',
  '11-12': 'bg-blue-500',
  'College': 'bg-purple-500',
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'expiring' | 'inactive'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'today' | 'week' | 'dormant'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null);
  const [expiryValue, setExpiryValue] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

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
      if (data.overallStats) {
        setOverallStats(data.overallStats);
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
    date.setMonth(date.getMonth() + 2);
    date.setDate(0);
    return date.toISOString().split('T')[0];
  };

  const isExpiringSOon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const exportToCSV = () => {
    const headers = ['이메일', '이름', '상태', '가입일', '만료일', '총세션', '총학습시간(분)', '현재레벨', '교정총개수', '복습대기'];
    const rows = users.map(u => [
      u.email,
      u.subscription.name || '',
      u.subscription.status,
      u.subscription.signupDate || '',
      u.subscription.expiryDate || '',
      u.stats.sessionCount,
      u.stats.totalMinutes,
      u.stats.currentLevel || '',
      u.correctionStats?.total || 0,
      u.correctionStats?.due || 0,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taptalk_users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  // Apply filters
  let filteredUsers = users.filter(u => {
    // Status filter
    if (filter === 'pending') return u.subscription.status === 'pending';
    if (filter === 'active') return u.subscription.status === 'active';
    if (filter === 'expiring') return u.subscription.status === 'active' && isExpiringSOon(u.subscription.expiryDate);
    if (filter === 'inactive') return u.subscription.status === 'inactive' || isExpired(u.subscription.expiryDate);
    return true;
  });

  // Activity filter
  filteredUsers = filteredUsers.filter(u => {
    if (activityFilter === 'today') return u.isActiveToday;
    if (activityFilter === 'week') return u.isActiveThisWeek;
    if (activityFilter === 'dormant') return !u.isActiveThisWeek && u.stats.sessionCount > 0;
    return true;
  });

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredUsers = filteredUsers.filter(u =>
      u.email.toLowerCase().includes(query) ||
      (u.subscription.name || '').toLowerCase().includes(query)
    );
  }

  const pendingCount = users.filter(u => u.subscription.status === 'pending').length;
  const activeCount = users.filter(u => u.subscription.status === 'active').length;
  const expiringCount = users.filter(u => u.subscription.status === 'active' && isExpiringSOon(u.subscription.expiryDate)).length;

  // Level distribution
  const levelDistribution: Record<string, number> = {};
  users.forEach(u => {
    const level = u.stats.currentLevel || 'Unknown';
    levelDistribution[level] = (levelDistribution[level] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-neutral-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">관리자 대시보드</h1>
              <p className="text-neutral-400 mt-1">사용자 및 학습 데이터 관리</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 text-sm"
              >
                {showStats ? '통계 숨기기' : '통계 보기'}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm font-medium"
              >
                CSV 내보내기
              </button>
            </div>
          </div>
        </div>

        {/* Overall Statistics Dashboard */}
        {showStats && overallStats && (
          <div className="mb-6 space-y-4">
            {/* Main Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <p className="text-neutral-400 text-xs">전체 유저</p>
                <p className="text-2xl font-bold text-white">{overallStats.totalUsers}</p>
              </div>
              <div className="bg-green-900/30 rounded-xl p-4 border border-green-700/50">
                <p className="text-green-400 text-xs">활성 구독</p>
                <p className="text-2xl font-bold text-green-400">{overallStats.activeUsers}</p>
              </div>
              <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700/50">
                <p className="text-blue-400 text-xs">오늘 접속</p>
                <p className="text-2xl font-bold text-blue-400">{overallStats.activeToday}</p>
              </div>
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/50">
                <p className="text-purple-400 text-xs">이번주 접속</p>
                <p className="text-2xl font-bold text-purple-400">{overallStats.activeThisWeek}</p>
              </div>
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <p className="text-neutral-400 text-xs">총 세션</p>
                <p className="text-2xl font-bold text-white">{overallStats.totalSessions}</p>
              </div>
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <p className="text-neutral-400 text-xs">총 학습시간</p>
                <p className="text-2xl font-bold text-white">{Math.round(overallStats.totalMinutes / 60)}h</p>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Popular Tutors */}
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <p className="text-neutral-400 text-xs mb-2">인기 튜터</p>
                <div className="flex flex-wrap gap-2">
                  {overallStats.popularTutors.map(({ tutor, count }) => (
                    <span key={tutor} className="px-2 py-1 bg-neutral-700 rounded text-sm text-white">
                      {tutor} <span className="text-neutral-400">({count})</span>
                    </span>
                  ))}
                  {overallStats.popularTutors.length === 0 && (
                    <span className="text-neutral-500 text-sm">데이터 없음</span>
                  )}
                </div>
              </div>

              {/* Correction Categories */}
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <p className="text-neutral-400 text-xs mb-2">교정 카테고리 분포</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(overallStats.categoryCounts)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <span key={cat} className="px-2 py-1 bg-neutral-700 rounded text-sm text-white">
                        {cat} <span className="text-neutral-400">({count})</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* Level Distribution */}
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <p className="text-neutral-400 text-xs mb-2">레벨 분포</p>
                <div className="flex flex-wrap gap-1">
                  {LEVEL_ORDER.map(level => {
                    const count = levelDistribution[level] || 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={level}
                        className={`px-2 py-1 ${LEVEL_COLORS[level]} rounded text-xs text-white font-medium`}
                      >
                        {level}: {count}
                      </span>
                    );
                  })}
                  {levelDistribution['Unknown'] > 0 && (
                    <span className="px-2 py-1 bg-neutral-600 rounded text-xs text-white">
                      미평가: {levelDistribution['Unknown']}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-xl p-3 border text-left transition-all ${
              filter === 'all' ? 'bg-white/10 border-white/30' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            <p className="text-neutral-400 text-xs">전체</p>
            <p className="text-xl font-bold text-white">{users.length}</p>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-xl p-3 border text-left transition-all ${
              filter === 'pending' ? 'bg-amber-900/50 border-amber-500' : 'bg-amber-900/30 border-amber-700/50 hover:bg-amber-900/40'
            }`}
          >
            <p className="text-amber-400 text-xs">대기중</p>
            <p className="text-xl font-bold text-amber-400">{pendingCount}</p>
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`rounded-xl p-3 border text-left transition-all ${
              filter === 'active' ? 'bg-green-900/50 border-green-500' : 'bg-green-900/30 border-green-700/50 hover:bg-green-900/40'
            }`}
          >
            <p className="text-green-400 text-xs">활성</p>
            <p className="text-xl font-bold text-green-400">{activeCount}</p>
          </button>
          <button
            onClick={() => setFilter('expiring')}
            className={`rounded-xl p-3 border text-left transition-all ${
              filter === 'expiring' ? 'bg-red-900/50 border-red-500' : 'bg-red-900/30 border-red-700/50 hover:bg-red-900/40'
            }`}
          >
            <p className="text-red-400 text-xs">만료임박 (7일)</p>
            <p className="text-xl font-bold text-red-400">{expiringCount}</p>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="이메일 또는 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Activity Filter */}
          <div className="flex gap-2">
            {(['all', 'today', 'week', 'dormant'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activityFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {f === 'all' ? '전체' : f === 'today' ? '오늘' : f === 'week' ? '이번주' : '미접속'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-neutral-700"
          >
            새로고침
          </button>
        </div>

        {/* Results count */}
        <p className="text-neutral-500 text-sm mb-3">
          {filteredUsers.length}명 표시 중 (전체 {users.length}명)
        </p>

        {/* User List */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              조건에 맞는 사용자가 없습니다.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.email}
                className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden"
              >
                {/* Main user row */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setExpandedUser(expandedUser === user.email ? null : user.email)}
                        className="text-white font-medium hover:text-blue-400 flex items-center gap-2 truncate"
                      >
                        <svg
                          className={`w-4 h-4 flex-shrink-0 transition-transform ${expandedUser === user.email ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="truncate">{user.email}</span>
                      </button>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        user.subscription.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : user.subscription.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-neutral-500/20 text-neutral-400'
                      }`}>
                        {user.subscription.status}
                      </span>
                      {user.stats.currentLevel && (
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[user.stats.currentLevel] || 'bg-neutral-600'} text-white`}>
                          {user.stats.currentLevel}
                        </span>
                      )}
                      {isExpiringSOon(user.subscription.expiryDate) && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          만료임박
                        </span>
                      )}
                      {user.isActiveToday && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" title="오늘 접속" />
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-neutral-500 ml-6 flex-wrap">
                      <span>세션: {user.stats.sessionCount}회</span>
                      <span>{user.stats.totalMinutes}분</span>
                      {user.correctionStats && (
                        <span>교정: {user.correctionStats.total}개 (대기: {user.correctionStats.due})</span>
                      )}
                      {user.stats.currentStreak ? <span>🔥 {user.stats.currentStreak}일</span> : null}
                    </div>
                    {/* Expiry date section */}
                    {user.subscription.status === 'active' && (
                      <div className="flex items-center gap-2 mt-2 ml-6">
                        <span className="text-xs text-neutral-400">만료:</span>
                        {editingExpiry === user.email ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={expiryValue}
                              onChange={(e) => setExpiryValue(e.target.value)}
                              className="px-2 py-1 bg-neutral-700 text-white rounded border border-neutral-600 text-xs"
                            />
                            <button
                              onClick={() => updateUserStatus(user.email, 'active', expiryValue)}
                              disabled={updating === user.email}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingExpiry(null)}
                              className="px-2 py-1 bg-neutral-600 hover:bg-neutral-500 text-white rounded text-xs"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingExpiry(user.email, user.subscription.expiryDate)}
                            className={`text-xs underline ${
                              isExpiringSOon(user.subscription.expiryDate) ? 'text-red-400 hover:text-red-300' : 'text-blue-400 hover:text-blue-300'
                            }`}
                          >
                            {user.subscription.expiryDate || '설정안됨'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-2">
                    {user.subscription.status !== 'active' && (
                      <button
                        onClick={() => updateUserStatus(user.email, 'active', getDefaultExpiry())}
                        disabled={updating === user.email}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {updating === user.email ? '...' : '승인'}
                      </button>
                    )}
                    {user.subscription.status === 'active' && (
                      <button
                        onClick={() => updateUserStatus(user.email, 'inactive')}
                        disabled={updating === user.email}
                        className="px-3 py-1.5 bg-neutral-600 hover:bg-neutral-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {updating === user.email ? '...' : '비활성화'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail section */}
                {expandedUser === user.email && (
                  <div className="border-t border-neutral-700 bg-neutral-900/50 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <p className="text-neutral-400 text-xs">총 세션</p>
                        <p className="text-xl font-bold text-white">{user.stats.sessionCount}회</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <p className="text-neutral-400 text-xs">총 학습 시간</p>
                        <p className="text-xl font-bold text-white">{user.stats.totalMinutes}분</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <p className="text-neutral-400 text-xs">교정 완료</p>
                        <p className="text-xl font-bold text-green-400">{user.correctionStats?.completed || 0}개</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <p className="text-neutral-400 text-xs">복습 대기</p>
                        <p className="text-xl font-bold text-amber-400">{user.correctionStats?.due || 0}개</p>
                      </div>
                    </div>

                    {/* Correction Category Breakdown */}
                    {user.correctionStats?.categoryBreakdown && Object.keys(user.correctionStats.categoryBreakdown).length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-neutral-300 mb-2">교정 카테고리</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(user.correctionStats.categoryBreakdown).map(([cat, count]) => (
                            <span key={cat} className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-300">
                              {cat}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Level History */}
                    {user.levelHistory && user.levelHistory.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-neutral-300 mb-2">레벨 변화 추이</h4>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          {user.levelHistory.map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-shrink-0">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${LEVEL_COLORS[item.level] || 'bg-neutral-600'} text-white`}>
                                {item.level}
                              </span>
                              <span className="text-[10px] text-neutral-500 mt-1">
                                {item.date?.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                          {user.levelHistory.length > 1 && (
                            <span className="text-xs text-neutral-500 ml-2">
                              ({user.levelHistory[0].level} → {user.levelHistory[user.levelHistory.length - 1].level})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Profile info */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-neutral-300 mb-2">프로필 정보</h4>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-neutral-400">이름:</span>{' '}
                            <span className="text-white">{user.subscription.name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400">가입일:</span>{' '}
                            <span className="text-white">{user.subscription.signupDate || '-'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400">최근접속:</span>{' '}
                            <span className="text-white">{user.lastActivity || '-'}</span>
                          </div>
                          {user.profile.grade && (
                            <div>
                              <span className="text-neutral-400">학년:</span>{' '}
                              <span className="text-white">{user.profile.grade}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recent sessions */}
                    {user.recentSessions?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-neutral-300 mb-2">최근 세션 (최대 5개)</h4>
                        <div className="space-y-2">
                          {user.recentSessions.slice(0, 5).map((sess, idx) => (
                            <div key={sess.id || idx} className="bg-neutral-800 rounded-lg p-3 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-white">{sess.date}</span>
                                <div className="flex items-center gap-2">
                                  {sess.tutor && <span className="text-neutral-400">{sess.tutor}</span>}
                                  {sess.level && (
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${LEVEL_COLORS[sess.level] || 'bg-neutral-600'} text-white`}>
                                      {sess.level}
                                    </span>
                                  )}
                                  <span className="text-neutral-400">{sess.duration}분</span>
                                </div>
                              </div>
                              {sess.topics?.length > 0 && (
                                <p className="text-neutral-500 text-xs mt-1">
                                  주제: {sess.topics.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Topics history */}
                    {user.topicsHistory?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-neutral-300 mb-2">자주 다룬 주제</h4>
                        <div className="flex flex-wrap gap-2">
                          {user.topicsHistory.slice(0, 10).map((topic, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-300"
                            >
                              {topic.topic} ({topic.count}회)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!user.recentSessions?.length && !user.topicsHistory?.length && !user.levelHistory?.length && (
                      <p className="text-neutral-500 text-sm text-center py-4">
                        아직 학습 기록이 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

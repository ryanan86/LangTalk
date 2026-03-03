'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DebateTopic {
  id: number;
  topic_id: string;
  category: string;
  age_groups: string[];
  topic_data: {
    title: { ko: string; en: string };
    description: { ko: string; en: string };
    difficulty: number;
  };
  trend_score: number;
  is_active: boolean;
  created_at: string;
}

interface AddTopicForm {
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
  category: string;
  age_group: string;
  trend_score: number;
}

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

const CATEGORIES = ['daily', 'school', 'technology', 'society', 'environment', 'culture', 'sports', 'ethics'];
const AGE_GROUPS = ['elementary_low', 'elementary_high', 'middle', 'high', 'university', 'adult'];

export default function AdminTopicsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [topics, setTopics] = useState<DebateTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DebateTopic | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AddTopicForm>({
    title_ko: '',
    title_en: '',
    description_ko: '',
    description_en: '',
    category: 'daily',
    age_group: 'adult',
    trend_score: 50,
  });

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchTopics();
    }
  }, [session]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (activeFilter !== 'all') params.set('isActive', activeFilter === 'active' ? 'true' : 'false');
      const res = await fetch(`/api/admin/topics?${params}`);
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchTopics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, activeFilter]);

  const toggleActive = async (topic: DebateTopic) => {
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topic.topic_id, is_active: !topic.is_active }),
      });
      if (res.ok) {
        setTopics(prev => prev.map(t => t.topic_id === topic.topic_id ? { ...t, is_active: !t.is_active } : t));
      }
    } catch (err) {
      console.error('Failed to toggle topic:', err);
    }
  };

  const updateTrendScore = async (topic: DebateTopic, score: number) => {
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topic.topic_id, trend_score: score }),
      });
      if (res.ok) {
        setTopics(prev => prev.map(t => t.topic_id === topic.topic_id ? { ...t, trend_score: score } : t));
      }
    } catch (err) {
      console.error('Failed to update trend score:', err);
    }
  };

  const handleAddTopic = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ title_ko: '', title_en: '', description_ko: '', description_en: '', category: 'daily', age_group: 'adult', trend_score: 50 });
        fetchTopics();
      }
    } catch (err) {
      console.error('Failed to add topic:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingTopic) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTopic.topic_id,
          topic_data: editingTopic.topic_data,
          trend_score: editingTopic.trend_score,
          category: editingTopic.category,
          age_groups: editingTopic.age_groups,
        }),
      });
      if (res.ok) {
        setEditingTopic(null);
        fetchTopics();
      }
    } catch (err) {
      console.error('Failed to edit topic:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('이 주제를 비활성화하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/admin/topics?id=${topicId}`, { method: 'DELETE' });
      if (res.ok) {
        setTopics(prev => prev.map(t => t.topic_id === topicId ? { ...t, is_active: false } : t));
      }
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">토론 주제 관리</h1>
            <p className="text-neutral-400 mt-1 text-sm">Debate topics management</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            + 새 주제 추가
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
          >
            <option value="">전체 카테고리</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === f ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {f === 'all' ? '전체' : f === 'active' ? '활성' : '비활성'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTopics}
            className="px-3 py-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-neutral-700 text-sm"
          >
            새로고침
          </button>
        </div>

        <p className="text-neutral-500 text-sm mb-3">{topics.length}개 주제</p>

        {/* Topics Table */}
        <div className="space-y-2">
          {topics.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">주제가 없습니다.</div>
          ) : (
            topics.map(topic => (
              <div key={topic.topic_id} className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-white text-sm truncate">
                        {topic.topic_data?.title?.ko || topic.topic_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-neutral-700 text-neutral-300">
                        {topic.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        topic.is_active ? 'bg-green-500/20 text-green-400' : 'bg-neutral-500/20 text-neutral-400'
                      }`}>
                        {topic.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mb-1 line-clamp-1">
                      {topic.topic_data?.title?.en}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>트렌드: {topic.trend_score}</span>
                      <span>나이: {topic.age_groups?.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Trend score quick adjust */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateTrendScore(topic, Math.max(0, topic.trend_score - 10))}
                        className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs text-neutral-300 w-6 text-center">{topic.trend_score}</span>
                      <button
                        onClick={() => updateTrendScore(topic, Math.min(100, topic.trend_score + 10))}
                        className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-xs"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => toggleActive(topic)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        topic.is_active
                          ? 'bg-neutral-600 hover:bg-neutral-500 text-white'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {topic.is_active ? '비활성화' : '활성화'}
                    </button>

                    <button
                      onClick={() => setEditingTopic({ ...topic })}
                      className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-xs"
                    >
                      편집
                    </button>

                    <button
                      onClick={() => handleDelete(topic.topic_id)}
                      className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-lg border border-neutral-700">
            <h2 className="text-lg font-bold text-white mb-4">새 토론 주제 추가</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">제목 (한국어)</label>
                  <input
                    value={form.title_ko}
                    onChange={e => setForm(p => ({ ...p, title_ko: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="제목 (한국어)"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Title (English)</label>
                  <input
                    value={form.title_en}
                    onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Title (English)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">설명 (한국어)</label>
                  <textarea
                    value={form.description_ko}
                    onChange={e => setForm(p => ({ ...p, description_ko: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="설명"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Description (English)</label>
                  <textarea
                    value={form.description_en}
                    onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Description"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">카테고리</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">나이 그룹</label>
                  <select
                    value={form.age_group}
                    onChange={e => setForm(p => ({ ...p, age_group: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
                  >
                    {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">트렌드 점수</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.trend_score}
                    onChange={e => setForm(p => ({ ...p, trend_score: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-lg bg-neutral-700 text-white text-sm hover:bg-neutral-600"
              >
                취소
              </button>
              <button
                onClick={handleAddTopic}
                disabled={submitting || !form.title_ko || !form.title_en}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editingTopic && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-lg border border-neutral-700">
            <h2 className="text-lg font-bold text-white mb-4">주제 편집</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">제목 (한국어)</label>
                  <input
                    value={editingTopic.topic_data?.title?.ko || ''}
                    onChange={e => setEditingTopic(p => p ? { ...p, topic_data: { ...p.topic_data, title: { ...p.topic_data.title, ko: e.target.value } } } : p)}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Title (English)</label>
                  <input
                    value={editingTopic.topic_data?.title?.en || ''}
                    onChange={e => setEditingTopic(p => p ? { ...p, topic_data: { ...p.topic_data, title: { ...p.topic_data.title, en: e.target.value } } } : p)}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">트렌드 점수</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingTopic.trend_score}
                    onChange={e => setEditingTopic(p => p ? { ...p, trend_score: parseInt(e.target.value) || 0 } : p)}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">카테고리</label>
                  <select
                    value={editingTopic.category}
                    onChange={e => setEditingTopic(p => p ? { ...p, category: e.target.value } : p)}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingTopic(null)}
                className="flex-1 py-2 rounded-lg bg-neutral-700 text-white text-sm hover:bg-neutral-600"
              >
                취소
              </button>
              <button
                onClick={handleEditSave}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

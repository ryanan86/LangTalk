import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function checkAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!(session?.user?.email && ADMIN_EMAILS.includes(session.user.email));
}

export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const isActive = searchParams.get('isActive');

  const supabase = getSupabaseAdmin();
  let query = supabase.from('debate_topics').select('*').order('trend_score', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }
  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ topics: data || [] });
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { title_ko, title_en, description_ko, description_en, category, age_group, trend_score } = body;

  if (!title_ko || !title_en || !description_ko || !description_en || !category || !age_group) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const topicId = `topic_${Date.now()}`;

  const { data, error } = await supabase.from('debate_topics').insert({
    topic_id: topicId,
    category,
    age_groups: Array.isArray(age_group) ? age_group : [age_group],
    topic_data: {
      title: { ko: title_ko, en: title_en },
      description: { ko: description_ko, en: description_en },
      difficulty: 3,
    },
    trend_score: trend_score ?? 50,
    is_active: true,
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ topic: data });
}

export async function PUT(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing topic id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Build update payload from allowed fields
  const payload: Record<string, unknown> = {};
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;
  if (updates.trend_score !== undefined) payload.trend_score = updates.trend_score;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.age_groups !== undefined) payload.age_groups = updates.age_groups;
  if (updates.topic_data !== undefined) payload.topic_data = updates.topic_data;

  const { data, error } = await supabase
    .from('debate_topics')
    .update(payload)
    .eq('topic_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ topic: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing topic id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('debate_topics')
    .update({ is_active: false })
    .eq('topic_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

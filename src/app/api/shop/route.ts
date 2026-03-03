import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserData, updateUserFields } from '@/lib/supabaseHelper';
import { SHOP_ITEMS } from '@/lib/shopItems';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserData(session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ inventory: user.stats.inventory || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { itemId } = body;

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const user = await getUserData(session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentXP = user.stats.xp ?? 0;
  if (currentXP < item.xpCost) {
    return NextResponse.json({ error: 'Insufficient XP', required: item.xpCost, current: currentXP }, { status: 400 });
  }

  const inventory = [...(user.stats.inventory || [])];
  const existing = inventory.find(inv => inv.itemId === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    inventory.push({ itemId, quantity: 1, acquiredAt: new Date().toISOString() });
  }

  const success = await updateUserFields(session.user.email, {
    stats: {
      xp: currentXP - item.xpCost,
      inventory,
    },
  });

  if (!success) {
    return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    newXP: currentXP - item.xpCost,
    inventory,
  });
}

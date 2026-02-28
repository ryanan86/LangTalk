import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitId, RATE_LIMITS } from '@/lib/rateLimit';
import { getUserData, updateUserFields } from '@/lib/sheetHelper';
import { ProfileData } from '@/lib/sheetTypes';
import { makeRid, nowMs, since } from '@/lib/perf';
import { userProfileBodySchema, parseBody } from '@/lib/apiSchemas';

// GET: Retrieve user profile
export async function GET(request: Request) {
  const rid = makeRid('prof');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ profile: null, error: 'Not logged in' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
    if (rateLimitResult) return rateLimitResult;

    const email = session.user.email;

    // If no Google Sheets credentials, return empty for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, returning empty profile');
      return NextResponse.json({ profile: null, email });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ profile: null, email });
    }

    // Get user data using optimized helper
    const userData = await getUserData(email);

    if (!userData) {
      return NextResponse.json({ profile: null, email });
    }

    // Transform to legacy format for backward compatibility
    const profile = {
      email,
      profileType: userData.profile.type,
      interests: userData.profile.interests,
      customContext: userData.profile.customContext || '',
      preferredTopics: userData.profile.preferredTopics || [],
      grade: userData.profile.grade || '',
      age: userData.profile.age,
      nativeLanguage: userData.profile.nativeLanguage,
      preferredTutors: userData.profile.preferredTutors || [],
      difficultyPreference: userData.profile.difficultyPreference || 'adaptive',
      correctionLevel: userData.profile.correctionLevel || 2,
      schedule: userData.profile.schedule || null,
    };

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({ profile, email });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('User profile retrieval error:', error);
    return NextResponse.json({ profile: null, error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

// POST: Create or update user profile
export async function POST(request: NextRequest) {
  const rid = makeRid('prof');
  const t0 = nowMs();

  try {
    const session = await getServerSession(authOptions);

    // Rate limit
    if (session?.user?.email) {
      const rateLimitResult = checkRateLimit(getRateLimitId(session.user.email, request), RATE_LIMITS.light);
      if (rateLimitResult) return rateLimitResult;
    }

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });
    }

    const email = session.user.email;

    // Parse and validate request body
    const rawBody = await request.json();
    const parsed = parseBody(userProfileBodySchema, rawBody);
    if (!parsed.success) return parsed.response;
    const {
      profileType,
      interests,
      customContext,
      preferredTopics,
      grade,
      age,
      nativeLanguage,
      preferredTutors,
      difficultyPreference,
      correctionLevel,
      schedule,
    } = parsed.data;

    // If no Google Sheets credentials, return success for development
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('No Google Sheets credentials, skipping profile save');
      return NextResponse.json({ success: true, message: 'Development mode - not saved' });
    }

    if (!process.env.GOOGLE_SUBSCRIPTION_SHEET_ID) {
      console.log('No spreadsheet ID configured');
      return NextResponse.json({ success: true, message: 'No spreadsheet configured' });
    }

    // Build profile update
    const profileUpdate: Partial<ProfileData> = {};

    if (profileType !== undefined) profileUpdate.type = profileType;
    if (interests !== undefined) profileUpdate.interests = interests;
    if (customContext !== undefined) profileUpdate.customContext = customContext;
    if (preferredTopics !== undefined) profileUpdate.preferredTopics = preferredTopics;
    if (grade !== undefined) profileUpdate.grade = grade;
    if (age !== undefined) profileUpdate.age = age;
    if (nativeLanguage !== undefined) profileUpdate.nativeLanguage = nativeLanguage;
    if (preferredTutors !== undefined) profileUpdate.preferredTutors = preferredTutors;
    if (difficultyPreference !== undefined) profileUpdate.difficultyPreference = difficultyPreference;
    if (correctionLevel !== undefined) profileUpdate.correctionLevel = correctionLevel;
    if (schedule !== undefined) profileUpdate.schedule = schedule ?? undefined;

    // Update user profile using helper
    const success = await updateUserFields(email, { profile: profileUpdate });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    console.log(`[${rid}] OK ${since(t0)}ms`);
    return NextResponse.json({
      success: true,
      message: 'Profile saved',
      profile: {
        email,
        profileType,
        interests,
        customContext,
        preferredTopics,
        grade,
        age,
        nativeLanguage,
        preferredTutors,
        difficultyPreference,
        correctionLevel,
      },
    });
  } catch (error) {
    console.error(`[${rid}] ERR ${since(t0)}ms`, error);
    console.error('User profile save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

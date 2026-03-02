/**
 * Unified Data Helper (Router)
 * Routes to sheetHelper or supabaseHelper based on DATA_BACKEND env var
 */

import * as sheets from './sheetHelper';
import * as supabase from './supabaseHelper';
import { useSupabase } from './dataBackend';

// User operations
export const getUserData = useSupabase ? supabase.getUserData : sheets.getUserData;
export const saveUserData = useSupabase ? supabase.saveUserData : sheets.saveUserData;
export const updateUserFields = useSupabase ? supabase.updateUserFields : sheets.updateUserFields;

// Learning data operations
export const getLearningData = useSupabase ? supabase.getLearningData : sheets.getLearningData;
export const saveLearningData = useSupabase ? supabase.saveLearningData : sheets.saveLearningData;
export const addSession = useSupabase ? supabase.addSession : sheets.addSession;
export const addCorrections = useSupabase ? supabase.addCorrections : sheets.addCorrections;
export const getDueCorrections = useSupabase ? supabase.getDueCorrections : sheets.getDueCorrections;
export const updateCorrectionAfterReview = useSupabase ? supabase.updateCorrectionAfterReview : sheets.updateCorrectionAfterReview;

// Debate topics operations
export const getDebateTopicsForUser = useSupabase ? supabase.getDebateTopicsForUser : sheets.getDebateTopicsForUser;
export const generatePersonalizedTopics = useSupabase ? supabase.generatePersonalizedTopics : sheets.generatePersonalizedTopics;

// Utility
export const getAllUserData = useSupabase ? supabase.getAllUserData : sheets.getAllUserData;

// Session count (Supabase-only new functions, sheets fallback is handled in route)
export const getSessionCount = useSupabase ? supabase.getSessionCount : null;
export const incrementSessionCount = useSupabase ? supabase.incrementSessionCount : null;

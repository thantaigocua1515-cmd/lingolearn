import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// ============================================
// Supabase Configuration
// ============================================
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Create Supabase client instance
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ============================================
// Auth Helper Functions
// ============================================

/**
 * Register a new user with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================
// Database Helper Functions
// ============================================

/**
 * Fetch all active languages
 */
export async function fetchLanguages() {
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .order('name');
  return { data, error };
}

/**
 * Fetch topics for a specific language
 */
export async function fetchTopics(languageCode: string) {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('language_code', languageCode)
    .order('name');
  return { data, error };
}

/**
 * Fetch vocabularies with optional filters
 */
export async function fetchVocabularies(languageCode: string, topicId?: number, limit: number = 50) {
  let query = supabase
    .from('vocabularies')
    .select('*')
    .eq('language_code', languageCode)
    .limit(limit);

  if (topicId) {
    query = query.eq('topic_id', topicId);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Update user vocabulary progress
 */
export async function updateVocabProgress(userId: string, vocabId: number, status: string) {
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .upsert({
      user_id: userId,
      vocab_id: vocabId,
      status: status,
      last_practiced: new Date().toISOString(),
    }, {
      onConflict: 'user_id,vocab_id',
    });
  return { data, error };
}

/**
 * Save game score
 */
export async function saveGameScore(userId: string, languageCode: string, gameType: string, score: number, combo: number) {
  const { data, error } = await supabase
    .from('game_scores')
    .insert({
      user_id: userId,
      language_code: languageCode,
      game_type: gameType,
      score: score,
      max_combo: combo,
      played_at: new Date().toISOString(),
    });
  return { data, error };
}

/**
 * Fetch leaderboard for a game
 */
export async function fetchLeaderboard(languageCode: string, gameType: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('game_scores')
    .select('*, user_id')
    .eq('language_code', languageCode)
    .eq('game_type', gameType)
    .order('score', { ascending: false })
    .limit(limit);
  return { data, error };
}

/**
 * Fetch user's game scores
 */
export async function fetchUserScores(userId: string, languageCode: string) {
  const { data, error } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('language_code', languageCode)
    .order('played_at', { ascending: false });
  return { data, error };
}

export default supabase;

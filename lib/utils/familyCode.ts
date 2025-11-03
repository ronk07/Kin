import { supabase } from '@/lib/supabase/client';

/**
 * Generate a unique family invite code
 */
export async function generateFamilyInviteCode(familyId: string, createdBy: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_family_invite_code');
  
  if (error) {
    throw new Error('Failed to generate invite code');
  }

  const code = data as string;

  // Insert the code into family_invite_codes table
  const { error: insertError } = await supabase
    .from('family_invite_codes')
    .insert({
      family_id: familyId,
      code: code,
      created_by: createdBy,
      active: true,
    });

  if (insertError) {
    throw new Error('Failed to create invite code');
  }

  return code;
}

/**
 * Validate and use a family invite code
 */
export async function validateAndUseInviteCode(code: string, userId: string): Promise<{ valid: boolean; familyId?: string; error?: string }> {
  try {
    // Get the invite code
    const { data: inviteData, error: inviteError } = await supabase
      .from('family_invite_codes')
      .select('*, families(name)')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();

    if (inviteError || !inviteData) {
      return { valid: false, error: 'Invalid or expired invite code' };
    }

    // Check if max uses reached
    if (inviteData.max_uses && inviteData.times_used >= inviteData.max_uses) {
      return { valid: false, error: 'Invite code has reached maximum uses' };
    }

    // Check if expired
    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      return { valid: false, error: 'Invite code has expired' };
    }

    // Check if user is already in a family
    const { data: userData } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', userId)
      .single();

    if (userData?.family_id === inviteData.family_id) {
      return { valid: false, error: 'You are already a member of this family' };
    }

    if (userData?.family_id) {
      return { valid: false, error: 'You are already in another family. Please leave that family first.' };
    }

    // Add user to family by updating their family_id
    const { error: updateError } = await supabase
      .from('users')
      .update({
        family_id: inviteData.family_id,
        family_role: 'member',
      })
      .eq('id', userId);

    if (updateError) {
      return { valid: false, error: 'Failed to join family' };
    }

    // Increment times_used
    await supabase
      .from('family_invite_codes')
      .update({ times_used: inviteData.times_used + 1 })
      .eq('id', inviteData.id);

    return { valid: true, familyId: inviteData.family_id };
  } catch (error) {
    console.error('Error validating invite code:', error);
    return { valid: false, error: 'An error occurred while validating the code' };
  }
}

/**
 * Format family code for display (e.g., ABCD-EFGH)
 */
export function formatFamilyCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
}


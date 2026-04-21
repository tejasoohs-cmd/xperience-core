import { base44 } from '@/api/base44Client';

export async function logActivity({ action_type, entity_type, entity_id, entity_label, message, user_email }) {
  try {
    await base44.entities.ActivityLog.create({
      action_type,
      entity_type,
      entity_id,
      entity_label: entity_label || '',
      message,
      user_email: user_email || '',
    });
  } catch (e) {
    // Non-critical — don't throw
    console.warn('Activity log failed:', e);
  }
}
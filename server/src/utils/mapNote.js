export function mapNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    note_id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    category: row.category,
    type: row.type,
    meeting_at: row.meeting_at,
    archived: row.archived,
    is_public: row.is_public,
    share_id: row.share_id,
    ai: row.ai_summary
      ? {
          summary: row.ai_summary,
          action_items: row.ai_action_items || [],
          suggested_title: row.ai_suggested_title || row.title
        }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email
  };
}

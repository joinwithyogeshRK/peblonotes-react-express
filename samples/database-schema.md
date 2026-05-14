# Database Schema Summary

## users

- `id`: UUID primary key
- `name`: user display name
- `email`: unique login email
- `password_hash`: bcrypt hash
- `created_at`: account creation timestamp

## notes

- `id`: UUID primary key
- `user_id`: owner, references `users.id`
- `title`, `content`, `tags`, `category`
- `type`: `note` or `meeting`
- `meeting_at`: optional meeting datetime
- `archived`: archive state
- `is_public`, `share_id`: public sharing
- `ai_summary`, `ai_action_items`, `ai_suggested_title`
- `created_at`, `updated_at`

## ai_usage

- `id`: UUID primary key
- `user_id`: owner, references `users.id`
- `note_id`: source note, nullable on note deletion
- `provider`: configured LLM or local fallback
- `created_at`: generation timestamp

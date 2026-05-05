# Database Schema

The demo uses H2 through Spring Data JPA. The same entities map cleanly to PostgreSQL or MySQL.

## board_sessions

| Column | Type | Notes |
| --- | --- | --- |
| id | varchar | Primary key UUID |
| title | varchar | Board title |
| owner_name | varchar | Creator display name |
| share_token | varchar | Unique short join token |
| editing_locked | boolean | Moderator lock |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## canvas_elements

| Column | Type | Notes |
| --- | --- | --- |
| id | varchar | Primary key, also used by frontend |
| session_id | varchar | Owning board session |
| element_type | varchar | stroke, erase, line, rect, ellipse, arrow, text, note |
| author_name | varchar | Display name |
| payload_json | clob/json | Full frontend-renderable element payload |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## chat_messages

| Column | Type | Notes |
| --- | --- | --- |
| id | varchar | Primary key UUID |
| session_id | varchar | Owning board session |
| author_name | varchar | Display name |
| message | clob/text | Chat message body |
| created_at | timestamp | Creation time |

## Production Notes

- Add indexes on `canvas_elements.session_id`, `chat_messages.session_id`, and `board_sessions.share_token`.
- Use JSONB for `payload_json` in PostgreSQL if querying individual canvas attributes is needed.
- Add `users`, `session_members`, and `roles` tables when replacing the demo display-name flow with real authentication.

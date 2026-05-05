# API Documentation

Base URL: `http://localhost:8080`

## Sessions

### Create Session

`POST /api/sessions`

```json
{
  "title": "Design Sprint Board",
  "ownerName": "Ada"
}
```

Returns a `BoardSession` with `id` and `shareToken`.

### Get Session

`GET /api/sessions/{idOrToken}`

`idOrToken` may be either the UUID session id or the short share token.

### Get Canvas Elements

`GET /api/sessions/{idOrToken}/elements`

Returns stored canvas elements in creation order.

### Save Canvas Elements

`PUT /api/sessions/{idOrToken}/elements`

```json
[
  {
    "id": "element-id",
    "type": "stroke",
    "authorName": "Ada",
    "payload": {
      "id": "element-id",
      "type": "stroke",
      "color": "#1f6feb",
      "width": 5,
      "points": [{"x": 10, "y": 20}]
    }
  }
]
```

Replaces the saved board state.

### Clear Canvas Elements

`DELETE /api/sessions/{idOrToken}/elements`

Clears all persisted canvas elements.

### Get Chat Messages

`GET /api/sessions/{idOrToken}/messages`

Returns the latest 100 persisted chat messages.

### Moderator Editing Lock

`PUT /api/sessions/{idOrToken}/permissions`

```json
{"editingLocked": true}
```

## Admin Analytics

`GET /api/admin/analytics`

```json
{
  "totalSessions": 4,
  "activeRealtimeConnections": 2,
  "totalElements": 118,
  "totalMessages": 19,
  "generatedAt": "2026-05-05T08:00:00Z"
}
```

## WebSocket

Connect to:

`ws://localhost:8080/ws/sessions/{sessionId}`

Client-to-server events:

- `canvas:add`
- `canvas:clear`
- `chat:message`
- `cursor:move`
- `permission:update`

Server-to-client events:

- `canvas:add`
- `canvas:clear`
- `chat:message`
- `cursor:move`
- `permission:update`
- `presence:update`

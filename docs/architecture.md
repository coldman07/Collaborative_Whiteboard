# Architecture

## Logical Diagram

```text
Browser clients
  |  REST: create/load/save/export metadata
  |  WebSocket: canvas, cursor, chat events
  v
Spring Boot application
  |-- SessionController: session, elements, permissions, analytics APIs
  |-- SessionSocketHandler: low-latency board broadcast
  |-- WhiteboardService: validation, persistence, analytics aggregation
  v
JPA repositories
  v
H2 demo database
```

## Runtime Flow

1. A user creates a session with `POST /api/sessions`.
2. The frontend updates the URL with the share token.
3. Joining users load session metadata, persisted canvas elements, and recent chat messages.
4. Each client opens `/ws/sessions/{sessionId}`.
5. Canvas events are persisted and broadcast to all connected clients for that session.
6. Chat messages are persisted and broadcast through the same realtime channel.
7. Moderator lock changes are stored through the permissions endpoint.

## Scaling Path

- Replace H2 with PostgreSQL or MySQL for durable metadata and canvas history.
- Add Redis pub/sub or a message broker so multiple Spring Boot instances can share board events.
- Store large board snapshots and exported files in S3/GCS instead of the database.
- Add Spring Security with JWT/OAuth roles: owner, moderator, editor, viewer.
- Split canvas events into immutable append-only event logs plus periodic snapshots for very large boards.

## Realtime Event Types

```json
{"type":"canvas:add","authorName":"Ada","element":{"id":"...","type":"stroke","points":[]}}
{"type":"canvas:clear","authorName":"Moderator"}
{"type":"chat:message","authorName":"Ada","message":"Looks good"}
{"type":"cursor:move","authorName":"Ada","cursor":{"x":140,"y":80}}
{"type":"permission:update","authorName":"Moderator","editingLocked":true}
```

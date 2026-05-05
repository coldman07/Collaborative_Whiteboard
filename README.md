<<<<<<< HEAD
# Collaborative Whiteboard

Collaborative Whiteboard is a Spring Boot based real-time whiteboard for remote teams, classrooms, study groups, and brainstorming sessions. Users can create a board, share a join link, draw together on the same canvas, add text and sticky notes, chat during the session, save board state, and export the canvas.

The project is built as a hackathon-ready full-stack application: a Java backend provides REST APIs, WebSocket collaboration, persistence, and analytics; a browser frontend provides the drawing surface and collaboration UI.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [How to Run](#how-to-run)
- [Demo Flow](#demo-flow)
- [Application Workflow](#application-workflow)
- [Architecture](#architecture)
- [REST API](#rest-api)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Frontend Tools](#frontend-tools)
- [Persistence and Export](#persistence-and-export)
- [Moderator Controls](#moderator-controls)
- [Admin Analytics](#admin-analytics)
- [Testing and Verification](#testing-and-verification)
- [Production Improvements](#production-improvements)
- [Troubleshooting](#troubleshooting)

## Problem Statement

Remote work, online education, and virtual collaboration need tools where multiple users can think visually at the same time. Traditional document editors and chat tools do not provide enough live visual interaction for sketching, explaining, annotating, or brainstorming.

This project solves that gap by providing a shared whiteboard where participants can draw, write, annotate, chat, and preserve their work.

## Core Features

- Create a new whiteboard session.
- Join an existing whiteboard with a session token or share link.
- Draw in real time with multiple participants.
- Use pen, highlighter, eraser, line, rectangle, ellipse, arrow, text, and sticky-note tools.
- Choose colors and stroke width.
- See live participant count.
- Send chat messages during a session.
- Save and reload persisted board state.
- Export the board as PNG.
- Export to PDF through browser print/save flow.
- Clear the board.
- Undo the last local drawing action.
- Lock or unlock editing as a moderator-style control.
- View admin analytics for sessions, realtime connections, elements, and messages.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Java 21, Spring Boot 3.3.5 |
| HTTP API | Spring Web |
| Realtime | Spring WebSocket |
| Persistence | Spring Data JPA |
| Demo Database | H2 file database |
| Frontend | HTML, CSS, JavaScript, Canvas API |
| Build Tool | Maven |

## Project Structure

```text
.
|-- pom.xml
|-- README.md
|-- docs/
|   |-- api.md
|   |-- architecture.md
|   `-- schema.md
|-- src/main/java/com/collabwhiteboard/
|   |-- CollaborativeWhiteboardApplication.java
|   |-- model/
|   |   |-- BoardSession.java
|   |   |-- CanvasElement.java
|   |   `-- ChatMessage.java
|   |-- repo/
|   |   |-- BoardSessionRepository.java
|   |   |-- CanvasElementRepository.java
|   |   `-- ChatMessageRepository.java
|   |-- service/
|   |   `-- WhiteboardService.java
|   `-- web/
|       |-- SessionController.java
|       |-- SessionSocketHandler.java
|       `-- WebSocketConfig.java
`-- src/main/resources/
    |-- application.properties
    `-- static/
        |-- index.html
        |-- styles.css
        `-- app.js
```

Generated runtime/build folders:

```text
data/     H2 database files created at runtime
target/   Maven build output
```

## Prerequisites

Install:

- Java 21 or newer
- Maven 3.9 or newer
- A modern browser such as Chrome, Edge, or Firefox

Check versions:

```bash
java --version
mvn --version
```

## How to Run

From the project root:

```bash
mvn spring-boot:run
```

Open:

```text
http://localhost:8080
```

The app uses port `8080` by default. The local H2 database is stored at:

```text
./data/whiteboard-db
```

H2 console:

```text
http://localhost:8080/h2-console
```

Use these connection values:

```text
JDBC URL: jdbc:h2:file:./data/whiteboard-db
User: sa
Password: empty
```

## Demo Flow

1. Start the server with `mvn spring-boot:run`.
2. Open `http://localhost:8080` in one browser tab.
3. Enter your display name.
4. Click `New` to create a board.
5. Click `Share` to copy the session link.
6. Open the copied link in another browser tab or another device on the same network.
7. Draw on either tab and watch the canvas update live.
8. Add text and sticky notes using the toolbar.
9. Send messages through the chat panel.
10. Click `Save`, refresh the page, and confirm the board reloads.
11. Export the board using `PNG` or `PDF`.

## Application Workflow

### Create Session

The frontend sends a `POST /api/sessions` request with a title and owner name. The backend creates a `BoardSession` with:

- UUID session ID
- short share token
- owner name
- title
- editing lock status
- created and updated timestamps

### Join Session

Users can join with:

- raw share token
- full session UUID
- copied share URL
- query string such as `?session=abc12345`

The frontend loads:

- session metadata
- saved canvas elements
- recent chat messages

Then it connects to the WebSocket endpoint for realtime updates.

### Realtime Collaboration

Drawing, clear-board, chat, cursor, and permission events are sent through WebSocket. The server persists important events and broadcasts them to all connected clients in the same session.

### Save and Load

Canvas elements are stored as JSON payloads in the database. When a user reloads or joins later, the frontend rebuilds the canvas from the saved elements.

## Architecture

```text
Browser clients
  |  REST: create, load, save, permissions, analytics
  |  WebSocket: canvas events, chat, cursors, presence
  v
Spring Boot application
  |-- SessionController
  |-- SessionSocketHandler
  |-- WhiteboardService
  v
Spring Data JPA repositories
  v
H2 database
```

Responsibilities:

- `SessionController` exposes REST endpoints.
- `SessionSocketHandler` manages realtime WebSocket messages.
- `WhiteboardService` contains session, element, chat, permission, and analytics logic.
- `model` contains JPA entities.
- `repo` contains Spring Data repositories.
- `static` contains the browser UI.

More details are available in [docs/architecture.md](docs/architecture.md).

## REST API

Base URL:

```text
http://localhost:8080
```

### Create Session

```http
POST /api/sessions
Content-Type: application/json
```

```json
{
  "title": "Design Sprint Board",
  "ownerName": "Ada"
}
```

### Get Session

```http
GET /api/sessions/{idOrToken}
```

`idOrToken` can be the full session ID or the short share token.

### Get Canvas Elements

```http
GET /api/sessions/{idOrToken}/elements
```

### Save Canvas Elements

```http
PUT /api/sessions/{idOrToken}/elements
Content-Type: application/json
```

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
      "points": [
        {"x": 10, "y": 20},
        {"x": 30, "y": 40}
      ]
    }
  }
]
```

### Clear Canvas Elements

```http
DELETE /api/sessions/{idOrToken}/elements
```

### Get Chat Messages

```http
GET /api/sessions/{idOrToken}/messages
```

### Update Editing Permission

```http
PUT /api/sessions/{idOrToken}/permissions
Content-Type: application/json
```

```json
{
  "editingLocked": true
}
```

### Admin Analytics

```http
GET /api/admin/analytics
```

Example response:

```json
{
  "totalSessions": 4,
  "activeRealtimeConnections": 2,
  "totalElements": 118,
  "totalMessages": 19,
  "generatedAt": "2026-05-05T08:00:00Z"
}
```

More details are available in [docs/api.md](docs/api.md).

## WebSocket Events

Connect to:

```text
ws://localhost:8080/ws/sessions/{sessionId}
```

### Canvas Add

```json
{
  "type": "canvas:add",
  "authorName": "Ada",
  "element": {
    "id": "uuid",
    "type": "stroke",
    "color": "#1f6feb",
    "width": 5,
    "points": [{"x": 10, "y": 20}]
  }
}
```

### Canvas Clear

```json
{
  "type": "canvas:clear",
  "authorName": "Moderator"
}
```

### Chat Message

```json
{
  "type": "chat:message",
  "authorName": "Ada",
  "message": "Let's move this box to the left."
}
```

### Cursor Move

```json
{
  "type": "cursor:move",
  "authorName": "Ada",
  "cursor": {"x": 140, "y": 80}
}
```

### Permission Update

```json
{
  "type": "permission:update",
  "authorName": "Moderator",
  "editingLocked": true
}
```

### Presence Update

```json
{
  "type": "presence:update",
  "activeUsers": 3
}
```

## Database Schema

### `board_sessions`

Stores session metadata.

| Column | Purpose |
| --- | --- |
| `id` | UUID primary key |
| `title` | Board title |
| `owner_name` | Creator display name |
| `share_token` | Short join token |
| `editing_locked` | Moderator lock state |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

### `canvas_elements`

Stores drawable board elements.

| Column | Purpose |
| --- | --- |
| `id` | Element ID |
| `session_id` | Owning board session |
| `element_type` | stroke, erase, line, rect, ellipse, arrow, text, note |
| `author_name` | User who created the element |
| `payload_json` | Full JSON payload used by the frontend renderer |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

### `chat_messages`

Stores session chat history.

| Column | Purpose |
| --- | --- |
| `id` | Message ID |
| `session_id` | Owning board session |
| `author_name` | Sender display name |
| `message` | Message body |
| `created_at` | Creation timestamp |

More details are available in [docs/schema.md](docs/schema.md).

## Frontend Tools

The frontend uses the Canvas API and plain JavaScript.

Available tools:

- `Pen`: freehand drawing.
- `Highlighter`: translucent freehand drawing.
- `Eraser`: removes canvas pixels visually using canvas compositing.
- `Line`: straight line.
- `Rect`: rectangle.
- `Oval`: ellipse.
- `Arrow`: line with arrowhead.
- `Text`: places text through an in-app dialog.
- `Note`: places a sticky note through an in-app dialog.

Controls:

- color picker
- quick color swatches
- stroke width slider
- undo
- clear
- save
- PNG export
- PDF export
- editing lock

## Persistence and Export

Persistence:

- Realtime canvas events are stored as `CanvasElement` rows.
- Manual save replaces the saved board state with the current element list.
- Chat messages are persisted separately.

Export:

- PNG export uses `canvas.toDataURL("image/png")`.
- PDF export opens a print view so users can save as PDF from the browser.

## Moderator Controls

The editing lock prevents users from adding new drawings while enabled. The lock state is stored in the session and broadcast to connected clients through WebSocket.

Current role handling is intentionally lightweight for a hackathon demo. A production version should connect this to authenticated roles such as:

- owner
- moderator
- editor
- viewer

## Admin Analytics

The admin analytics endpoint reports:

- total sessions
- active realtime WebSocket connections
- total canvas elements
- total chat messages
- generation timestamp

Endpoint:

```text
GET /api/admin/analytics
```

## Testing and Verification

Compile the project:

```bash
mvn -q -DskipTests compile
```

Run tests:

```bash
mvn test
```

Check frontend JavaScript syntax with Node:

```bash
node --check src/main/resources/static/app.js
```

Basic manual checks:

1. Start the app.
2. Create a session.
3. Open the share link in a second tab.
4. Draw in both tabs.
5. Send chat messages.
6. Save and refresh.
7. Export PNG and PDF.
8. Toggle editing lock.
9. Visit `/api/admin/analytics`.

## Production Improvements

Recommended next steps:

- Add Spring Security with JWT or OAuth.
- Add user accounts and role-based permissions.
- Replace H2 with PostgreSQL or MySQL.
- Add Redis pub/sub for multi-instance WebSocket scaling.
- Store large exports in S3, GCP Storage, or Azure Blob Storage.
- Add board snapshots to reduce replay time for very large sessions.
- Add element editing, selection, moving, resizing, and layers.
- Add comments pinned to canvas positions.
- Add rate limiting for realtime events.
- Add automated frontend tests with Playwright.
- Add API documentation with OpenAPI/Swagger.
- Add Dockerfile and Docker Compose for local deployment.

## Troubleshooting

### Port 8080 is already in use

Change the port in `src/main/resources/application.properties`:

```properties
server.port=8081
```

Then open:

```text
http://localhost:8081
```

### Browser still shows old JavaScript

Hard refresh:

```text
Ctrl + F5
```

### Join button does not load a board

Use one of these formats:

```text
share-token
full-session-id
http://localhost:8080/?session=share-token
?session=share-token
```

### Database file is locked

Stop the running Spring Boot application before copying or deleting files in `data/`.

### H2 data should be reset

Stop the app, delete the `data/` folder, and start the app again. A fresh database will be created automatically.

## License

This project is intended for hackathon and educational use. Add or update the license according to your repository requirements.
=======
# Collaborative_Whiteboard
>>>>>>> 8012cc1249939b1db9a8add05c68fb77f2221058

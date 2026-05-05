package com.collabwhiteboard.web;

import com.collabwhiteboard.model.ChatMessage;
import com.collabwhiteboard.service.WhiteboardService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SessionSocketHandler extends TextWebSocketHandler {
    private final WhiteboardService whiteboardService;
    private final ObjectMapper objectMapper;
    private final Map<String, Set<WebSocketSession>> sessionsByBoard = new ConcurrentHashMap<>();

    public SessionSocketHandler(WhiteboardService whiteboardService, ObjectMapper objectMapper) {
        this.whiteboardService = whiteboardService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String boardId = boardId(session);
        sessionsByBoard.computeIfAbsent(boardId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
        broadcastPresence(boardId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String boardId = boardId(session);
        JsonNode payload = objectMapper.readTree(message.getPayload());
        String type = payload.path("type").asText();

        ObjectNode outgoing = objectMapper.createObjectNode();
        outgoing.put("type", type);
        outgoing.put("sessionId", boardId);
        outgoing.put("serverTime", Instant.now().toString());

        switch (type) {
            case "canvas:add" -> {
                if (!whiteboardService.getSession(boardId).isEditingLocked()) {
                    whiteboardService.appendElement(boardId, payload);
                    outgoing.set("element", payload.path("element"));
                    outgoing.put("authorName", payload.path("authorName").asText("Guest"));
                    broadcast(boardId, outgoing);
                }
            }
            case "canvas:clear" -> {
                if (!whiteboardService.getSession(boardId).isEditingLocked()) {
                    whiteboardService.clearElements(boardId);
                    outgoing.put("authorName", payload.path("authorName").asText("Guest"));
                    broadcast(boardId, outgoing);
                }
            }
            case "chat:message" -> {
                String text = payload.path("message").asText("").trim();
                if (!text.isBlank()) {
                    ChatMessage saved = whiteboardService.appendMessage(
                            boardId,
                            payload.path("authorName").asText("Guest"),
                            text
                    );
                    outgoing.put("id", saved.getId());
                    outgoing.put("authorName", saved.getAuthorName());
                    outgoing.put("message", saved.getMessage());
                    outgoing.put("createdAt", saved.getCreatedAt().toString());
                    broadcast(boardId, outgoing);
                }
            }
            case "cursor:move" -> {
                outgoing.put("authorName", payload.path("authorName").asText("Guest"));
                outgoing.set("cursor", payload.path("cursor"));
                broadcastExcept(boardId, outgoing, session);
            }
            case "permission:update" -> {
                boolean locked = payload.path("editingLocked").asBoolean(false);
                whiteboardService.setEditingLocked(boardId, locked);
                outgoing.put("editingLocked", locked);
                outgoing.put("authorName", payload.path("authorName").asText("Moderator"));
                broadcast(boardId, outgoing);
            }
            default -> {
                outgoing.put("error", "Unsupported event type");
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(outgoing)));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String boardId = boardId(session);
        Set<WebSocketSession> boardSessions = sessionsByBoard.getOrDefault(boardId, Collections.emptySet());
        boardSessions.remove(session);
        if (boardSessions.isEmpty()) {
            sessionsByBoard.remove(boardId);
        } else {
            broadcastPresence(boardId);
        }
    }

    public int activeConnections() {
        return sessionsByBoard.values().stream().mapToInt(Set::size).sum();
    }

    private void broadcastPresence(String boardId) {
        ObjectNode presence = objectMapper.createObjectNode();
        presence.put("type", "presence:update");
        presence.put("activeUsers", sessionsByBoard.getOrDefault(boardId, Set.of()).size());
        presence.put("serverTime", Instant.now().toString());
        broadcast(boardId, presence);
    }

    private void broadcast(String boardId, ObjectNode payload) {
        for (WebSocketSession target : sessionsByBoard.getOrDefault(boardId, Set.of())) {
            send(target, payload);
        }
    }

    private void broadcastExcept(String boardId, ObjectNode payload, WebSocketSession source) {
        for (WebSocketSession target : sessionsByBoard.getOrDefault(boardId, Set.of())) {
            if (!target.getId().equals(source.getId())) {
                send(target, payload);
            }
        }
    }

    private void send(WebSocketSession target, ObjectNode payload) {
        if (!target.isOpen()) {
            return;
        }
        try {
            target.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
        } catch (IOException ignored) {
            // Dropped sockets are cleaned up by Spring on close.
        }
    }

    private String boardId(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null) {
            return "";
        }
        String path = uri.getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }
}

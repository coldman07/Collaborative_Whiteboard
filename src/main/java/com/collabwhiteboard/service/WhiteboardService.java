package com.collabwhiteboard.service;

import com.collabwhiteboard.model.BoardSession;
import com.collabwhiteboard.model.CanvasElement;
import com.collabwhiteboard.model.ChatMessage;
import com.collabwhiteboard.repo.BoardSessionRepository;
import com.collabwhiteboard.repo.CanvasElementRepository;
import com.collabwhiteboard.repo.ChatMessageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class WhiteboardService {
    private final BoardSessionRepository sessions;
    private final CanvasElementRepository elements;
    private final ChatMessageRepository messages;
    private final ObjectMapper objectMapper;

    public WhiteboardService(
            BoardSessionRepository sessions,
            CanvasElementRepository elements,
            ChatMessageRepository messages,
            ObjectMapper objectMapper
    ) {
        this.sessions = sessions;
        this.elements = elements;
        this.messages = messages;
        this.objectMapper = objectMapper;
    }

    public BoardSession createSession(String title, String ownerName) {
        String resolvedTitle = title == null || title.isBlank() ? "Untitled whiteboard" : title.trim();
        String resolvedOwner = ownerName == null || ownerName.isBlank() ? "Guest" : ownerName.trim();
        return sessions.save(new BoardSession(resolvedTitle, resolvedOwner));
    }

    public BoardSession getSession(String idOrToken) {
        return sessions.findById(idOrToken)
                .or(() -> sessions.findByShareToken(idOrToken))
                .orElseThrow(() -> new NoSuchElementException("Whiteboard session not found"));
    }

    public List<CanvasElement> getElements(String idOrToken) {
        BoardSession session = getSession(idOrToken);
        return elements.findBySessionIdOrderByCreatedAtAsc(session.getId());
    }

    @Transactional
    public List<CanvasElement> replaceElements(String idOrToken, List<ElementRequest> incoming) {
        BoardSession session = getSession(idOrToken);
        elements.deleteBySessionId(session.getId());
        List<CanvasElement> saved = incoming.stream()
                .map(element -> new CanvasElement(
                        element.id(),
                        session.getId(),
                        element.type(),
                        blankToGuest(element.authorName()),
                        writeJson(element.payload())))
                .toList();
        return elements.saveAll(saved);
    }

    @Transactional
    public CanvasElement appendElement(String sessionId, JsonNode payload) {
        BoardSession session = getSession(sessionId);
        JsonNode element = payload.path("element");
        String id = textOrNull(element.path("id"));
        String type = textOrDefault(element.path("type"), "unknown");
        String author = textOrDefault(payload.path("authorName"), "Guest");
        return elements.save(new CanvasElement(id, session.getId(), type, author, writeJson(element)));
    }

    @Transactional
    public void clearElements(String sessionId) {
        BoardSession session = getSession(sessionId);
        elements.deleteBySessionId(session.getId());
    }

    public ChatMessage appendMessage(String sessionId, String authorName, String message) {
        BoardSession session = getSession(sessionId);
        return messages.save(new ChatMessage(session.getId(), blankToGuest(authorName), message.trim()));
    }

    public List<ChatMessage> getMessages(String idOrToken) {
        BoardSession session = getSession(idOrToken);
        return messages.findTop100BySessionIdOrderByCreatedAtAsc(session.getId());
    }

    public BoardSession setEditingLocked(String idOrToken, boolean locked) {
        BoardSession session = getSession(idOrToken);
        session.setEditingLocked(locked);
        return sessions.save(session);
    }

    public Analytics analytics(int activeSocketSessions) {
        long totalElements = elements.count();
        long totalMessages = messages.count();
        return new Analytics(sessions.count(), activeSocketSessions, totalElements, totalMessages, Instant.now());
    }

    private String writeJson(JsonNode jsonNode) {
        try {
            return objectMapper.writeValueAsString(jsonNode);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid element payload", exception);
        }
    }

    private static String blankToGuest(String value) {
        return value == null || value.isBlank() ? "Guest" : value.trim();
    }

    private static String textOrDefault(JsonNode node, String fallback) {
        return node == null || node.isMissingNode() || node.asText().isBlank() ? fallback : node.asText();
    }

    private static String textOrNull(JsonNode node) {
        return node == null || node.isMissingNode() || node.asText().isBlank() ? null : node.asText();
    }

    public record ElementRequest(String id, String type, String authorName, JsonNode payload) {
    }

    public record Analytics(long totalSessions, int activeRealtimeConnections, long totalElements,
                            long totalMessages, Instant generatedAt) {
    }
}

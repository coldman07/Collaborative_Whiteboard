package com.collabwhiteboard.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    @Id
    private String id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String authorName;

    @Lob
    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private Instant createdAt;

    public ChatMessage() {
    }

    public ChatMessage(String sessionId, String authorName, String message) {
        this.id = UUID.randomUUID().toString();
        this.sessionId = sessionId;
        this.authorName = authorName;
        this.message = message;
    }

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getMessage() {
        return message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

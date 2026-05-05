package com.collabwhiteboard.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "canvas_elements")
public class CanvasElement {
    @Id
    private String id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String elementType;

    @Column(nullable = false)
    private String authorName;

    @Lob
    @Column(nullable = false)
    private String payloadJson;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public CanvasElement() {
    }

    public CanvasElement(String sessionId, String elementType, String authorName, String payloadJson) {
        this.id = UUID.randomUUID().toString();
        this.sessionId = sessionId;
        this.elementType = elementType;
        this.authorName = authorName;
        this.payloadJson = payloadJson;
    }

    public CanvasElement(String id, String sessionId, String elementType, String authorName, String payloadJson) {
        this.id = id == null || id.isBlank() ? UUID.randomUUID().toString() : id;
        this.sessionId = sessionId;
        this.elementType = elementType;
        this.authorName = authorName;
        this.payloadJson = payloadJson;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getElementType() {
        return elementType;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

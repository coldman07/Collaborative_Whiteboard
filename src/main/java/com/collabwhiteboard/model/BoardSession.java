package com.collabwhiteboard.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "board_sessions")
public class BoardSession {
    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String ownerName;

    @Column(nullable = false, unique = true)
    private String shareToken;

    @Column(nullable = false)
    private boolean editingLocked;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public BoardSession() {
    }

    public BoardSession(String title, String ownerName) {
        this.id = UUID.randomUUID().toString();
        this.title = title;
        this.ownerName = ownerName;
        this.shareToken = UUID.randomUUID().toString().substring(0, 8);
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public String getShareToken() {
        return shareToken;
    }

    public boolean isEditingLocked() {
        return editingLocked;
    }

    public void setEditingLocked(boolean editingLocked) {
        this.editingLocked = editingLocked;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

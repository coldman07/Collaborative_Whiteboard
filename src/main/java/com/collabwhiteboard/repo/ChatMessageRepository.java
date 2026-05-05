package com.collabwhiteboard.repo;

import com.collabwhiteboard.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findTop100BySessionIdOrderByCreatedAtAsc(String sessionId);

    long countBySessionId(String sessionId);
}

package com.collabwhiteboard.repo;

import com.collabwhiteboard.model.CanvasElement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CanvasElementRepository extends JpaRepository<CanvasElement, String> {
    List<CanvasElement> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    long countBySessionId(String sessionId);

    void deleteBySessionId(String sessionId);
}

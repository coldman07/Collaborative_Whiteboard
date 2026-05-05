package com.collabwhiteboard.repo;

import com.collabwhiteboard.model.BoardSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BoardSessionRepository extends JpaRepository<BoardSession, String> {
    Optional<BoardSession> findByShareToken(String shareToken);
}

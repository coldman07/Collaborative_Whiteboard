package com.collabwhiteboard.web;

import com.collabwhiteboard.model.BoardSession;
import com.collabwhiteboard.model.CanvasElement;
import com.collabwhiteboard.model.ChatMessage;
import com.collabwhiteboard.service.WhiteboardService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class SessionController {
    private final WhiteboardService whiteboardService;
    private final SessionSocketHandler socketHandler;

    public SessionController(WhiteboardService whiteboardService, SessionSocketHandler socketHandler) {
        this.whiteboardService = whiteboardService;
        this.socketHandler = socketHandler;
    }

    @PostMapping("/sessions")
    public BoardSession create(@Valid @RequestBody CreateSessionRequest request) {
        return whiteboardService.createSession(request.title(), request.ownerName());
    }

    @GetMapping("/sessions/{idOrToken}")
    public BoardSession get(@PathVariable String idOrToken) {
        return whiteboardService.getSession(idOrToken);
    }

    @GetMapping("/sessions/{idOrToken}/elements")
    public List<CanvasElement> elements(@PathVariable String idOrToken) {
        return whiteboardService.getElements(idOrToken);
    }

    @PutMapping("/sessions/{idOrToken}/elements")
    public List<CanvasElement> saveElements(
            @PathVariable String idOrToken,
            @RequestBody List<WhiteboardService.ElementRequest> elements
    ) {
        return whiteboardService.replaceElements(idOrToken, elements);
    }

    @DeleteMapping("/sessions/{idOrToken}/elements")
    public ResponseEntity<Void> clear(@PathVariable String idOrToken) {
        whiteboardService.clearElements(idOrToken);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions/{idOrToken}/messages")
    public List<ChatMessage> messages(@PathVariable String idOrToken) {
        return whiteboardService.getMessages(idOrToken);
    }

    @PutMapping("/sessions/{idOrToken}/permissions")
    public BoardSession permissions(@PathVariable String idOrToken, @RequestBody PermissionRequest request) {
        return whiteboardService.setEditingLocked(idOrToken, request.editingLocked());
    }

    @GetMapping("/admin/analytics")
    public WhiteboardService.Analytics analytics() {
        return whiteboardService.analytics(socketHandler.activeConnections());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException exception) {
        return ResponseEntity.status(404).body(Map.of("error", exception.getMessage()));
    }

    public record CreateSessionRequest(@NotBlank String title, String ownerName) {
    }

    public record PermissionRequest(boolean editingLocked) {
    }
}

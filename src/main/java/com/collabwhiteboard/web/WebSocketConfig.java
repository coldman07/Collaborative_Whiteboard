package com.collabwhiteboard.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final SessionSocketHandler sessionSocketHandler;

    public WebSocketConfig(SessionSocketHandler sessionSocketHandler) {
        this.sessionSocketHandler = sessionSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sessionSocketHandler, "/ws/sessions/{sessionId}")
                .setAllowedOrigins("*");
    }
}

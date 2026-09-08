package com.example.backendtemplate.controllers;

import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final ApplicationAvailability availability;
    private final Optional<DataSource> dataSource;

    public HealthController(ApplicationAvailability availability, Optional<DataSource> dataSource) {
        this.availability = availability;
        this.dataSource = dataSource;
    }

    @GetMapping("/health/live")
    public Map<String, String> live() {
        return Map.of("status", "alive");
    }

    @GetMapping("/health/ready")
    public ResponseEntity<Map<String, String>> ready() {
        boolean ready = availability.getReadinessState() == ReadinessState.ACCEPTING_TRAFFIC;
        if (ready && dataSource.isPresent()) {
            try (var connection = dataSource.orElseThrow().getConnection()) {
                ready = connection.isValid(1);
            } catch (SQLException error) {
                ready = false;
            }
        }
        return ResponseEntity.status(ready ? 200 : 503).body(Map.of("status", ready ? "ready" : "not_ready"));
    }
}

package com.example.backendtemplate.controllers;

import com.example.backendtemplate.dto.*;
import com.example.backendtemplate.http.Inputs;
import com.example.backendtemplate.services.ReservationAttempts;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!no-db")
public class ReservationController {
    private final ReservationAttempts service;

    public ReservationController(ReservationAttempts service) {
        this.service = service;
    }

    @PostMapping("/v1/reservations")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public ResponseEntity<ApiResponse<ReservationResponse>> reserve(@RequestBody ReserveRequest body,
            @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        var productId = Inputs.text(body.productId(), "body", "product_id", 64, true);
        var token = Inputs.text(key, "header", "Idempotency-Key", 128, true);
        var result = service.reserve(productId, token);
        var reservation = result.reservation();
        return ResponseEntity.status(201).header("Idempotency-Replayed", Boolean.toString(result.replayed()))
                .body(new ApiResponse<>(new ReservationResponse(reservation.reservationId(),
                        reservation.productId(), reservation.createdAt())));
    }
}

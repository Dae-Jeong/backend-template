package com.backendtemplate.controllers;

import com.backendtemplate.dto.ApiResponse;
import com.backendtemplate.dto.ReservationResponse;
import com.backendtemplate.dto.ReserveRequest;
import com.backendtemplate.http.Inputs;
import com.backendtemplate.services.ReservationAttempts;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!no-db")
public class ReservationController {
    private final ReservationAttempts service;

    public ReservationController(ReservationAttempts service) {
        this.service = service;
    }

    @PostMapping("/v1/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ApiResponse<ReservationResponse>> reserve(@RequestBody ReserveRequest body,
            @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        var productId = Inputs.token(body.productId(), "body", "product_id", 64);
        var idempotencyKey = Inputs.token(key, "header", "Idempotency-Key", 128);
        var result = service.reserve(productId, idempotencyKey);
        var reservation = result.reservation();
        var response = new ReservationResponse(reservation.reservationId(),
                reservation.productId(), reservation.createdAt());
        return ResponseEntity.status(201).header("Idempotency-Replayed", Boolean.toString(result.replayed()))
                .body(new ApiResponse<>(response));
    }
}

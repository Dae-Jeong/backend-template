package com.backendtemplate.contracts;

import java.time.Instant;

public record Reservation(String reservationId, String productId, Instant createdAt) {}

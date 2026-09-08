package com.backendtemplate.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record ReservationResponse(
        @JsonProperty("reservation_id") String reservationId,
        @JsonProperty("product_id") String productId,
        @JsonProperty("created_at") Instant createdAt) {}

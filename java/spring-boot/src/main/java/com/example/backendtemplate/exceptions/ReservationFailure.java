package com.example.backendtemplate.exceptions;

public class ReservationFailure extends RuntimeException {
    public enum Reason { PRODUCT_NOT_FOUND, SOLD_OUT, IDEMPOTENCY_CONFLICT }
    private final Reason reason;

    public ReservationFailure(Reason reason) {
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }
}

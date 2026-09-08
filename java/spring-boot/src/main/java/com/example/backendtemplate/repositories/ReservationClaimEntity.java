package com.example.backendtemplate.repositories;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reservation_claims")
class ReservationClaimEntity {
    @Id
    @Column(name = "idempotency_key", length = 128)
    private String key;

    protected ReservationClaimEntity() {}

    ReservationClaimEntity(String key) {
        this.key = key;
    }
}

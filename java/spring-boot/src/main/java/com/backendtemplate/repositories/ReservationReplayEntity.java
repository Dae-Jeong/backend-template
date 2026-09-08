package com.backendtemplate.repositories;

import com.backendtemplate.contracts.Reservation;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
class ReservationReplayEntity {
    @Id
    @Column(name = "idempotency_key", length = 128)
    private String key;
    @Column(name = "product_id", length = 64, nullable = false)
    private String productId;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private ReservationEntity reservation;
    @Column(name = "reservation_id", length = 32, insertable = false, updatable = false)
    private String reservationId;
    @Convert(converter = UtcTimestampConverter.class)
    @Column(name = "created_at", length = 40, nullable = false)
    private Instant createdAt;

    protected ReservationReplayEntity() {}

    ReservationReplayEntity(String key, Reservation value, ReservationEntity reservation) {
        this.key = key;
        this.productId = value.productId();
        this.reservation = reservation;
        this.reservationId = value.reservationId();
        this.createdAt = value.createdAt();
    }

    Reservation toContract() {
        return new Reservation(reservationId, productId, createdAt);
    }
}

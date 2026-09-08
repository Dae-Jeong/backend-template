package com.example.backendtemplate.repositories;

import com.example.backendtemplate.contracts.Reservation;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "reservations")
class ReservationEntity {
    @Id
    @Column(length = 32)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;
    @Convert(converter = UtcTimestampConverter.class)
    @Column(name = "created_at", length = 40, nullable = false)
    private Instant createdAt;

    protected ReservationEntity() {}

    ReservationEntity(Reservation value, ProductEntity product) {
        this.id = value.reservationId();
        this.product = product;
        this.createdAt = value.createdAt();
    }
}

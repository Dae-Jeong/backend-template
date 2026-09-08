package com.example.backendtemplate.repositories;

import com.example.backendtemplate.contracts.Reservation;
import com.example.backendtemplate.exceptions.ReservationFailure;
import com.example.backendtemplate.exceptions.ReservationFailure.Reason;
import com.example.backendtemplate.exceptions.IdempotencyClaimed;
import jakarta.persistence.EntityManager;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

@Repository
@Profile("!no-db")
public class ReservationRepository {
    private final EntityManager entities;
    private final ProductRepository products;
    private final ReservationReplayRepository replays;

    public ReservationRepository(EntityManager entities, ProductRepository products, ReservationReplayRepository replays) {
        this.entities = entities;
        this.products = products;
        this.replays = replays;
    }

    public void claim(String key) {
        // Assigned IDs must INSERT, never merge an existing claim into a successful no-op.
        entities.persist(new ReservationClaimEntity(key));
        try {
            entities.flush();
        } catch (ConstraintViolationException failure) {
            if ("23505".equals(failure.getSQLState()) && failure.getSQL() != null
                    && failure.getSQL().contains("insert into reservation_claims")) {
                throw new IdempotencyClaimed();
            }
            throw failure;
        }
    }

    public Optional<Reservation> replay(String key, String productId) {
        return replays.findByKey(key).map(row -> {
            var value = row.toContract();
            if (!value.productId().equals(productId)) throw new ReservationFailure(Reason.IDEMPOTENCY_CONFLICT);
            return value;
        });
    }

    public void decreaseStock(String productId) {
        if (products.decreaseAvailableStock(productId) == 0) {
            throw new ReservationFailure(products.existsById(productId) ? Reason.SOLD_OUT : Reason.PRODUCT_NOT_FOUND);
        }
    }

    public void save(Reservation reservation, String key) {
        var product = entities.getReference(ProductEntity.class, reservation.productId());
        var stored = new ReservationEntity(reservation, product);
        entities.persist(stored);
        entities.persist(new ReservationReplayEntity(key, reservation, stored));
        // Flush is not completion; the Service proxy still owns commit and any rollback.
        entities.flush();
    }

    public int seed(String productId, int stock) {
        return products.findById(productId).map(ProductEntity::available).orElseGet(() -> {
            entities.persist(new ProductEntity(productId, stock));
            return stock;
        });
    }
}

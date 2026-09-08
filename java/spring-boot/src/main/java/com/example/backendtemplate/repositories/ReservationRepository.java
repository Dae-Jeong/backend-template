package com.example.backendtemplate.repositories;

import com.example.backendtemplate.contracts.Reservation;
import com.example.backendtemplate.exceptions.ReservationFailure;
import com.example.backendtemplate.exceptions.ReservationFailure.Reason;
import java.time.Instant;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
@Profile("!no-db")
public class ReservationRepository {
    private final JdbcClient jdbc;

    public ReservationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void lockReservations() {
        // One database row serializes reservation writes across connections/processes.
        jdbc.sql("SELECT id FROM reservation_guard WHERE id = 1 FOR UPDATE").query(Integer.class).single();
    }

    public Optional<Reservation> replay(String key, String productId) {
        return jdbc.sql("SELECT product_id, reservation_id, created_at FROM idempotency_keys WHERE idempotency_key = :key")
                .param("key", key).query((rs, index) -> {
                    if (!rs.getString("product_id").equals(productId)) {
                        throw new ReservationFailure(Reason.IDEMPOTENCY_CONFLICT);
                    }
                    return new Reservation(rs.getString("reservation_id"), rs.getString("product_id"),
                            Instant.parse(rs.getString("created_at")));
                }).optional();
    }

    public void decreaseStock(String productId) {
        int changed = jdbc.sql("UPDATE products SET available = available - 1 WHERE id = :id AND available > 0")
                .param("id", productId).update();
        if (changed == 0) {
            boolean exists = jdbc.sql("SELECT id FROM products WHERE id = :id").param("id", productId)
                    .query(String.class).optional().isPresent();
            throw new ReservationFailure(exists ? Reason.SOLD_OUT : Reason.PRODUCT_NOT_FOUND);
        }
    }

    public void save(Reservation reservation, String key) {
        jdbc.sql("INSERT INTO reservations(id, product_id, created_at) VALUES (:id, :product, :created)")
                .param("id", reservation.reservationId()).param("product", reservation.productId())
                .param("created", reservation.createdAt().toString()).update();
        jdbc.sql("INSERT INTO idempotency_keys(idempotency_key, product_id, reservation_id, created_at) VALUES (:key, :product, :id, :created)")
                .param("key", key).param("product", reservation.productId())
                .param("id", reservation.reservationId()).param("created", reservation.createdAt().toString()).update();
    }

    public int seed(String productId, int stock) {
        lockReservations();
        jdbc.sql("INSERT INTO products(id, available) SELECT :id, :stock WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = :id)")
                .param("id", productId).param("stock", stock).update();
        return jdbc.sql("SELECT available FROM products WHERE id = :id").param("id", productId)
                .query(Integer.class).single();
    }
}

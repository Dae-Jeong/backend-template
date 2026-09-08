package com.example.backendtemplate.services;

import com.example.backendtemplate.contracts.ReservationResult;
import com.example.backendtemplate.exceptions.IdempotencyClaimed;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!no-db")
public class ReservationAttempts {
    private final ReservationService transactions;

    public ReservationAttempts(ReservationService transactions) {
        this.transactions = transactions;
    }

    public ReservationResult reserve(String productId, String key) {
        try {
            return transactions.reserve(productId, key);
        } catch (IdempotencyClaimed winner) {
            // The proxy has rolled back the failed claim before a fresh Primary read.
            return transactions.replay(productId, key);
        }
    }
}

package com.backendtemplate.observation;

import io.micrometer.core.instrument.MeterRegistry;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionExecution;
import org.springframework.transaction.TransactionExecutionListener;

@Component
@Profile("!no-db")
public class TransactionMetrics implements TransactionExecutionListener {
    private record Started(long nanos, boolean committing) {}
    private final MeterRegistry registry;
    private final Map<TransactionExecution, Started> active = new ConcurrentHashMap<>();

    public TransactionMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    @Override
    public void beforeBegin(TransactionExecution transaction) {
        active.put(transaction, new Started(System.nanoTime(), false));
    }

    @Override
    public void afterBegin(TransactionExecution transaction, Throwable failure) {
        if (failure != null) {
            finish(transaction, "failed");
        }
    }

    @Override
    public void beforeCommit(TransactionExecution transaction) {
        active.computeIfPresent(transaction, (key, value) -> new Started(value.nanos(), true));
    }

    @Override
    public void afterCommit(TransactionExecution transaction, Throwable failure) {
        finish(transaction, failure == null ? "committed" : "failed");
    }

    @Override
    public void afterRollback(TransactionExecution transaction, Throwable failure) {
        var started = active.get(transaction);
        finish(transaction, failure != null || (started != null && started.committing()) ? "failed" : "rolled_back");
    }

    private void finish(TransactionExecution transaction, String outcome) {
        var started = active.remove(transaction);
        if (started == null) {
            return;
        }
        try {
            registry.counter("db.transactions", "role", "primary", "outcome", outcome).increment();
            registry.timer("db.transaction.duration", "role", "primary", "outcome", outcome)
                    .record(System.nanoTime() - started.nanos(), TimeUnit.NANOSECONDS);
        } catch (RuntimeException ignored) {
            // Actual transaction completion remains authoritative when observation fails.
        }
    }
}

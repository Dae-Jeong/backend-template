package com.example.backendtemplate;

import static org.assertj.core.api.Assertions.*;
import java.nio.file.Files;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class MigrationTest {
    @Test
    void upgradeRemovesGlobalGuardAndPreservesExistingResults() throws Exception {
        String url = "jdbc:h2:file:" + Files.createTempDirectory("spring-upgrade-").resolve("db");
        Flyway.configure().dataSource(url, "sa", "").target("1").load().migrate();
        try (var connection = DriverManager.getConnection(url, "sa", ""); var sql = connection.createStatement()) {
            sql.executeUpdate("INSERT INTO products VALUES ('demo', 2)");
            sql.executeUpdate("INSERT INTO reservations VALUES ('existing', 'demo', '2026-09-08T00:00:00Z')");
            sql.executeUpdate("INSERT INTO idempotency_keys VALUES ('existing-key', 'demo', 'existing', '2026-09-08T00:00:00Z')");
        }
        var flyway = Flyway.configure().dataSource(url, "sa", "").load();
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        try (var connection = DriverManager.getConnection(url, "sa", ""); var sql = connection.createStatement()) {
            try (var result = sql.executeQuery("SELECT available FROM products WHERE id='demo'")) {
                result.next();
                assertThat(result.getInt(1)).isEqualTo(2);
            }
            try (var result = sql.executeQuery("SELECT idempotency_key FROM reservation_claims")) {
                result.next();
                assertThat(result.getString(1)).isEqualTo("existing-key");
            }
            assertThatThrownBy(() -> sql.executeQuery("SELECT * FROM reservation_guard"))
                    .isInstanceOf(java.sql.SQLException.class);
        }
        var bad = Files.createTempDirectory("spring-bad-migration-");
        Files.writeString(bad.resolve("V3__broken.sql"), "THIS IS INVALID SQL;");
        assertThatThrownBy(() -> Flyway.configure().dataSource(url, "sa", "")
                .locations("classpath:db/migration", "filesystem:" + bad).load().migrate())
                .isInstanceOf(org.flywaydb.core.api.FlywayException.class);
    }
}

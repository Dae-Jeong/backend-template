package com.backendtemplate.config;

import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/** Runs after config data, before resource/feature Bean definitions are evaluated. */
public class DatabaseEnvironment implements EnvironmentPostProcessor, Ordered {
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 11;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (url.isBlank()) {
            environment.addActiveProfile("no-db");
            environment.getPropertySources().addFirst(new MapPropertySource("disabledDatabase", Map.of(
                    "spring.autoconfigure.exclude", "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                            + "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration",
                    "management.endpoint.health.group.readiness.include", "readinessState")));
        }
    }
}

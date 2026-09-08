package com.example.backendtemplate.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("spring.datasource.hikari")
public record PoolProperties(@Min(1) @Max(32) int maximumPoolSize,
        @Min(250) @Max(30000) long connectionTimeout) {}

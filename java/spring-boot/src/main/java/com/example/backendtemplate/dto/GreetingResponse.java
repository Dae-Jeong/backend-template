package com.example.backendtemplate.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record GreetingResponse(String message, @JsonProperty("generated_at") Instant generatedAt) {}

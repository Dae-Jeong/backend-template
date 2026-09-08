package com.backendtemplate.contracts;

import java.time.Instant;

public record Greeting(String message, Instant generatedAt) {}

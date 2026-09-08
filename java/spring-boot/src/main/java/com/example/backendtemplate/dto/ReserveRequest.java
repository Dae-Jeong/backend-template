package com.example.backendtemplate.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ReserveRequest(@JsonProperty("product_id") String productId) {}

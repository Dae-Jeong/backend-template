package com.example.backendtemplate.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.example.backendtemplate.http.ReserveRequestDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonDeserialize(using = ReserveRequestDeserializer.class)
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record ReserveRequest(@JsonProperty("product_id")
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 64,
                pattern = "^[A-Za-z0-9._:-]+$") String productId) {}

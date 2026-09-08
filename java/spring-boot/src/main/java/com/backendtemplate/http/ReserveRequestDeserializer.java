package com.backendtemplate.http;

import com.backendtemplate.dto.ReserveRequest;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ValueDeserializer;

/** Preserves the public distinction between a missing field and an explicit JSON null. */
public class ReserveRequestDeserializer extends ValueDeserializer<ReserveRequest> {
    @Override
    public ReserveRequest deserialize(JsonParser parser, DeserializationContext context) {
        JsonNode body = parser.readValueAsTree();
        if (!body.isObject()) {
            throw new InvalidInput();
        }
        JsonNode product = body.get("product_id");
        if (product == null) {
            throw new InvalidInput("body", "product_id", "REQUIRED");
        }
        if (!product.isString()) {
            throw new InvalidInput("body", "product_id", "INVALID");
        }
        if (body.size() != 1) {
            throw new InvalidInput();
        }
        return new ReserveRequest(product.asString());
    }
}

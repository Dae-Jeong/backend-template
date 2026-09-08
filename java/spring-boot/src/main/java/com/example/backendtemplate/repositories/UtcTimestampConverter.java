package com.example.backendtemplate.repositories;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Instant;

/** V1 stores UTC timestamps as VARCHAR; schema and replay precision stay unchanged. */
@Converter
public class UtcTimestampConverter implements AttributeConverter<Instant, String> {
    @Override
    public String convertToDatabaseColumn(Instant value) { return value == null ? null : value.toString(); }
    @Override
    public Instant convertToEntityAttribute(String value) { return value == null ? null : Instant.parse(value); }
}

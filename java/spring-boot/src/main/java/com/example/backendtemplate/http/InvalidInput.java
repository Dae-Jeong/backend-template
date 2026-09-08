package com.example.backendtemplate.http;

import com.example.backendtemplate.dto.FieldError;
import java.util.List;

public class InvalidInput extends RuntimeException {
    private final List<FieldError> errors;

    public InvalidInput(String scope, String field, String code) {
        errors = List.of(new FieldError(List.of(scope, field), code));
    }

    public List<FieldError> errors() {
        return errors;
    }
}

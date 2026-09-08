package com.example.backendtemplate.http;

public final class Inputs {
    private Inputs() {}

    public static String text(String value, String scope, String field, int max) {
        if (value == null) {
            throw new InvalidInput(scope, field, "REQUIRED");
        }
        if (value.isEmpty()) {
            throw new InvalidInput(scope, field, "TOO_SHORT");
        }
        if (value.codePointCount(0, value.length()) > max) {
            throw new InvalidInput(scope, field, "TOO_LONG");
        }
        return value;
    }

    public static String token(String value, String scope, String field, int max) {
        text(value, scope, field, max);
        if (!value.matches("[A-Za-z0-9._:-]+")) {
            throw new InvalidInput(scope, field, "INVALID");
        }
        return value;
    }
}

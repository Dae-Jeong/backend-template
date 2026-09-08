package com.example.backendtemplate.http;

public final class Inputs {
    private Inputs() {}

    public static String text(String value, String scope, String field, int max, boolean token) {
        if (value == null) throw new InvalidInput(scope, field, "REQUIRED");
        if (value.isEmpty()) throw new InvalidInput(scope, field, "TOO_SHORT");
        if (value.codePointCount(0, value.length()) > max) throw new InvalidInput(scope, field, "TOO_LONG");
        if (token && !value.matches("[A-Za-z0-9._:-]+")) throw new InvalidInput(scope, field, "INVALID");
        return value;
    }
}

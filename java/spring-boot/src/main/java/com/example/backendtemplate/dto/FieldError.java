package com.example.backendtemplate.dto;

import java.util.List;

public record FieldError(List<String> location, String code) {}

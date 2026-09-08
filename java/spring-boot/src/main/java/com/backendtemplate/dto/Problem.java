package com.backendtemplate.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Problem(String type, String title, int status, String code,
        @JsonProperty("request_id") String requestId, List<FieldError> errors) {}

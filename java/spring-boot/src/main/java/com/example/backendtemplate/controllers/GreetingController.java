package com.example.backendtemplate.controllers;

import com.example.backendtemplate.dto.ApiResponse;
import com.example.backendtemplate.dto.GreetingResponse;
import com.example.backendtemplate.http.Inputs;
import com.example.backendtemplate.services.GreetingService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {
    private final GreetingService service;

    public GreetingController(GreetingService service) {
        this.service = service;
    }

    @GetMapping("/")
    public ApiResponse<Map<String, String>> index() {
        return new ApiResponse<>(Map.of("message", "Hello, Spring Boot!"));
    }

    @GetMapping("/v1/greetings")
    public ApiResponse<GreetingResponse> greet(@RequestParam(required = false) String name) {
        var validatedName = Inputs.text(name == null ? null : name.strip(), "query", "name", 80);
        var result = service.greet(validatedName);
        var response = new GreetingResponse(result.message(), result.generatedAt());
        return new ApiResponse<>(response);
    }
}

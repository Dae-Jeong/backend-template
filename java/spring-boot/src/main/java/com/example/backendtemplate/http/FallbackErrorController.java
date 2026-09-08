package com.example.backendtemplate.http;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FallbackErrorController implements ErrorController {
    @RequestMapping("/error")
    public ResponseEntity<Object> error(HttpServletRequest request) {
        Object value = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = value instanceof Integer code && code >= 400 && code <= 599 ? code : 500;
        return ApiExceptionHandler.problem(status, status == 404 ? "NOT_FOUND" : "INTERNAL_ERROR",
                null, new HttpHeaders(), request);
    }
}

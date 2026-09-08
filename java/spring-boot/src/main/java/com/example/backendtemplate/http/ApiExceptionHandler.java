package com.example.backendtemplate.http;

import com.example.backendtemplate.dto.FieldError;
import com.example.backendtemplate.exceptions.ReservationFailure;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.*;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(InvalidInput.class)
    ResponseEntity<Object> invalid(InvalidInput error, HttpServletRequest request) {
        return problem(422, "INVALID_INPUT", error.errors(), new HttpHeaders(), request);
    }

    @ExceptionHandler(ReservationFailure.class)
    ResponseEntity<Object> reservation(ReservationFailure error, HttpServletRequest request) {
        int status = error.reason() == ReservationFailure.Reason.PRODUCT_NOT_FOUND ? 404 : 409;
        return problem(status, error.reason().name(), null, new HttpHeaders(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> unexpected(Exception error, HttpServletRequest request, HttpServletResponse response) {
        request.setAttribute("error.type", error.getClass().getName());
        if (response.isCommitted()) return null;
        HttpHeaders headers = new HttpHeaders();
        if (error instanceof CannotAcquireLockException || error instanceof QueryTimeoutException) {
            headers.set("Retry-After", "1");
            return problem(503, "DATABASE_BUSY", null, headers, request);
        }
        if (error instanceof CannotCreateTransactionException || error instanceof CannotGetJdbcConnectionException) {
            headers.set("Retry-After", "1");
            return problem(503, "DATABASE_POOL_TIMEOUT", null, headers, request);
        }
        return problem(500, "INTERNAL_ERROR", null, headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception error, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        int code = status.value();
        if (code == 400) code = 422;
        if (error.getCause() instanceof InvalidInput invalid) {
            return problem(422, "INVALID_INPUT", invalid.errors(), headers,
                    ((ServletWebRequest) request).getRequest());
        }
        String name = switch (code) {
            case 422 -> "INVALID_INPUT";
            case 404 -> "NOT_FOUND";
            case 405 -> "METHOD_NOT_ALLOWED";
            default -> code >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR";
        };
        var location = List.<String>of();
        if (error.getCause() instanceof tools.jackson.databind.DatabindException json
                && json.getPath().size() == 1
                && "product_id".equals(json.getPath().getFirst().getPropertyName())) {
            location = List.of("body", "product_id");
        }
        return problem(code, name, code == 422 ? List.of(new FieldError(location, "INVALID")) : null,
                headers, ((ServletWebRequest) request).getRequest());
    }

    public static ResponseEntity<Object> problem(int status, String code, List<FieldError> errors,
            HttpHeaders source, HttpServletRequest request) {
        var detail = ProblemDetail.forStatus(status);
        detail.setTitle(status == 422 ? "Unprocessable Entity" : HttpStatus.valueOf(status).getReasonPhrase());
        detail.setProperty("code", code);
        detail.setProperty("request_id", RequestContextFilter.requestId(request));
        if (errors != null) detail.setProperty("errors", errors);
        var headers = new HttpHeaders();
        headers.putAll(source);
        headers.remove(HttpHeaders.CONTENT_LENGTH);
        headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
        headers.set("X-Request-ID", RequestContextFilter.requestId(request));
        return new ResponseEntity<>(new com.example.backendtemplate.dto.Problem(
                "about:blank", detail.getTitle(), status, code,
                RequestContextFilter.requestId(request), errors), headers, HttpStatusCode.valueOf(status));
    }
}

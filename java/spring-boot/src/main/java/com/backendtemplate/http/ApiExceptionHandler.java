package com.backendtemplate.http;

import com.backendtemplate.dto.FieldError;
import com.backendtemplate.dto.Problem;
import com.backendtemplate.exceptions.ReservationFailure;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.sql.SQLTransientConnectionException;
import java.util.List;
import org.hibernate.exception.JDBCConnectionException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
        if (response.isCommitted()) {
            return null;
        }
        HttpHeaders headers = new HttpHeaders();
        if (error instanceof CannotAcquireLockException || error instanceof QueryTimeoutException) {
            headers.set("Retry-After", "1");
            return problem(503, "DATABASE_BUSY", null, headers, request);
        }
        if ((error instanceof CannotCreateTransactionException || error instanceof CannotGetJdbcConnectionException)
                && isPoolTimeout(error.getCause())) {
            headers.set("Retry-After", "1");
            return problem(503, "DATABASE_POOL_TIMEOUT", null, headers, request);
        }
        return problem(500, "INTERNAL_ERROR", null, headers, request);
    }

    private static boolean isPoolTimeout(Throwable cause) {
        // JPA wraps connection acquisition in Hibernate JDBCConnectionException.
        if (cause instanceof JDBCConnectionException jdbc) {
            cause = jdbc.getSQLException();
        }
        return cause instanceof SQLTransientConnectionException;
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception error, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        int httpStatus = status.value() == 400 ? 422 : status.value();
        var servletRequest = ((ServletWebRequest) request).getRequest();
        if (error.getCause() instanceof InvalidInput invalid) {
            return problem(422, "INVALID_INPUT", invalid.errors(), headers,
                    servletRequest);
        }
        String problemCode = switch (httpStatus) {
            case 422 -> "INVALID_INPUT";
            case 404 -> "NOT_FOUND";
            case 405 -> "METHOD_NOT_ALLOWED";
            default -> httpStatus >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR";
        };
        var errors = httpStatus == 422 ? List.of(new FieldError(List.of(), "INVALID")) : null;
        return problem(httpStatus, problemCode, errors, headers, servletRequest);
    }

    public static ResponseEntity<Object> problem(int httpStatus, String problemCode, List<FieldError> errors,
            HttpHeaders source, HttpServletRequest request) {
        String title = httpStatus == 422 ? "Unprocessable Entity" : HttpStatus.valueOf(httpStatus).getReasonPhrase();
        String requestId = RequestContextFilter.requestId(request);
        var problem = new Problem("about:blank", title, httpStatus, problemCode, requestId, errors);
        var headers = new HttpHeaders();
        headers.putAll(source);
        headers.remove(HttpHeaders.CONTENT_LENGTH);
        headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
        headers.set("X-Request-ID", requestId);
        return new ResponseEntity<>(problem, headers, HttpStatusCode.valueOf(httpStatus));
    }
}

package com.example.backendtemplate.http;

import com.example.backendtemplate.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

@Component("apiRequestContextFilter")
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestContextFilter extends OncePerRequestFilter {
    private static final Logger LOG = LoggerFactory.getLogger(RequestContextFilter.class);
    private final AppProperties properties;

    public RequestContextFilter(AppProperties properties) {
        this.properties = properties;
    }

    public static String requestId(HttpServletRequest request) {
        var value = request.getAttribute("request_id");
        if (value == null) {
            value = UUID.randomUUID().toString().replace("-", "");
            request.setAttribute("request_id", value);
        }
        return value.toString();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        long started = System.nanoTime();
        String id = requestId(request);
        response.setHeader("X-Request-ID", id);
        MDC.put("app.work.id", id);
        MDC.put("app.work.kind", "http");
        MDC.put("app.environment", properties.environment());
        try {
            chain.doFilter(request, response);
        } finally {
            try {
                Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
                LOG.atInfo().addKeyValue("event.action", "http.completed")
                        .addKeyValue("http.request.method", request.getMethod())
                        .addKeyValue("http.response.status_code", response.getStatus())
                        .addKeyValue("http.route", route == null ? "unmatched" : route.toString())
                        .addKeyValue("event.duration", System.nanoTime() - started)
                        .addKeyValue("event.outcome", response.getStatus() >= 500 ? "failure" : "success")
                        .addKeyValue("error.type", request.getAttribute("error.type"))
                        .log("http.completed");
            } catch (RuntimeException ignored) {
                // Telemetry is best effort and cannot change a completed business outcome.
            } finally {
                MDC.remove("app.work.id");
                MDC.remove("app.work.kind");
                MDC.remove("app.environment");
            }
        }
    }
}

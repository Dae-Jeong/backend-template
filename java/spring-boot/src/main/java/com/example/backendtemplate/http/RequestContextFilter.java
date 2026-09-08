package com.example.backendtemplate.http;

import com.example.backendtemplate.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
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
        var completed = new AtomicBoolean();
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException | Error error) {
            request.setAttribute("error.type", error.getClass().getName());
            throw error;
        } finally {
            try {
                if (request.isAsyncStarted()) {
                    request.getAsyncContext().addListener(new AsyncListener() {
                        @Override
                        public void onComplete(AsyncEvent event) {
                            complete(request, response, started, completed);
                        }
                        @Override
                        public void onTimeout(AsyncEvent event) {
                            request.setAttribute("error.type", "AsyncTimeout");
                        }
                        @Override
                        public void onError(AsyncEvent event) {
                            request.setAttribute("error.type", event.getThrowable().getClass().getName());
                        }
                        @Override
                        public void onStartAsync(AsyncEvent event) {
                            event.getAsyncContext().addListener(this);
                        }
                    });
                } else {
                    complete(request, response, started, completed);
                }
            } catch (IllegalStateException finishedDuringRegistration) {
                complete(request, response, started, completed);
            } finally {
                MDC.remove("app.work.id");
                MDC.remove("app.work.kind");
                MDC.remove("app.environment");
            }
        }
    }

    private void complete(HttpServletRequest request, HttpServletResponse response,
            long started, AtomicBoolean completed) {
        if (!completed.compareAndSet(false, true)) return;
        var previous = MDC.getCopyOfContextMap();
        try {
            MDC.put("app.work.id", requestId(request));
            MDC.put("app.work.kind", "http");
            MDC.put("app.environment", properties.environment());
            Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            Object error = request.getAttribute("error.type");
            LOG.atInfo().addKeyValue("event.action", "http.completed")
                    .addKeyValue("app.log_schema_version", 1)
                    .addKeyValue("http.request.method", request.getMethod())
                    .addKeyValue("http.response.status_code", response.getStatus())
                    .addKeyValue("http.response.committed", response.isCommitted())
                    .addKeyValue("http.route", route == null ? "unmatched" : route.toString())
                    .addKeyValue("event.duration", System.nanoTime() - started)
                    .addKeyValue("event.outcome", response.getStatus() >= 500 || error != null ? "failure" : "success")
                    .addKeyValue("error.type", error).log("http.completed");
        } catch (RuntimeException ignored) {
            // Telemetry cannot change the business outcome.
        } finally {
            if (previous == null) MDC.clear();
            else MDC.setContextMap(previous);
        }
    }
}

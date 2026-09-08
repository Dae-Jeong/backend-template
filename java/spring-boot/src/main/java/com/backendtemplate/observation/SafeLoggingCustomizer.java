package com.backendtemplate.observation;

import ch.qos.logback.classic.spi.ILoggingEvent;
import java.util.Set;
import org.springframework.boot.json.JsonWriter;
import org.springframework.boot.logging.structured.StructuredLoggingJsonMembersCustomizer;

/** Keep framework metadata while withholding unreviewed messages and exception text. */
public class SafeLoggingCustomizer implements StructuredLoggingJsonMembersCustomizer<ILoggingEvent> {
    private static final Set<String> EVENTS = Set.of("http.completed", "application.failed");

    @Override
    public void customize(JsonWriter.Members<ILoggingEvent> members) {
        members.applyingPathFilter(path -> Set.of("error.message", "error.stack_trace").contains(path.toString()));
        members.applyingValueProcessor(JsonWriter.ValueProcessor.<String>of(
                value -> EVENTS.contains(value) ? value : "framework.event").whenHasPath("message"));
    }
}

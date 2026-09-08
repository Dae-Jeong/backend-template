package com.backendtemplate.services;

import com.backendtemplate.contracts.Greeting;
import java.time.Clock;
import org.springframework.stereotype.Service;

@Service
public class GreetingService {
    private final Clock clock;

    public GreetingService(Clock clock) {
        this.clock = clock;
    }

    public Greeting greet(String name) {
        return new Greeting("Hello, " + name + "!", clock.instant());
    }
}

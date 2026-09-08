package com.example.backendtemplate.config;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AppProperties.class)
public class ClockConfiguration {
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}

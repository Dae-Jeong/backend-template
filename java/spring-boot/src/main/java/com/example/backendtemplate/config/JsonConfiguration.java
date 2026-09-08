package com.example.backendtemplate.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

@Configuration(proxyBeanMethods = false)
public class JsonConfiguration {
    @Bean
    JsonMapperBuilderCustomizer strictTextInputs() {
        return builder -> builder.withCoercionConfig(LogicalType.Textual, config -> {
            for (var shape : new CoercionInputShape[]{CoercionInputShape.Integer, CoercionInputShape.Float,
                    CoercionInputShape.Boolean}) {
                config.setCoercion(shape, CoercionAction.Fail);
            }
        });
    }
}

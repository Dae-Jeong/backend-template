package com.example.backendtemplate.config;

import com.example.backendtemplate.dto.Problem;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {
    @Bean
    OpenApiCustomizer problems() {
        return api -> {
            ModelConverters.getInstance()
                    .readAll(Problem.class)
                    .forEach(api.getComponents()::addSchemas);
            api.getPaths().forEach((path, item) -> {
                if (!path.startsWith("/v1/")) {
                    return;
                }
                item.readOperations().forEach(operation -> {
                    var statuses = path.equals("/v1/reservations")
                            ? new String[]{"404", "405", "422", "500", "409", "503"}
                            : new String[]{"404", "405", "422", "500"};
                    for (String status : statuses) {
                        var schema = new Schema<>().$ref("#/components/schemas/Problem");
                        var content = new Content().addMediaType("application/problem+json", new MediaType().schema(schema));
                        var response = new ApiResponse().description("Problem Details").content(content);
                        operation.getResponses().addApiResponse(status, response);
                    }
                });
            });
        };
    }
}

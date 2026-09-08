package com.example.backendtemplate.config;

import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {
    @Bean
    OpenApiCustomizer problems() {
        return api -> api.getPaths().forEach((path, item) -> {
            if (!path.startsWith("/v1/")) return;
            item.readOperations().forEach(operation -> {
                for (String status : new String[]{"404", "405", "422", "500", "409", "503"}) {
                    operation.getResponses().addApiResponse(status, new ApiResponse().description("Problem Details")
                            .content(new Content().addMediaType("application/problem+json",
                                    new io.swagger.v3.oas.models.media.MediaType().schema(
                                            new Schema<>().type("object").addProperty("type", new Schema<>().type("string"))
                                                    .addProperty("title", new Schema<>().type("string"))
                                                    .addProperty("status", new Schema<>().type("integer"))
                                                    .addProperty("code", new Schema<>().type("string"))
                                                    .addProperty("request_id", new Schema<>().type("string"))))));
                }
            });
        });
    }
}

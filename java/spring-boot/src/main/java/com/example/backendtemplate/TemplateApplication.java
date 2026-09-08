package com.example.backendtemplate;

import java.util.Arrays;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TemplateApplication {

    public static void main(String[] args) {
        var application = new SpringApplication(TemplateApplication.class);
        boolean seed = Arrays.asList(args).contains("--seed");
        if (seed) {
            application.setAdditionalProfiles("seed");
            application.setWebApplicationType(WebApplicationType.NONE);
        }
        try {
            var context = application.run(args);
            if (seed) {
                context.close();
            }
        } catch (RuntimeException error) {
            LoggerFactory.getLogger(TemplateApplication.class).atError()
                    .addKeyValue("error.type", error.getClass().getName()).log("application.failed");
            System.exit(1);
        }
    }

}

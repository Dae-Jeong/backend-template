package com.example.backendtemplate.config;

import com.example.backendtemplate.observation.TransactionMetrics;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.orm.jpa.JpaTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile("!no-db")
@EnableConfigurationProperties(PoolProperties.class)
public class TransactionConfiguration {
    @Bean
    JpaTransactionManager transactionManager(EntityManagerFactory entityManagerFactory, TransactionMetrics metrics) {
        var manager = new JpaTransactionManager(entityManagerFactory);
        manager.setRollbackOnCommitFailure(true);
        manager.addListener(metrics);
        return manager;
    }
}

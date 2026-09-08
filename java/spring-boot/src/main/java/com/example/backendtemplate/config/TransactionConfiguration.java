package com.example.backendtemplate.config;

import com.example.backendtemplate.observation.TransactionMetrics;
import javax.sql.DataSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.support.JdbcTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile("!no-db")
@EnableConfigurationProperties(PoolProperties.class)
public class TransactionConfiguration {
    @Bean
    JdbcTransactionManager transactionManager(DataSource dataSource, TransactionMetrics metrics) {
        var manager = new JdbcTransactionManager(dataSource);
        manager.setRollbackOnCommitFailure(true);
        manager.addListener(metrics);
        return manager;
    }
}

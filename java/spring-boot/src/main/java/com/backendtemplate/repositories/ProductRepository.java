package com.backendtemplate.repositories;

import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends Repository<ProductEntity, String> {
    Optional<ProductEntity> findById(String id);
    boolean existsById(String id);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update ProductEntity p set p.available = p.available - 1 where p.id = :id and p.available > 0")
    int decreaseAvailableStock(@Param("id") String id);
}

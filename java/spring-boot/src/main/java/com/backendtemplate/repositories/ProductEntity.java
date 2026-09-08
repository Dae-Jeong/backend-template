package com.backendtemplate.repositories;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @Column(length = 64)
    private String id;
    @Column(nullable = false)
    private int available;

    protected ProductEntity() {}

    ProductEntity(String id, int available) {
        this.id = id;
        this.available = available;
    }

    public int available() {
        return available;
    }
}

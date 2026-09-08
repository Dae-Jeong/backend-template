package com.backendtemplate.repositories;

import java.util.Optional;
import org.springframework.data.repository.Repository;

interface ReservationReplayRepository extends Repository<ReservationReplayEntity, String> {
    Optional<ReservationReplayEntity> findByKey(String key);
}

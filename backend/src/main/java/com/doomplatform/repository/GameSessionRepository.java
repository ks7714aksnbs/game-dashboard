package com.doomplatform.repository;

import com.doomplatform.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
    Optional<GameSession> findByCode(String code);
    List<GameSession> findByStatusOrderByCreatedAtDesc(GameSession.GameStatus status);
    List<GameSession> findTop20ByOrderByCreatedAtDesc();
}

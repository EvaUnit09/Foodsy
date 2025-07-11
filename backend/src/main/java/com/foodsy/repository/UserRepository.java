package com.foodsy.repository;

import com.foodsy.domain.User;
import com.foodsy.domain.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmailOrUsername(String email, String username);
    
    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);
    
    Boolean existsByEmail(String email);
    
    Boolean existsByUsername(String username);
}
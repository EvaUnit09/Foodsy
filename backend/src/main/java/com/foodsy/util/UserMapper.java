package com.foodsy.util;

import com.foodsy.domain.User;
import com.foodsy.dto.UserDto;
import org.springframework.stereotype.Component;

/**
 * Utility class for mapping User entities to DTOs
 * Eliminates duplicate conversion logic across controllers
 */
@Component
public class UserMapper {
    
    /**
     * Converts a User entity to UserDto
     * @param user the User entity to convert
     * @return UserDto representation of the user
     */
    public static UserDto toDto(User user) {
        if (user == null) {
            return null;
        }
        
        return new UserDto(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getDisplayName(),
            user.getAvatarUrl(),
            user.getProvider(),
            user.isEmailVerified(),
            user.getCreatedAt()
        );
    }
}
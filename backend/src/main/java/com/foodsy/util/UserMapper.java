package com.foodsy.util;

import com.foodsy.domain.User;
import com.foodsy.dto.UserDto;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

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
            user.getCustomAvatarUrl(),
            user.getEffectiveAvatarUrl(),
            user.getHomeBorough(),
            user.getHomeNeighborhood(),
            user.getProvider(),
            user.isEmailVerified(),
            user.getCreatedAt()
        );
    }
}

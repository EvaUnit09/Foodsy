package com.foodiefriends.backend.example.session;
import java.util.Random;


public class JoinCodeGenerator {
    private static final Random RANDOM = new Random();

   public static String generate() {
       int number = RANDOM.nextInt(1_000_000);
       return String.format("%06d", number); // Ensures leading zeros is ok

   }
}

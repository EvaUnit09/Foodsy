package com.foodsy.example.session;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class JoinCodeGeneratorTest {

    @Test
    void generates6DigitCode() {
        String code = JoinCodeGenerator.generate();
        assertTrue(code.matches("\\d{6}"));
    }
}

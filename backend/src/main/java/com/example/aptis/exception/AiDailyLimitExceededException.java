package com.example.aptis.exception;

public class AiDailyLimitExceededException extends RuntimeException {
    public AiDailyLimitExceededException(String message) {
        super(message);
    }
}

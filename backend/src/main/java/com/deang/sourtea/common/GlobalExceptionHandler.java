package com.deang.sourtea.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException exception) {
        return response(exception.getStatus(), exception.getMessage());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception exception) {
        return response(HttpStatus.BAD_REQUEST, "请求参数不正确");
    }

    private ResponseEntity<ApiResponse<Void>> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ApiResponse.fail(status.value(), message));
    }
}

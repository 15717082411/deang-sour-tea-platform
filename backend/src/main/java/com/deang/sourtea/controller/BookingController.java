package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Booking;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin
public class BookingController {
    private final PlatformStore store;

    public BookingController(PlatformStore store) {
        this.store = store;
    }

    @GetMapping
    public ApiResponse<List<Booking>> list() {
        return ApiResponse.ok(store.listBookings());
    }

    @PostMapping
    public ApiResponse<Booking> create(@RequestBody Map<String, String> body) {
        Booking booking = store.createBooking(
            LocalDate.parse(body.get("date")),
            Integer.parseInt(body.getOrDefault("peopleCount", "1")),
            body.getOrDefault("phone", "")
        );
        return ApiResponse.ok(booking);
    }

    @PostMapping("/verify")
    public ApiResponse<Booking> verify(@RequestBody Map<String, String> body) {
        return store.verifyBooking(body.get("code"))
            .map(ApiResponse::ok)
            .orElseGet(() -> ApiResponse.fail("verify code not found"));
    }
}

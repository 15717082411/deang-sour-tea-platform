package com.deang.sourtea;

import com.deang.sourtea.model.Role;
import com.deang.sourtea.security.AuthenticatedUser;
import com.deang.sourtea.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BackendAuthorizationIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Test
    void orderCreationAndListingAreBoundToAuthenticatedUser() throws Exception {
        String firstUser = token(101L, "first_user", Role.USER, null);
        String secondUser = token(102L, "second_user", Role.USER, null);

        createOrder(firstUser)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").value(101));
        createOrder(secondUser)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").value(102));

        mockMvc.perform(get("/api/orders").header("Authorization", bearer(firstUser)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.data[*].userId", everyItem(is(101))));
        mockMvc.perform(get("/api/orders").header("Authorization", bearer(secondUser)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.data[*].userId", everyItem(is(102))));
    }

    @Test
    void bookingCreationAndListingAreBoundToAuthenticatedUser() throws Exception {
        String firstUser = token(201L, "first_booking_user", Role.USER, null);
        String secondUser = token(202L, "second_booking_user", Role.USER, null);

        createBooking(firstUser)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").value(201));
        createBooking(secondUser)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").value(202));

        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(firstUser)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.data[*].userId", everyItem(is(201))));
        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(secondUser)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.data[*].userId", everyItem(is(202))));
    }

    @Test
    void productMerchantIdComesFromAuthenticatedMerchant() throws Exception {
        String merchant = token(2L, "merchant_demo", Role.MERCHANT, 1L);

        mockMvc.perform(post("/api/products")
                .header("Authorization", bearer(merchant))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "merchantId": 999,
                      "name": "归属约束测试商品",
                      "category": "测试",
                      "price": 12.30,
                      "stock": 1,
                      "status": "APPROVED"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.merchantId").value(1))
            .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void userCannotShipOrdersOrVerifyBookings() throws Exception {
        String user = token(301L, "ordinary_user", Role.USER, null);

        mockMvc.perform(post("/api/orders/1/ship").header("Authorization", bearer(user)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value(403));
        mockMvc.perform(post("/api/bookings/verify")
                .header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"TEA-UNKNOWN\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    void unlistedOrderAndBookingMethodsFailClosed() throws Exception {
        String user = token(302L, "method_user", Role.USER, null);

        mockMvc.perform(delete("/api/orders/1").header("Authorization", bearer(user)))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/bookings/1")
                .header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void merchantCannotReadUserCollectionsAndShipmentFailsClosed() throws Exception {
        String merchant = token(2L, "merchant_demo", Role.MERCHANT, 1L);

        mockMvc.perform(get("/api/orders").header("Authorization", bearer(merchant)))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(merchant)))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/orders/1/ship").header("Authorization", bearer(merchant)))
            .andExpect(status().isForbidden());
    }

    @Test
    void adminCanVerifyBooking() throws Exception {
        String user = token(401L, "verification_user", Role.USER, null);
        String bookingBody = createBooking(user)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode booking = objectMapper.readTree(bookingBody).path("data");
        String admin = token(3L, "admin_demo", Role.ADMIN, null);

        mockMvc.perform(post("/api/bookings/verify")
                .header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new VerifyRequest(booking.path("verifyCode").asText()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(booking.path("id").asLong()))
            .andExpect(jsonPath("$.data.status").value("VERIFIED"));
    }

    private org.springframework.test.web.servlet.ResultActions createOrder(String token) throws Exception {
        return mockMvc.perform(post("/api/orders")
            .header("Authorization", bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"productIds\":[1]}"));
    }

    private org.springframework.test.web.servlet.ResultActions createBooking(String token) throws Exception {
        return mockMvc.perform(post("/api/bookings")
            .header("Authorization", bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"date":"2026-08-01","peopleCount":"2","phone":"13800000000"}
                """));
    }

    private String token(Long userId, String username, Role role, Long merchantId) {
        return jwtService.createToken(new AuthenticatedUser(userId, username, role, merchantId));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private record VerifyRequest(String code) {
    }
}

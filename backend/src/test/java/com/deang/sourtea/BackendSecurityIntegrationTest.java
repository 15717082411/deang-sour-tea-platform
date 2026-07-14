package com.deang.sourtea;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BackendSecurityIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginDerivesUserIdentityFromCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"merchant_demo","password":"Demo123!"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.userId").value(2))
            .andExpect(jsonPath("$.data.role").value("MERCHANT"))
            .andExpect(jsonPath("$.data.merchantId").value(1));
    }

    @Test
    void loginRejectsRequestedRole() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"user_demo","password":"Demo123!","role":"ADMIN"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void loginRejectsInvalidCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"admin_demo","password":"wrong-password"}
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void publicCatalogOnlyExposesApprovedProductsAndPublishedContents() throws Exception {
        mockMvc.perform(get("/api/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].status", everyItem(is("APPROVED"))))
            .andExpect(jsonPath("$.data[*].id", everyItem(not(is(3)))));

        mockMvc.perform(get("/api/contents"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].status", everyItem(is("PUBLISHED"))));
    }

    @Test
    void userCannotAccessAdminEndpoint() throws Exception {
        String token = login("user_demo");

        mockMvc.perform(post("/api/admin/products/3/approve")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void missingTokenReturnsEnvelopeUnauthorized() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value(401))
            .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void adminTokenCarriesRoleUsedBySecurityContext() throws Exception {
        String token = login("admin_demo");

        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0));
    }

    private String login(String username) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginBody(username, "Demo123!"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode response = objectMapper.readTree(body);
        return response.path("data").path("token").asText();
    }

    private record LoginBody(String username, String password) {
    }
}

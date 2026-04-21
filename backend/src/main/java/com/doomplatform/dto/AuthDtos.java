package com.doomplatform.dto;

import jakarta.validation.constraints.*;

public class AuthDtos {

    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 30) private String username;
        @NotBlank @Email                   private String email;
        @NotBlank @Size(min = 6, max = 100) private String password;

        public RegisterRequest() {}
        public String getUsername() { return username; }
        public String getEmail()    { return email; }
        public String getPassword() { return password; }
        public void setUsername(String v) { this.username = v; }
        public void setEmail(String v)    { this.email = v; }
        public void setPassword(String v) { this.password = v; }
    }

    public static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;

        public LoginRequest() {}
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        public void setUsername(String v) { this.username = v; }
        public void setPassword(String v) { this.password = v; }
    }

    public static class AuthResponse {
        private String token;
        private String username;
        private Long   userId;

        public AuthResponse() {}
        public String getToken()    { return token; }
        public String getUsername() { return username; }
        public Long   getUserId()   { return userId; }

        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private final AuthResponse r = new AuthResponse();
            public Builder token(String v)    { r.token    = v; return this; }
            public Builder username(String v) { r.username = v; return this; }
            public Builder userId(Long v)     { r.userId   = v; return this; }
            public AuthResponse build()       { return r; }
        }
    }
}

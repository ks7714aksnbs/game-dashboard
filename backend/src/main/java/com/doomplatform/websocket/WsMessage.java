package com.doomplatform.websocket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class WsMessage {
    private String type;
    private String sessionCode;
    private String username;
    private Object payload;

    public WsMessage() {}

    public String getType()        { return type; }
    public String getSessionCode() { return sessionCode; }
    public String getUsername()    { return username; }
    public Object getPayload()     { return payload; }
    public void setType(String v)        { this.type = v; }
    public void setSessionCode(String v) { this.sessionCode = v; }
    public void setUsername(String v)    { this.username = v; }
    public void setPayload(Object v)     { this.payload = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final WsMessage m = new WsMessage();
        public Builder type(String v)        { m.type        = v; return this; }
        public Builder sessionCode(String v) { m.sessionCode = v; return this; }
        public Builder username(String v)    { m.username    = v; return this; }
        public Builder payload(Object v)     { m.payload     = v; return this; }
        public WsMessage build()             { return m; }
    }
}

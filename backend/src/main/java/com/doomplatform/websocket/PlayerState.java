package com.doomplatform.websocket;

public class PlayerState {
    private String  username;
    private double  x;
    private double  y;
    private double  angle;
    private int     health;
    private int     score;
    private int     kills;
    private boolean shooting;
    private long    timestamp;

    public PlayerState() {}

    public String  getUsername()  { return username; }
    public double  getX()         { return x; }
    public double  getY()         { return y; }
    public double  getAngle()     { return angle; }
    public int     getHealth()    { return health; }
    public int     getScore()     { return score; }
    public int     getKills()     { return kills; }
    public boolean isShooting()   { return shooting; }
    public long    getTimestamp() { return timestamp; }

    public void setUsername(String v)  { this.username  = v; }
    public void setX(double v)         { this.x         = v; }
    public void setY(double v)         { this.y         = v; }
    public void setAngle(double v)     { this.angle     = v; }
    public void setHealth(int v)       { this.health    = v; }
    public void setScore(int v)        { this.score     = v; }
    public void setKills(int v)        { this.kills     = v; }
    public void setShooting(boolean v) { this.shooting  = v; }
    public void setTimestamp(long v)   { this.timestamp = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final PlayerState p = new PlayerState();
        public Builder username(String v)  { p.username  = v; return this; }
        public Builder x(double v)         { p.x         = v; return this; }
        public Builder y(double v)         { p.y         = v; return this; }
        public Builder angle(double v)     { p.angle     = v; return this; }
        public Builder health(int v)       { p.health    = v; return this; }
        public Builder score(int v)        { p.score     = v; return this; }
        public Builder kills(int v)        { p.kills     = v; return this; }
        public Builder shooting(boolean v) { p.shooting  = v; return this; }
        public Builder timestamp(long v)   { p.timestamp = v; return this; }
        public PlayerState build()         { return p; }
    }
}

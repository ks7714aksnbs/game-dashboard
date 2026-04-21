# Build backend
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/ .
RUN mvn clean package -DskipTests

# Build frontend
FROM node:22 AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Final image
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy backend jar
COPY --from=build /app/target/*.jar app.jar

# Copy frontend build into static resources
COPY --from=frontend-build /app/dist /app/static

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

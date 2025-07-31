FROM eclipse-temurin:21-jdk as builder
WORKDIR /app
COPY gradle gradle
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY src src
RUN ./gradlew build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
# Copy the specific JAR file
COPY --from=builder /app/build/libs/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

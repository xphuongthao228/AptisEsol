FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B clean package -DskipTests
# Fail the deployment if the discount API is missing from the packaged application.
RUN jar tf target/aptis-esol-0.0.1-SNAPSHOT.jar | grep -q 'BOOT-INF/classes/com/example/aptis/controller/DiscountController.class'

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/aptis-esol-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

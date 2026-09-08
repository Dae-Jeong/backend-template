ARG JAVA_VERSION
FROM eclipse-temurin:${JAVA_VERSION}-jdk-noble AS build
ARG JAVA_VERSION
WORKDIR /build
COPY . .
RUN test "$(cat .java-version)" = "$JAVA_VERSION" && ./gradlew bootJar --no-daemon --console=plain

FROM eclipse-temurin:${JAVA_VERSION}-jre-noble
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app \
    && mkdir -p /app/data && chown -R app:app /app
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/build/libs/backend-template-0.0.1-SNAPSHOT.jar /app/app.jar
USER 10001:10001
ENV SERVER_HOST=0.0.0.0 SERVER_PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD curl --fail --silent "http://127.0.0.1:${SERVER_PORT}/health/ready" || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# Spring Boot Backend Template

Status: 구현 진행 중 · 2026-09-08

공식 Spring Initializr API로 Java 21, Spring Boot 4.1.1, Gradle Kotlin DSL 프로젝트를 생성했습니다.
생성된 Gradle Wrapper는 9.7.1입니다. 전역 Gradle 설치는 필요하지 않습니다.

```sh
cd java/spring-boot
./gradlew test bootJar --no-daemon
```

선택 근거: [Initializr metadata](https://start.spring.io),
[Boot 요구사항](https://docs.spring.io/spring-boot/system-requirements.html),
[Springdoc](https://springdoc.org/), [H2 연결 모드](https://www.h2database.com/html/features.html#connection_modes).
최초 생성에는 web, validation, actuator, prometheus, jdbc, h2, flyway를 선택했습니다.
생성된 HELP.md·Wrapper·기본 테스트를 보존하고 필요한 프로젝트 설정만 변경합니다.

실행과 저장·검증 가이드는 각 단계의 실제 검증 후 이 문서에 추가합니다.

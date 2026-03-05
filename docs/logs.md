:: Spring Boot ::                (v3.5.0)

2025-08-06T16:35:26.521Z  INFO 1 --- [backend] [           main] com.foodsy.BackendApplication            : Starting BackendApplication v0.0.1-SNAPSHOT using Java 21.0.8 with PID 1 (/app/app.jar started by root in /app)
2025-08-06T16:35:26.529Z  INFO 1 --- [backend] [           main] com.foodsy.BackendApplication            : The following 1 profile is active: "prod"
2025-08-06T16:35:28.553Z  INFO 1 --- [backend] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data JPA repositories in DEFAULT mode.
2025-08-06T16:35:28.728Z  INFO 1 --- [backend] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 159 ms. Found 10 JPA repository interfaces.
2025-08-06T16:35:30.221Z  INFO 1 --- [backend] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8080 (http)
2025-08-06T16:35:30.256Z  INFO 1 --- [backend] [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2025-08-06T16:35:30.257Z  INFO 1 --- [backend] [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/10.1.41]
2025-08-06T16:35:30.313Z  INFO 1 --- [backend] [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2025-08-06T16:35:30.314Z  INFO 1 --- [backend] [           main] w.s.c.ServletWebServerApplicationContext : Root WebApplicationContext: initialization completed in 3633 ms
2025-08-06T16:35:30.695Z  INFO 1 --- [backend] [           main] o.hibernate.jpa.internal.util.LogHelper  : HHH000204: Processing PersistenceUnitInfo [name: default]
2025-08-06T16:35:30.851Z  INFO 1 --- [backend] [           main] org.hibernate.Version                    : HHH000412: Hibernate ORM core version 6.6.15.Final
2025-08-06T16:35:30.912Z  INFO 1 --- [backend] [           main] o.h.c.internal.RegionFactoryInitiator    : HHH000026: Second-level cache disabled
2025-08-06T16:35:31.401Z  INFO 1 --- [backend] [           main] o.s.o.j.p.SpringPersistenceUnitInfo      : No LoadTimeWeaver setup: ignoring JPA class transformer
2025-08-06T16:35:31.451Z  INFO 1 --- [backend] [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
2025-08-06T16:35:32.318Z  INFO 1 --- [backend] [           main] com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@3b66ac74
2025-08-06T16:35:32.321Z  INFO 1 --- [backend] [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
2025-08-06T16:35:32.369Z  WARN 1 --- [backend] [           main] org.hibernate.orm.deprecation            : HHH90000025: PostgreSQLDialect does not need to be specified explicitly using 'hibernate.dialect' (remove the property setting and it will be selected by default)
2025-08-06T16:35:32.403Z  INFO 1 --- [backend] [           main] org.hibernate.orm.connections.pooling    : HHH10001005: Database info:
        Database JDBC URL [Connecting through datasource 'HikariDataSource (HikariPool-1)']
        Database driver: undefined/unknown
        Database version: 17.4
        Autocommit mode: undefined/unknown
        Isolation level: undefined/unknown
        Minimum pool size: undefined/unknown
        Maximum pool size: undefined/unknown
2025-08-06T16:35:34.741Z  INFO 1 --- [backend] [           main] o.h.e.t.j.p.i.JtaPlatformInitiator       : HHH000489: No JTA platform available (set 'hibernate.transaction.jta.platform' to enable JTA platform integration)
2025-08-06T16:35:34.842Z  INFO 1 --- [backend] [           main] j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
SecurityConfig initialized with OAuth2UserService: com.foodsy.service.OAuth2UserService@46374b8
SecurityConfig initialized with JwtService: com.foodsy.service.JwtService@54626326
SecurityConfig initialized with CookieUtil: com.foodsy.util.CookieUtil@3a8cc099
2025-08-06T16:35:35.811Z  INFO 1 --- [backend] [           main] o.s.d.j.r.query.QueryEnhancerFactory     : Hibernate is in classpath; If applicable, HQL parser will be used.
2025-08-06T16:35:39.940Z  WARN 1 --- [backend] [           main] JpaBaseConfiguration$JpaWebConfiguration : spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning
Configuring SecurityFilterChain...
Configuring session management with IF_REQUIRED policy
Configuring authorization rules...
Authorization rules configured
Configuring OAuth2 login with defaults...
Configuring userInfo endpoint with: com.foodsy.service.OAuth2UserService@46374b8
OAuth2 login configured successfully
SecurityFilterChain configuration completed
2025-08-06T16:35:41.201Z  INFO 1 --- [backend] [           main] o.s.m.s.b.SimpleBrokerMessageHandler     : Starting...
2025-08-06T16:35:41.202Z  INFO 1 --- [backend] [           main] o.s.m.s.b.SimpleBrokerMessageHandler     : BrokerAvailabilityEvent[available=true, SimpleBrokerMessageHandler [org.springframework.messaging.simp.broker.DefaultSubscriptionRegistry@31b4d17a]]
2025-08-06T16:35:41.204Z  INFO 1 --- [backend] [           main] o.s.m.s.b.SimpleBrokerMessageHandler     : Started.
2025-08-06T16:35:41.230Z  INFO 1 --- [backend] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8080 (http) with context path '/'
2025-08-06T16:35:41.253Z  INFO 1 --- [backend] [           main] com.foodsy.BackendApplication            : Started BackendApplication in 16.226 seconds (process running for 17.786)
2025-08-06T16:36:21.965Z  INFO 1 --- [backend] [nio-8080-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
2025-08-06T16:36:28.610Z DEBUG 1 --- [backend] [nio-8080-exec-3] .s.o.c.w.OAuth2LoginAuthenticationFilter : Set SecurityContextHolder to OAuth2AuthenticationToken [Principal=Name: [102990268683931574563], Granted Authorities: [[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]], User Attributes: [{at_hash=cbSqE2z8aQthK0Qka7EPRg, sub=102990268683931574563, email_verified=true, iss=https://accounts.google.com, given_name=noah, nonce=udviDUox89ohJ6ssXxAr8mVD5q2x_t3dg_7inpv2S0s, picture=https://lh3.googleusercontent.com/a/ACg8ocKGSyrILNZFDPoo7vAiTatlBAtXbsjCOKbmElYxo2tJNjcOs7hh=s96-c, aud=[465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com], azp=465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com, name=noah decaille, exp=2025-08-06T17:36:28Z, family_name=decaille, iat=2025-08-06T16:36:28Z, email=noahdecaille@gmail.com}], Credentials=[PROTECTED], Authenticated=true, Details=WebAuthenticationDetails [RemoteIpAddress=128.177.21.109, SessionId=2BB68C1F4A2F8313CE56E5A9EE47E69B], Granted Authorities=[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]]
=== OAuth2SuccessHandler.onAuthenticationSuccess called ===
Request URI: /login/oauth2/code/google
Authentication: OAuth2AuthenticationToken [Principal=Name: [102990268683931574563], Granted Authorities: [[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]], User Attributes: [{at_hash=cbSqE2z8aQthK0Qka7EPRg, sub=102990268683931574563, email_verified=true, iss=https://accounts.google.com, given_name=noah, nonce=udviDUox89ohJ6ssXxAr8mVD5q2x_t3dg_7inpv2S0s, picture=https://lh3.googleusercontent.com/a/ACg8ocKGSyrILNZFDPoo7vAiTatlBAtXbsjCOKbmElYxo2tJNjcOs7hh=s96-c, aud=[465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com], azp=465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com, name=noah decaille, exp=2025-08-06T17:36:28Z, family_name=decaille, iat=2025-08-06T16:36:28Z, email=noahdecaille@gmail.com}], Credentials=[PROTECTED], Authenticated=true, Details=WebAuthenticationDetails [RemoteIpAddress=128.177.21.109, SessionId=2BB68C1F4A2F8313CE56E5A9EE47E69B], Granted Authorities=[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]]
OidcUser: Name: [102990268683931574563], Granted Authorities: [[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]], User Attributes: [{at_hash=cbSqE2z8aQthK0Qka7EPRg, sub=102990268683931574563, email_verified=true, iss=https://accounts.google.com, given_name=noah, nonce=udviDUox89ohJ6ssXxAr8mVD5q2x_t3dg_7inpv2S0s, picture=https://lh3.googleusercontent.com/a/ACg8ocKGSyrILNZFDPoo7vAiTatlBAtXbsjCOKbmElYxo2tJNjcOs7hh=s96-c, aud=[465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com], azp=465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com, name=noah decaille, exp=2025-08-06T17:36:28Z, family_name=decaille, iat=2025-08-06T16:36:28Z, email=noahdecaille@gmail.com}]
User email: noahdecaille@gmail.com
User name: 102990268683931574563
Generated access token: eyJhbGciOiJIUzI1NiJ9...
Generated refresh token: eyJhbGciOiJIUzI1NiJ9...
Redirecting to: https://foodsy-frontend.vercel.app/auth/oauth2/success?username=102990268683931574563
OAuth2 authentication successful for user: noahdecaille@gmail.com
2025-08-06T16:36:48.547Z DEBUG 1 --- [backend] [nio-8080-exec-8] .s.o.c.w.OAuth2LoginAuthenticationFilter : Set SecurityContextHolder to OAuth2AuthenticationToken [Principal=Name: [102990268683931574563], Granted Authorities: [[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]], User Attributes: [{at_hash=fBQVIqlTvJU7XS6justaPg, sub=102990268683931574563, email_verified=true, iss=https://accounts.google.com, given_name=noah, nonce=UaU2rrzgNxMwfKQzULiqrWA4-hwNo5b0de18VQ6XYSQ, picture=https://lh3.googleusercontent.com/a/ACg8ocKGSyrILNZFDPoo7vAiTatlBAtXbsjCOKbmElYxo2tJNjcOs7hh=s96-c, aud=[465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com], azp=465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com, name=noah decaille, exp=2025-08-06T17:36:48Z, family_name=decaille, iat=2025-08-06T16:36:48Z, email=noahdecaille@gmail.com}], Credentials=[PROTECTED], Authenticated=true, Details=WebAuthenticationDetails [RemoteIpAddress=128.177.21.109, SessionId=3BE28A405F98574DAEC216B99B0A11E3], Granted Authorities=[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]]
=== OAuth2SuccessHandler.onAuthenticationSuccess called ===
Request URI: /login/oauth2/code/google
Authentication: OAuth2AuthenticationToken [Principal=Name: [102990268683931574563], Granted Authorities: [[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]], User Attributes: [{at_hash=fBQVIqlTvJU7XS6justaPg, sub=102990268683931574563, email_verified=true, iss=https://accounts.google.com, given_name=noah, nonce=UaU2rrzgNxMwfKQzULiqrWA4-hwNo5b0de18VQ6XYSQ, picture=https://lh3.googleusercontent.com/a/ACg8ocKGSyrILNZFDPoo7vAiTatlBAtXbsjCOKbmElYxo2tJNjcOs7hh=s96-c, aud=[465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com], azp=465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com, name=noah decaille, exp=2025-08-06T17:36:48Z, family_name=decaille, iat=2025-08-06T16:36:48Z, email=noahdecaille@gmail.com}], Credentials=[PROTECTED], Authenticated=true, Details=WebAuthenticationDetails [RemoteIpAddress=128.177.21.109, SessionId=3BE28A405F98574DAEC216B99B0A11E3], Granted Authorities=[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]]
OidcUser: Name: [102990268683931574563], Granted Authorities: [[OIDC_USER, SCOPE_https://www.googleapis.com/auth/userinfo.email, SCOPE_https://www.googleapis.com/auth/userinfo.profile, SCOPE_openid]], User Attributes: [{at_hash=fBQVIqlTvJU7XS6justaPg, sub=102990268683931574563, email_verified=true, iss=https://accounts.google.com, given_name=noah, nonce=UaU2rrzgNxMwfKQzULiqrWA4-hwNo5b0de18VQ6XYSQ, picture=https://lh3.googleusercontent.com/a/ACg8ocKGSyrILNZFDPoo7vAiTatlBAtXbsjCOKbmElYxo2tJNjcOs7hh=s96-c, aud=[465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com], azp=465246468124-k9u0h8pl8ak17ss6rj84gq9tis1s81jr.apps.googleusercontent.com, name=noah decaille, exp=2025-08-06T17:36:48Z, family_name=decaille, iat=2025-08-06T16:36:48Z, email=noahdecaille@gmail.com}]
User email: noahdecaille@gmail.com
User name: 102990268683931574563
Generated access token: eyJhbGciOiJIUzI1NiJ9...
Generated refresh token: eyJhbGciOiJIUzI1NiJ9...
Redirecting to: https://foodsy-frontend.vercel.app/auth/oauth2/success?username=102990268683931574563
OAuth2 authentication successful for user: noahdecaille@gmail.com

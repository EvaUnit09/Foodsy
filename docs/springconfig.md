# Core Configuration

## Spring Boot Sample

Spring Boot brings full auto-configuration capabilities for OAuth 2.0 Login.

This section shows how to configure the [**OAuth 2.0 Login sample**](https://github.com/spring-projects/spring-security-samples/tree/6.5.x/servlet/spring-boot/java/oauth2/login) by using *Google* as the *Authentication Provider* and covers the following topics:

- [Initial Setup](#oauth2login-sample-initial-setup)
    
- [Setting the Redirect URI](#oauth2login-sample-redirect-uri)
    
- [Configure application.yml](#oauth2login-sample-application-config)
    
- [Boot up the Application](#oauth2login-sample-boot-application)
    

### Initial Setup

To use Google’s OAuth 2.0 authentication system for login, you must set up a project in the Google API Console to obtain OAuth 2.0 credentials.

|     |     |
| --- | --- |
|     | [Google’s OAuth 2.0 implementation](https://developers.google.com/identity/protocols/OpenIDConnect) for authentication conforms to the [OpenID Connect 1.0](https://openid.net/connect/) specification and is [OpenID certified](https://openid.net/certification/). |

Follow the instructions on the [OpenID Connect](https://developers.google.com/identity/protocols/OpenIDConnect) page, starting in the “Setting up OAuth 2.0” section.

After completing the “Obtain OAuth 2.0 credentials” instructions, you should have new OAuth Client with credentials consisting of a Client ID and a Client Secret.

### Setting the Redirect URI

The redirect URI is the path in the application that the end-user’s user-agent is redirected back to after they have authenticated with Google and have granted access to the OAuth Client ([created in the previous step](#oauth2login-sample-initial-setup)) on the Consent page.

In the “Set a redirect URI” subsection, ensure that the **Authorized redirect URIs** field is set to `[localhost:8080/login/oauth2/code/google](http://localhost:8080/login/oauth2/code/google)`.

|     |     |
| --- | --- |
|     | The default redirect URI template is `{baseUrl}/login/oauth2/code/{registrationId}`. The `registrationId` is a unique identifier for the [`ClientRegistration`](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/../client/index.html#oauth2Client-client-registration). |

|     |     |
| --- | --- |
|     | If the OAuth Client runs behind a proxy server, you should check the [Proxy Server Configuration](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/../../../features/exploits/http.html#http-proxy-server) to ensure the application is correctly configured. Also, see the supported [`URI` template variables](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/../client/authorization-grants.html#oauth2Client-auth-code-redirect-uri) for `redirect-uri`. |

### Configure application.yml

Now that you have a new OAuth Client with Google, you need to configure the application to use the OAuth Client for the *authentication flow*. To do so:

1.  Go to `application.yml` and set the following configuration:
    
    ```
    spring:
      security:
        oauth2:
          client:
            registration:	
              google:	
                client-id: google-client-id
                client-secret: google-client-secret
    ```
    
    OAuth Client properties
    
    |     |     |
    | --- | --- |
    |     | `spring.security.oauth2.client.registration` is the base property prefix for OAuth Client properties. |
    |     | Following the base property prefix is the ID for the [`ClientRegistration`](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/../client/index.html#oauth2Client-client-registration), such as Google. |
    
2.  Replace the values in the `client-id` and `client-secret` property with the OAuth 2.0 credentials you created earlier.
    

### Boot up the Application

Launch the Spring Boot sample and go to `[localhost:8080](http://localhost:8080)`. You are then redirected to the default *auto-generated* login page, which displays a link for Google.

Click on the Google link, and you are then redirected to Google for authentication.

After authenticating with your Google account credentials, you see the Consent screen. The Consent screen asks you to either allow or deny access to the OAuth Client you created earlier. Click **Allow** to authorize the OAuth Client to access your email address and basic profile information.

At this point, the OAuth Client retrieves your email address and basic profile information from the [UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) and establishes an authenticated session.

## Spring Boot Property Mappings

The following table outlines the mapping of the Spring Boot OAuth Client properties to the [ClientRegistration](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/../client/index.html#oauth2Client-client-registration) properties.

| Spring Boot | ClientRegistration |
| --- | --- |
| `spring.security.oauth2.client.registration.[registrationId]` | `registrationId` |
| `spring.security.oauth2.client.registration.[registrationId].client-id` | `clientId` |
| `spring.security.oauth2.client.registration.[registrationId].client-secret` | `clientSecret` |
| `spring.security.oauth2.client.registration.[registrationId].client-authentication-method` | `clientAuthenticationMethod` |
| `spring.security.oauth2.client.registration.[registrationId].authorization-grant-type` | `authorizationGrantType` |
| `spring.security.oauth2.client.registration.[registrationId].redirect-uri` | `redirectUri` |
| `spring.security.oauth2.client.registration.[registrationId].scope` | `scopes` |
| `spring.security.oauth2.client.registration.[registrationId].client-name` | `clientName` |
| `spring.security.oauth2.client.provider.[providerId].authorization-uri` | `providerDetails.authorizationUri` |
| `spring.security.oauth2.client.provider.[providerId].token-uri` | `providerDetails.tokenUri` |
| `spring.security.oauth2.client.provider.[providerId].jwk-set-uri` | `providerDetails.jwkSetUri` |
| `spring.security.oauth2.client.provider.[providerId].issuer-uri` | `providerDetails.issuerUri` |
| `spring.security.oauth2.client.provider.[providerId].user-info-uri` | `providerDetails.userInfoEndpoint.uri` |
| `spring.security.oauth2.client.provider.[providerId].user-info-authentication-method` | `providerDetails.userInfoEndpoint.authenticationMethod` |
| `spring.security.oauth2.client.provider.[providerId].user-name-attribute` | `providerDetails.userInfoEndpoint.userNameAttributeName` |

|     |     |
| --- | --- |
|     | You can initially configure a `ClientRegistration` by using discovery of an OpenID Connect Provider’s [Configuration endpoint](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig) or an Authorization Server’s [Metadata endpoint](https://tools.ietf.org/html/rfc8414#section-3), by specifying the `spring.security.oauth2.client.provider.[providerId].issuer-uri` property. |

## CommonOAuth2Provider

`CommonOAuth2Provider` pre-defines a set of default client properties for a number of well known providers: Google, GitHub, Facebook, and Okta.

For example, the `authorization-uri`, `token-uri`, and `user-info-uri` do not change often for a provider. Therefore, it makes sense to provide default values, to reduce the required configuration.

As demonstrated previously, when we [configured a Google client](#oauth2login-sample-application-config), only the `client-id` and `client-secret` properties are required.

The following listing shows an example:

```
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: google-client-id
            client-secret: google-client-secret
```

|     |     |
| --- | --- |
|     | The auto-defaulting of client properties works seamlessly here because the `registrationId` (`google`) matches the `GOOGLE` `enum` (case-insensitive) in `CommonOAuth2Provider`. |

For cases where you may want to specify a different `registrationId`, such as `google-login`, you can still leverage auto-defaulting of client properties by configuring the `provider` property.

The following listing shows an example:

```
spring:
  security:
    oauth2:
      client:
        registration:
          google-login:	
            provider: google	
            client-id: google-client-id
            client-secret: google-client-secret
```

|     |     |
| --- | --- |
|     | The `registrationId` is set to `google-login`. |
|     | The `provider` property is set to `google`, which will leverage the auto-defaulting of client properties set in `CommonOAuth2Provider.GOOGLE.getBuilder()`. |

## Configuring Custom Provider Properties

There are some OAuth 2.0 Providers that support multi-tenancy, which results in different protocol endpoints for each tenant (or sub-domain).

For example, an OAuth Client registered with Okta is assigned to a specific sub-domain and have their own protocol endpoints.

For these cases, Spring Boot provides the following base property for configuring custom provider properties: `spring.security.oauth2.client.provider.[providerId]`.

The following listing shows an example:

```
spring:
  security:
    oauth2:
      client:
        registration:
          okta:
            client-id: okta-client-id
            client-secret: okta-client-secret
        provider:
          okta:	
            authorization-uri: https://your-subdomain.oktapreview.com/oauth2/v1/authorize
            token-uri: https://your-subdomain.oktapreview.com/oauth2/v1/token
            user-info-uri: https://your-subdomain.oktapreview.com/oauth2/v1/userinfo
            user-name-attribute: sub
            jwk-set-uri: https://your-subdomain.oktapreview.com/oauth2/v1/keys
```

|     |     |
| --- | --- |
|     | The base property (`spring.security.oauth2.client.provider.okta`) allows for custom configuration of protocol endpoint locations. |

## Overriding Spring Boot Auto-configuration

The Spring Boot auto-configuration class for OAuth Client support is `OAuth2ClientAutoConfiguration`.

It performs the following tasks:

- Registers a `ClientRegistrationRepository` `@Bean` composed of `ClientRegistration`(s) from the configured OAuth Client properties.
    
- Registers a `SecurityFilterChain` `@Bean` and enables OAuth 2.0 Login through `httpSecurity.oauth2Login()`.
    

If you need to override the auto-configuration based on your specific requirements, you may do so in the following ways:

- [Register a ClientRegistrationRepository @Bean](#oauth2login-register-clientregistrationrepository-bean)
    
- [Register a SecurityFilterChain @Bean](#oauth2login-provide-securityfilterchain-bean)
    
- [Completely Override the Auto-configuration](#oauth2login-completely-override-autoconfiguration)
    

### Register a ClientRegistrationRepository @Bean

The following example shows how to register a `ClientRegistrationRepository` `@Bean`:

- Java
    
- Kotlin
    

```
@Configuration
public class OAuth2LoginConfig {

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(this.googleClientRegistration());
    }

    private ClientRegistration googleClientRegistration() {
        return ClientRegistration.withRegistrationId("google")
            .clientId("google-client-id")
            .clientSecret("google-client-secret")
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope("openid", "profile", "email", "address", "phone")
            .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
            .tokenUri("https://www.googleapis.com/oauth2/v4/token")
            .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
            .userNameAttributeName(IdTokenClaimNames.SUB)
            .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
            .clientName("Google")
            .build();
    }
}
```

### Register a SecurityFilterChain @Bean

The following example shows how to register a `SecurityFilterChain` `@Bean` with `@EnableWebSecurity` and enable OAuth 2.0 login through `httpSecurity.oauth2Login()`:

OAuth2 Login Configuration

- Java
    
- Kotlin
    

```
@Configuration
@EnableWebSecurity
public class OAuth2LoginSecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .anyRequest().authenticated()
            )
            .oauth2Login(withDefaults());
        return http.build();
    }
}
```

### Completely Override the Auto-configuration

The following example shows how to completely override the auto-configuration by registering a `ClientRegistrationRepository` `@Bean` and a `SecurityFilterChain` `@Bean`.

Overriding the auto-configuration

- Java
    
- Kotlin
    

```
@Configuration
public class OAuth2LoginConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .anyRequest().authenticated()
            )
            .oauth2Login(withDefaults());
        return http.build();
    }

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(this.googleClientRegistration());
    }

    private ClientRegistration googleClientRegistration() {
        return ClientRegistration.withRegistrationId("google")
            .clientId("google-client-id")
            .clientSecret("google-client-secret")
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope("openid", "profile", "email", "address", "phone")
            .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
            .tokenUri("https://www.googleapis.com/oauth2/v4/token")
            .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
            .userNameAttributeName(IdTokenClaimNames.SUB)
            .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
            .clientName("Google")
            .build();
    }
}
```

## Java Configuration without Spring Boot

If you are not able to use Spring Boot and would like to configure one of the pre-defined providers in `CommonOAuth2Provider` (for example, Google), apply the following configuration:

OAuth2 Login Configuration

- Java
    
- Kotlin
    
- Xml
    

```
@Configuration
@EnableWebSecurity
public class OAuth2LoginConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .anyRequest().authenticated()
            )
            .oauth2Login(withDefaults());
        return http.build();
    }

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(this.googleClientRegistration());
    }

    @Bean
    public OAuth2AuthorizedClientService authorizedClientService(
            ClientRegistrationRepository clientRegistrationRepository) {
        return new InMemoryOAuth2AuthorizedClientService(clientRegistrationRepository);
    }

    @Bean
    public OAuth2AuthorizedClientRepository authorizedClientRepository(
            OAuth2AuthorizedClientService authorizedClientService) {
        return new AuthenticatedPrincipalOAuth2AuthorizedClientRepository(authorizedClientService);
    }

    private ClientRegistration googleClientRegistration() {
        return CommonOAuth2Provider.GOOGLE.getBuilder("google")
            .clientId("google-client-id")
            .clientSecret("google-client-secret")
            .build();
    }
}
```


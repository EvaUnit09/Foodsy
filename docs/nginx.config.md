upstream foodsy_backend {
   server localhost:8080;
   keepalive 32;
}

server {
   server_name apifoodsy-backend.com www.apifoodsy-backend.com;
   
   location / {
       # No CORS headers - let Spring Boot handle all CORS
       proxy_pass http://foodsy_backend;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-Host $host;
       proxy_set_header X-Forwarded-Port $server_port;
       
       # Cookie forwarding for cross-domain auth
       proxy_set_header Cookie $http_cookie;
       proxy_pass_header Set-Cookie;
       
       # Timeouts
       proxy_connect_timeout 30s;
       proxy_send_timeout 30s;
       proxy_read_timeout 30s;
   }
   
   
   # WebSocket endpoint
   location /ws/ {
       proxy_pass http://foodsy_backend/api;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 86400s;
       proxy_send_timeout 86400s;
   }
   
   listen 443 ssl; # managed by Certbot
   ssl_certificate /etc/letsencrypt/live/apifoodsy-backend.com/fullchain.pem; # managed by Certbot
   ssl_certificate_key /etc/letsencrypt/live/apifoodsy-backend.com/privkey.pem; # managed by Certbot
   include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
   ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
   if ($host = www.apifoodsy-backend.com) {
       return 301 https://$host$request_uri;
   } # managed by Certbot
}
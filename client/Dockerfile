FROM nginx:1.20-alpine
COPY /nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY /build /usr/share/nginx/html
EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]
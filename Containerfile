FROM docker.io/library/php:8.3-fpm-alpine

# we'll need git when running composer from inside the docker
RUN apk add --update --no-cache \
    git \
    ca-certificates \
    libzip-dev \
    zip

RUN docker-php-ext-install zip

WORKDIR /var/www/html

# Copy project files
COPY ./project /var/www/html

# adding composer
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN composer config -g repo.packagist composer https://packagist.org
RUN composer install --ignore-platform-reqs --optimize-autoloader
#RUN composer install --no-dev --ignore-platform-reqs --optimize-autoloader

ENV COMPOSER_ALLOW_SUPERUSER=

ARG DB_CONNECTION=sqlite
ARG DB_DATABASE=/var/www/html/var/tuhin.sqlite

ENV DB_CONNECTION=${DB_CONNECTION}
ENV DB_DATABASE=${DB_DATABASE}

RUN touch ${DB_DATABASE}

RUN chown -R www-data:www-data /var/www/html

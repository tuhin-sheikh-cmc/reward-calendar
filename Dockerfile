FROM php:8.2-fpm

# we'll need git when running composer from inside the docker
RUN apt update && \
    apt install -y --no-install-recommends \
    git \
    libzip-dev \
    zip \
    unzip \
    && apt clean

RUN docker-php-ext-install zip

WORKDIR /var/www/html

# Copy project files
COPY ./src /var/www/html

# adding composer
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN composer config -g repo.packagist composer https://packagist.org
RUN composer install --no-dev --ignore-platform-reqs --optimize-autoloader

ENV COMPOSER_ALLOW_SUPERUSER=

ARG DB_CONNECTION=sqlite
ARG DB_DATABASE=/var/www/html/storage/app/tuhin.sqlite

ENV DB_CONNECTION=${DB_CONNECTION}
ENV DB_DATABASE=${DB_DATABASE}

RUN touch ${DB_DATABASE}

RUN chown -R www-data:www-data /var/www/html

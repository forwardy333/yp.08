-- =============================================================
-- HairLab — схема базы данных (MySQL 8.0)
-- Соответствует схеме sxema.jpg
-- =============================================================

DROP DATABASE IF EXISTS hairlab_db;
CREATE DATABASE hairlab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hairlab_db;

-- -------------------------------------------------------------
-- Таблица ролей (2 колонки-флага: admin / user)
-- -------------------------------------------------------------
CREATE TABLE Roles (
  id_roles VARCHAR(20)  NOT NULL,
  admin    VARCHAR(50)  NULL,
  user     VARCHAR(50)  NULL,
  PRIMARY KEY (id_roles)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Мастера
-- -------------------------------------------------------------
CREATE TABLE Masters (
  id_master       INT           NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100)  NOT NULL,
  specialization  VARCHAR(100)  NULL,
  phone_number    VARCHAR(20)   NULL,
  description     TEXT          NULL,
  PRIMARY KEY (id_master)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Услуги
-- -------------------------------------------------------------
CREATE TABLE Services (
  `PK_id_услуги` INT           NOT NULL AUTO_INCREMENT,
  name_service   VARCHAR(150)  NOT NULL,
  price          DECIMAL(10,2) NOT NULL,
  duration_min   INT           NULL,
  PRIMARY KEY (`PK_id_услуги`)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Пользователи (пароль хранится в виде bcrypt-хэша)
-- -------------------------------------------------------------
CREATE TABLE Users (
  id_user       INT           NOT NULL AUTO_INCREMENT,
  login         VARCHAR(50)   NOT NULL,
  email         VARCHAR(100)  NOT NULL,
  hash_password VARCHAR(255)  NOT NULL,
  phone_number  VARCHAR(20)   NULL,
  id_role       VARCHAR(20)   NOT NULL,
  PRIMARY KEY (id_user),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_login (login),
  CONSTRAINT fk_users_role FOREIGN KEY (id_role) REFERENCES Roles (id_roles)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Отзывы
-- -------------------------------------------------------------
CREATE TABLE Reviews (
  `PK_id_отзыва` INT         NOT NULL AUTO_INCREMENT,
  id_user         INT         NOT NULL,
  id_master       INT         NOT NULL,
  rating          INT         NOT NULL,
  comment         TEXT        NULL,
  review_date     DATE        NOT NULL,
  PRIMARY KEY (`PK_id_отзыва`),
  CONSTRAINT fk_reviews_user   FOREIGN KEY (id_user)   REFERENCES Users (id_user)   ON DELETE CASCADE,
  CONSTRAINT fk_reviews_master FOREIGN KEY (id_master) REFERENCES Masters (id_master) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Записи (бронирования)
-- -------------------------------------------------------------
CREATE TABLE Bookings (
  id_booking          INT          NOT NULL AUTO_INCREMENT,
  id_user             INT          NOT NULL,
  id_master           INT          NOT NULL,
  id_services         INT          NOT NULL,
  appointment_datetime DATETIME    NOT NULL,
  booking_status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_booking),
  CONSTRAINT fk_bookings_user    FOREIGN KEY (id_user)     REFERENCES Users (id_user),
  CONSTRAINT fk_bookings_master  FOREIGN KEY (id_master)   REFERENCES Masters (id_master),
  CONSTRAINT fk_bookings_service FOREIGN KEY (id_services) REFERENCES Services (`PK_id_услуги`)
) ENGINE=InnoDB;

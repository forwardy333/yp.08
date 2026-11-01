# HairLab — сайт парикмахерской

Учебный проект (УП.08): витрина парикмахерской с записью через интернет, личным кабинетом и админ-панелью.

## Технологии

| Элемент | Технология |
|---|---|
| Фронтенд | HTML5, CSS3, JavaScript (без фреймворков) |
| Бэкенд | Node.js + Express |
| БД | **MySQL 8.0** (подключение напрямую через SQL-запросы, ORM не используется) |
| Пароли | bcrypt (хэширование, `hash_password`) |
| Авторизация | JWT (Bearer-токен, срок 7 дня) |
| Роли | `admin` / `user` (таблица `Roles`) |
| Контроль версий | Git + GitHub |

## Структура проекта

```
yp.08/
├── index.html          — главная страница
├── pages/              — страницы сайта
│   ├── login.html      — вход / регистрация
│   ├── lk.html         — личный кабинет
│   ├── admin.html      — админ-панель
│   ├── zapis.html      — запись (списки из БД)
│   └── ...
├── js/                 — скрипты клиента (auth, booking, cabinet, admin)
├── css/                — стили
├── images/             — изображения
├── sxema.jpg           — схема БД (ТЗ)
└── backend/
    ├── server.js       — REST API (Express + mysql2, чистый SQL)
    ├── .env            — настройки (в git не попадает)
    └── db/
        ├── schema.sql  — создание 6 таблиц по схеме
        └── seed.sql    — начальное наполнение
```

## Схема базы данных

Реализована по схеме `sxema.jpg` — **6 таблиц** (при требовании минимум 5):

| Таблица | Назначение |
|---|---|
| `Roles` | роли: `admin`, `user` |
| `Users` | пользователи: `login`, `email`, `hash_password`, `phone_number`, `id_role` (FK → Roles) |
| `Masters` | мастера: имя, специализация, телефон, описание |
| `Services` | услуги: название, цена `DECIMAL(10,2)`, длительность |
| `Reviews` | отзывы: оценка 1–5, комментарий, дата (FK → Users, Masters) |
| `Bookings` | записи: клиент, мастер, услуга, дата/время, статус, `created_at` (FK → Users, Masters, Services) |

## Запуск

### 1. База данных

```bash
# MySQL должен быть запущен (служба MySQL80)
mysql -u root -p < backend/db/schema.sql   # создание таблиц
mysql -u root -p < backend/db/seed.sql     # роли, мастера, услуги, админ
```

### 2. Настройки

Файл `backend/.env`:

```
PORT=3000
JWT_SECRET=...
DB_HOST=localhost
DB_USER=hairlab
DB_PASSWORD=...
DB_NAME=hairlab_db
```

### 3. Сервер

```bash
cd backend
npm install
npm start          # http://localhost:3000
```

Сайт открывается по адресу `http://localhost:3000`.

## Учётные записи для проверки

| Роль | Email | Пароль |
|---|---|---|
| Администратор | `admin@hairlab.ru` | `Admin12345` |

Любой другой аккаунт регистрируется с ролью `user`.

## API (кратко)

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/api/register`, `/api/login` | публично |
| GET | `/api/me`, `/api/appointments` | JWT |
| POST | `/api/appointments`, `/api/reviews` | JWT |
| GET | `/api/masters`, `/api/services`, `/api/reviews` | публично |
| GET | `/api/admin/stats`, `/api/admin/users`, `/api/admin/bookings`, `/api/admin/reviews` | JWT + роль `admin` |
| POST/PUT/DELETE | `/api/admin/services`, `/api/admin/masters`, `/api/admin/bookings/:id`, ... | JWT + роль `admin` |

## Админ-панель

Страница `pages/admin.html` (после входа под админом — ссылка в личном кабинете):

* сводная статистика (пользователи, записи, мастера, услуги, отзывы);
* управление записями: смена статуса (`pending` / `confirmed` / `completed` / `cancelled`), удаление;
* управление пользователями: смена роли, удаление;
* справочники: услуги и мастера — добавление, изменение, удаление;
* модерация отзывов.

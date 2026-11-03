require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hairlab_secret_key_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hairlab',
  password: process.env.DB_PASSWORD || 'HairLab_2026',
  database: process.env.DB_NAME || 'hairlab_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

let pool;

async function connectDB() {
  try {
    pool = mysql.createPool(dbConfig);
    await pool.query('SELECT 1');
    console.log('Подключено к MySQL: ' + dbConfig.database);
  } catch (err) {
    console.error('Ошибка подключения к БД:', err.message);
    process.exit(1);
  }
}

/* ===================== Middleware ===================== */

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Нет токена' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Неверный токен' });
  }
}

// Разделение ролей: доступ только администраторам
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ только для администратора' });
  }
  next();
}

function publicUser(u) {
  return { id: u.id_user, login: u.login, name: u.login, email: u.email, phone: u.phone_number, role: u.id_role };
}

/* ===================== Auth ===================== */

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Заполните имя, email и пароль' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть не короче 6 символов' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO Users (login, email, hash_password, phone_number, id_role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, phone || '', 'user']
    );

    const userId = result.insertId;
    const token = jwt.sign({ id: userId, email, name, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: userId, name, email, phone: phone || '', role: 'user' } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Этот email или имя уже зарегистрированы' });
    }
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Аккаунт с таким email не найден' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.hash_password);
    if (!match) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { id: user.id_user, email: user.email, name: user.login, role: user.id_role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_user, login, email, phone_number, id_role FROM Users WHERE id_user = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(publicUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/* ===================== Справочники (публичные) ===================== */

app.get('/api/masters', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Masters ORDER BY id_master');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Services ORDER BY `PK_id_услуги`');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/* ===================== Отзывы ===================== */

app.get('/api/reviews', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.\`PK_id_отзыва\` AS id, r.rating, r.comment, r.review_date,
              u.login AS user_name, m.name AS master_name
       FROM Reviews r
       JOIN Users u ON u.id_user = r.id_user
       JOIN Masters m ON m.id_master = r.id_master
       ORDER BY r.review_date DESC, r.\`PK_id_отзыва\` DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/api/reviews', authenticate, async (req, res) => {
  try {
    const { masterId, rating, comment } = req.body;
    const ratingNum = parseInt(rating, 10);
    if (!masterId || !ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Укажите мастера и оценку от 1 до 5' });
    }
    await pool.query(
      'INSERT INTO Reviews (id_user, id_master, rating, comment, review_date) VALUES (?, ?, ?, ?, CURDATE())',
      [req.user.id, masterId, ratingNum, comment || null]
    );
    res.json({ message: 'Спасибо за отзыв!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/* ===================== Записи ===================== */

app.post('/api/appointments', authenticate, async (req, res) => {
  try {
    const { service, master, date, time, clientName, clientPhone } = req.body;
    if (!service || !master || !date || !time) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    // service и master могут приходить как id или как название
    let serviceId = parseInt(service, 10);
    let masterId = parseInt(master, 10);

    if (Number.isNaN(serviceId)) {
      const [s] = await pool.query('SELECT `PK_id_услуги` AS id FROM Services WHERE name_service = ?', [service]);
      if (s.length === 0) return res.status(400).json({ message: 'Услуга не найдена' });
      serviceId = s[0].id;
    }
    if (Number.isNaN(masterId)) {
      const [m] = await pool.query('SELECT id_master FROM Masters WHERE name = ?', [master]);
      if (m.length === 0) return res.status(400).json({ message: 'Мастер не найден' });
      masterId = m[0].id;
    }

    const datetime = date + ' ' + (time.length === 5 ? time + ':00' : time);

    await pool.query(
      `INSERT INTO Bookings (id_user, id_master, id_services, appointment_datetime, booking_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, masterId, serviceId, datetime]
    );

    res.json({ message: 'Запись создана!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.get('/api/appointments', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id_booking AS id, s.name_service AS service, m.name AS master,
              b.appointment_datetime, b.booking_status AS status
       FROM Bookings b
       JOIN Services s ON s.\`PK_id_услуги\` = b.id_services
       JOIN Masters m ON m.id_master = b.id_master
       WHERE b.id_user = ?
       ORDER BY b.appointment_datetime DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/* ===================== Админ-панель ===================== */

// Сводка
app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) AS c FROM Users');
    const [[bookings]] = await pool.query('SELECT COUNT(*) AS c FROM Bookings');
    const [[pending]] = await pool.query("SELECT COUNT(*) AS c FROM Bookings WHERE booking_status = 'pending'");
    const [[masters]] = await pool.query('SELECT COUNT(*) AS c FROM Masters');
    const [[services]] = await pool.query('SELECT COUNT(*) AS c FROM Services');
    const [[reviews]] = await pool.query('SELECT COUNT(*) AS c FROM Reviews');
    res.json({
      users: users.c, bookings: bookings.c, pending: pending.c,
      masters: masters.c, services: services.c, reviews: reviews.c,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Пользователи
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_user AS id, login, email, phone_number AS phone, id_role AS role
       FROM Users ORDER BY id_user`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.put('/api/admin/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') return res.status(400).json({ message: 'Неверная роль' });
    const [result] = await pool.query('UPDATE Users SET id_role = ? WHERE id_user = ?', [role, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Роль обновлена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Нельзя удалить самого себя' });
    }
    const [result] = await pool.query('DELETE FROM Users WHERE id_user = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Все записи
app.get('/api/admin/bookings', authenticate, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id_booking AS id, u.login AS user_name, u.email,
              m.name AS master_name, s.name_service AS service_name,
              b.appointment_datetime, b.booking_status AS status, b.created_at
       FROM Bookings b
       JOIN Users u ON u.id_user = b.id_user
       JOIN Masters m ON m.id_master = b.id_master
       JOIN Services s ON s.\`PK_id_услуги\` = b.id_services
       ORDER BY b.appointment_datetime DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.put('/api/admin/bookings/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Неверный статус' });
    const [result] = await pool.query(
      'UPDATE Bookings SET booking_status = ? WHERE id_booking = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Запись не найдена' });
    res.json({ message: 'Статус обновлён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/bookings/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Bookings WHERE id_booking = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Запись не найдена' });
    res.json({ message: 'Запись удалена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Услуги (CRUD)
app.post('/api/admin/services', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name_service, price, duration_min } = req.body;
    if (!name_service || price === undefined) return res.status(400).json({ message: 'Заполните название и цену' });
    const [result] = await pool.query(
      'INSERT INTO Services (name_service, price, duration_min) VALUES (?, ?, ?)',
      [name_service, price, duration_min || null]
    );
    res.json({ message: 'Услуга добавлена', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.put('/api/admin/services/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name_service, price, duration_min } = req.body;
    const [result] = await pool.query(
      'UPDATE Services SET name_service = ?, price = ?, duration_min = ? WHERE `PK_id_услуги` = ?',
      [name_service, price, duration_min || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Услуга не найдена' });
    res.json({ message: 'Услуга обновлена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/services/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Services WHERE `PK_id_услуги` = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Услуга не найдена' });
    res.json({ message: 'Услуга удалена' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Нельзя удалить: есть связанные записи' });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Мастера (CRUD)
app.post('/api/admin/masters', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, specialization, phone_number, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Укажите имя мастера' });
    const [result] = await pool.query(
      'INSERT INTO Masters (name, specialization, phone_number, description) VALUES (?, ?, ?, ?)',
      [name, specialization || null, phone_number || null, description || null]
    );
    res.json({ message: 'Мастер добавлен', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.put('/api/admin/masters/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, specialization, phone_number, description } = req.body;
    const [result] = await pool.query(
      'UPDATE Masters SET name = ?, specialization = ?, phone_number = ?, description = ? WHERE id_master = ?',
      [name, specialization || null, phone_number || null, description || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Мастер не найден' });
    res.json({ message: 'Данные мастера обновлены' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/masters/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Masters WHERE id_master = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Мастер не найден' });
    res.json({ message: 'Мастер удалён' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Нельзя удалить: есть связанные записи' });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Отзывы (модерация)
app.get('/api/admin/reviews', authenticate, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.\`PK_id_отзыва\` AS id, r.rating, r.comment, r.review_date,
              u.login AS user_name, m.name AS master_name
       FROM Reviews r
       JOIN Users u ON u.id_user = r.id_user
       JOIN Masters m ON m.id_master = r.id_master
       ORDER BY r.review_date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/reviews/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Reviews WHERE `PK_id_отзыва` = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Отзыв не найден' });
    res.json({ message: 'Отзыв удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Заглушка для несуществующих API-путей
app.use('/api', (req, res) => res.status(404).json({ message: 'Не найдено' }));

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
  });
});

const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'hairlab_secret_key_2026';

const dbConfig = {
connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\Naumenko;Database=HairLabDB;Trusted_Connection=yes;',
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

let pool;
async function connectDB() {
try {
  pool = await sql.connect(dbConfig);
  console.log('Подключено к MSSQL');
} catch (err) {
  console.error('Ошибка подключения к БД:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
}
}

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

app.post('/api/register', async (req, res) => {
try {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Заполните имя, email и пароль' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.request()
    .input('name', sql.NVarChar, name)
    .input('email', sql.NVarChar, email)
    .input('phone', sql.NVarChar, phone || '')
    .input('password', sql.NVarChar, hashed)
    .query(`INSERT INTO [Пользователи] ([Имя], [Почта], [Телефон], [Пароль])
            OUTPUT INSERTED.[Код]
            VALUES (@name, @email, @phone, @password)`);

  const userId = result.recordset[0].Код;
  const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: userId, name, email, phone } });
} catch (err) {
  if (err.number === 2627) {
    return res.status(400).json({ message: 'Этот email уже зарегистрирован' });
  }
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.post('/api/login', async (req, res) => {
try {
  const { email, password } = req.body;
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM [Пользователи] WHERE [Почта] = @email');

  if (result.recordset.length === 0) {
    return res.status(400).json({ message: 'Аккаунт с таким email не найден' });
  }

  const user = result.recordset[0];
  const match = await bcrypt.compare(password, user.Пароль);
  if (!match) {
    return res.status(400).json({ message: 'Неверный пароль' });
  }

  const token = jwt.sign(
    { id: user.Код, email: user.Почта, name: user.Имя },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: {
      id: user.Код,
      name: user.Имя,
      email: user.Почта,
      phone: user.Телефон,
    },
  });
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.get('/api/me', authenticate, async (req, res) => {
try {
  const result = await pool.request()
    .input('id', sql.Int, req.user.id)
    .query('SELECT [Код], [Имя], [Почта], [Телефон] FROM [Пользователи] WHERE [Код] = @id');

  if (result.recordset.length === 0) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }
  const u = result.recordset[0];
  res.json({ id: u.Код, name: u.Имя, email: u.Почта, phone: u.Телефон });
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.post('/api/appointments', authenticate, async (req, res) => {
try {
  const { service, master, date, time, clientName, clientPhone } = req.body;
  if (!service || !master || !date || !time) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  await pool.request()
    .input('userId', sql.Int, req.user.id)
    .input('service', sql.NVarChar, service)
    .input('master', sql.NVarChar, master)
    .input('date', sql.Date, date)
    .input('time', sql.Time, time)
    .input('clientName', sql.NVarChar, clientName || '')
    .input('clientPhone', sql.NVarChar, clientPhone || '')
    .query(`INSERT INTO [Записи] ([Код_Пользователя], [Услуга], [Мастер], [Дата], [Время], [Имя_Клиента], [Телефон_Клиента])
            VALUES (@userId, @service, @master, @date, @time, @clientName, @clientPhone)`);

  res.json({ message: 'Запись создана!' });
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.get('/api/appointments', authenticate, async (req, res) => {
try {
  const result = await pool.request()
    .input('userId', sql.Int, req.user.id)
    .query(`SELECT [Код], [Услуга], [Мастер], [Дата], [Время], [Статус]
            FROM [Записи] WHERE [Код_Пользователя] = @userId
            ORDER BY [Дата] DESC, [Время] DESC`);

  res.json(result.recordset);
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.get('/api/users', async (req, res) => {
try {
  const result = await pool.request()
    .query('SELECT [Код], [Имя], [Почта], [Телефон] FROM [Пользователи]');
  res.json(result.recordset);
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.get('/api/all-appointments', async (req, res) => {
try {
  const result = await pool.request()
    .query('SELECT * FROM [Записи] ORDER BY [Дата] DESC, [Время] DESC');
  res.json(result.recordset);
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

app.get('/api/masters', async (req, res) => {
try {
  const result = await pool.request()
    .query('SELECT [Код], [Имя], [Должность], [Описание], [Стаж], [Фото] FROM [Мастера]');
  res.json(result.recordset);
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Ошибка сервера' });
}
});

connectDB().then(() => {
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
});

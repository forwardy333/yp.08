document.addEventListener('DOMContentLoaded', async function () {
  var user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    document.getElementById('accessMsg').style.display = 'block';
    setTimeout(function () { location.href = 'login.html'; }, 1500);
    return;
  }
  document.getElementById('adminContent').style.display = 'block';

  // Переключение вкладок
  var tabBtns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabBtns.length; i++) {
    tabBtns[i].addEventListener('click', function () {
      for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active');
      this.classList.add('active');
      var panels = document.querySelectorAll('.tab-panel');
      for (var k = 0; k < panels.length; k++) panels[k].style.display = 'none';
      document.getElementById(this.getAttribute('data-tab')).style.display = 'block';
    });
  }

  var logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', function (e) { e.preventDefault(); logout(); });
  }

  document.getElementById('serviceForm').addEventListener('submit', saveService);
  document.getElementById('masterForm').addEventListener('submit', saveMaster);

  await loadAll();
});

function showMsg(text) {
  var el = document.getElementById('msg');
  el.innerHTML = text;
  el.style.display = 'block';
  setTimeout(function () { el.style.display = 'none'; }, 3000);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

async function loadAll() {
  await Promise.all([loadStats(), loadBookings(), loadUsers(), loadServices(), loadMasters(), loadReviews()]);
}

async function loadStats() {
  var s = await apiGet('/admin/stats');
  if (s.users === undefined) return;
  document.getElementById('stUsers').textContent = s.users;
  document.getElementById('stBookings').textContent = s.bookings;
  document.getElementById('stPending').textContent = s.pending;
  document.getElementById('stMasters').textContent = s.masters;
  document.getElementById('stServices').textContent = s.services;
  document.getElementById('stReviews').textContent = s.reviews;
}

var STATUS_TEXT = {
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  completed: 'Выполнено',
  cancelled: 'Отменено',
};

async function loadBookings() {
  var rows = await apiGet('/admin/bookings');
  if (!Array.isArray(rows)) return;
  var body = document.getElementById('bookingsBody');
  body.innerHTML = rows.length === 0
    ? '<tr><td colspan="6">Записей пока нет</td></tr>'
    : '';

  for (var i = 0; i < rows.length; i++) {
    var b = rows[i];
    var tr = document.createElement('tr');
    var dt = new Date(b.appointment_datetime).toLocaleString('ru-RU');
    var options = ['pending', 'confirmed', 'completed', 'cancelled'].map(function (st) {
      return '<option value="' + st + '"' + (b.status === st ? ' selected' : '') + '>' + STATUS_TEXT[st] + '</option>';
    }).join('');

    tr.innerHTML =
      '<td>' + esc(b.user_name) + '<br><small>' + esc(b.email) + '</small></td>' +
      '<td>' + esc(b.service_name) + '</td>' +
      '<td>' + esc(b.master_name) + '</td>' +
      '<td>' + dt + '</td>' +
      '<td><select class="status-select" data-id="' + b.id + '">' + options + '</select></td>' +
      '<td><button class="mini-btn danger" data-del-booking="' + b.id + '">Удалить</button></td>';
    body.appendChild(tr);
  }

  body.querySelectorAll('.status-select').forEach(function (sel) {
    sel.addEventListener('change', async function () {
      var r = await apiSend('/admin/bookings/' + this.dataset.id, 'PUT', { status: this.value });
      showMsg(r.message || 'Ошибка');
      loadStats();
    });
  });
  body.querySelectorAll('[data-del-booking]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Удалить запись?')) return;
      var r = await apiSend('/admin/bookings/' + this.dataset.delBooking, 'DELETE', {});
      showMsg(r.message || 'Ошибка');
      loadBookings(); loadStats();
    });
  });
}

async function loadUsers() {
  var rows = await apiGet('/admin/users');
  if (!Array.isArray(rows)) return;
  var body = document.getElementById('usersBody');
  body.innerHTML = '';
  var me = getCurrentUser();

  for (var i = 0; i < rows.length; i++) {
    var u = rows[i];
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + u.id + '</td>' +
      '<td>' + esc(u.login) + '</td>' +
      '<td>' + esc(u.email) + '</td>' +
      '<td>' + esc(u.phone) + '</td>' +
      '<td>' + (u.role === 'admin' ? 'Администратор' : 'Пользователь') + '</td>' +
      '<td>' +
        (u.id !== me.id ? '<button class="mini-btn" data-role-id="' + u.id + '" data-role="' + (u.role === 'admin' ? 'user' : 'admin') + '">' +
          (u.role === 'admin' ? 'Снять админа' : 'Сделать админом') + '</button> ' +
        '<button class="mini-btn danger" data-del-user="' + u.id + '">Удалить</button>' : '—') +
      '</td>';
    body.appendChild(tr);
  }

  body.querySelectorAll('[data-role-id]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var r = await apiSend('/admin/users/' + this.dataset.roleId + '/role', 'PUT', { role: this.dataset.role });
      showMsg(r.message || 'Ошибка');
      loadUsers();
    });
  });
  body.querySelectorAll('[data-del-user]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Удалить пользователя?')) return;
      var r = await apiSend('/admin/users/' + this.dataset.delUser, 'DELETE', {});
      showMsg(r.message || 'Ошибка');
      loadUsers(); loadStats();
    });
  });
}

async function loadServices() {
  var rows = await fetchServices();
  var body = document.getElementById('servicesBody');
  body.innerHTML = '';
  for (var i = 0; i < rows.length; i++) {
    var s = rows[i];
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + s['PK_id_услуги'] + '</td>' +
      '<td>' + esc(s.name_service) + '</td>' +
      '<td>' + s.price + ' ₽</td>' +
      '<td>' + (s.duration_min || '—') + ' мин</td>' +
      '<td><button class="mini-btn" data-edit-svc=\'' + JSON.stringify(s) + '\'>Изменить</button> ' +
      '<button class="mini-btn danger" data-del-svc="' + s['PK_id_услуги'] + '">Удалить</button></td>';
    body.appendChild(tr);
  }

  body.querySelectorAll('[data-edit-svc]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var s = JSON.parse(this.getAttribute('data-edit-svc'));
      document.getElementById('svcId').value = s['PK_id_услуги'];
      document.getElementById('svcName').value = s.name_service;
      document.getElementById('svcPrice').value = s.price;
      document.getElementById('svcDuration').value = s.duration_min || '';
      this.closest('form') || document.getElementById('serviceForm').scrollIntoView();
    });
  });
  body.querySelectorAll('[data-del-svc]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Удалить услугу?')) return;
      var r = await apiSend('/admin/services/' + this.dataset.delSvc, 'DELETE', {});
      showMsg(r.message || 'Ошибка');
      loadServices(); loadStats();
    });
  });
}

async function saveService(e) {
  e.preventDefault();
  var id = document.getElementById('svcId').value;
  var payload = {
    name_service: document.getElementById('svcName').value.trim(),
    price: parseFloat(document.getElementById('svcPrice').value),
    duration_min: document.getElementById('svcDuration').value ? parseInt(document.getElementById('svcDuration').value, 10) : null,
  };
  if (!payload.name_service || isNaN(payload.price)) return showMsg('Заполните название и цену');
  var r = id
    ? await apiSend('/admin/services/' + id, 'PUT', payload)
    : await apiSend('/admin/services', 'POST', payload);
  showMsg(r.message || 'Ошибка');
  e.target.reset();
  document.getElementById('svcId').value = '';
  loadServices(); loadStats();
}

async function loadMasters() {
  var rows = await fetchMasters();
  var body = document.getElementById('mastersBody');
  body.innerHTML = '';
  for (var i = 0; i < rows.length; i++) {
    var m = rows[i];
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + m.id_master + '</td>' +
      '<td>' + esc(m.name) + '</td>' +
      '<td>' + esc(m.specialization) + '</td>' +
      '<td>' + esc(m.phone_number) + '</td>' +
      '<td><button class="mini-btn" data-edit-mst=\'' + JSON.stringify(m) + '\'>Изменить</button> ' +
      '<button class="mini-btn danger" data-del-mst="' + m.id_master + '">Удалить</button></td>';
    body.appendChild(tr);
  }

  body.querySelectorAll('[data-edit-mst]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = JSON.parse(this.getAttribute('data-edit-mst'));
      document.getElementById('mstId').value = m.id_master;
      document.getElementById('mstName').value = m.name;
      document.getElementById('mstSpec').value = m.specialization || '';
      document.getElementById('mstPhone').value = m.phone_number || '';
      document.getElementById('mstDesc').value = m.description || '';
      document.getElementById('masterForm').scrollIntoView();
    });
  });
  body.querySelectorAll('[data-del-mst]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Удалить мастера?')) return;
      var r = await apiSend('/admin/masters/' + this.dataset.delMst, 'DELETE', {});
      showMsg(r.message || 'Ошибка');
      loadMasters(); loadStats();
    });
  });
}

async function saveMaster(e) {
  e.preventDefault();
  var id = document.getElementById('mstId').value;
  var payload = {
    name: document.getElementById('mstName').value.trim(),
    specialization: document.getElementById('mstSpec').value.trim(),
    phone_number: document.getElementById('mstPhone').value.trim(),
    description: document.getElementById('mstDesc').value.trim(),
  };
  if (!payload.name) return showMsg('Укажите имя мастера');
  var r = id
    ? await apiSend('/admin/masters/' + id, 'PUT', payload)
    : await apiSend('/admin/masters', 'POST', payload);
  showMsg(r.message || 'Ошибка');
  e.target.reset();
  document.getElementById('mstId').value = '';
  loadMasters(); loadStats();
}

async function loadReviews() {
  var rows = await apiGet('/admin/reviews');
  if (!Array.isArray(rows)) return;
  var body = document.getElementById('reviewsBody');
  body.innerHTML = rows.length === 0 ? '<tr><td colspan="6">Отзывов пока нет</td></tr>' : '';

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(r.user_name) + '</td>' +
      '<td>' + esc(r.master_name) + '</td>' +
      '<td>' + '★'.repeat(r.rating) + '</td>' +
      '<td>' + esc(r.comment) + '</td>' +
      '<td>' + new Date(r.review_date).toLocaleDateString('ru-RU') + '</td>' +
      '<td><button class="mini-btn danger" data-del-rev="' + r.id + '">Удалить</button></td>';
    body.appendChild(tr);
  }

  body.querySelectorAll('[data-del-rev]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Удалить отзыв?')) return;
      var res = await apiSend('/admin/reviews/' + this.dataset.delRev, 'DELETE', {});
      showMsg(res.message || 'Ошибка');
      loadReviews(); loadStats();
    });
  });
}

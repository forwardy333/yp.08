document.addEventListener('DOMContentLoaded', async function () {
var user = getCurrentUser();
if (user == null) {
  location.href = 'login.html';
  return;
}

document.getElementById('avatarLetter').innerHTML = user.name.charAt(0).toUpperCase();
document.getElementById('userName').innerHTML = user.name;
document.getElementById('userEmail').innerHTML = user.email;
if (user.phone) {
  document.getElementById('userPhone').innerHTML = 'Тел: ' + user.phone;
}

var apps = await fetchAppointments();

if (!apps || apps.length == 0) {
  document.getElementById('noApps').style.display = 'block';
  document.getElementById('appsTable').style.display = 'none';
} else {
  document.getElementById('noApps').style.display = 'none';
  document.getElementById('appsTable').style.display = 'table';
  var tbody = document.getElementById('appsBody');
  for (var i = 0; i < apps.length; i++) {
    var a = apps[i];
    var status = a.status || 'pending';
    var cls = status == 'confirmed' ? 'badge-green' : 'badge-yellow';
    var txt = status == 'confirmed' ? 'Подтверждено' : status == 'completed' ? 'Выполнено' : status == 'cancelled' ? 'Отменено' : 'Ожидает';
    if (status == 'cancelled') cls = 'badge-yellow';
    var tr = document.createElement('tr');
    var d = new Date(a.appointment_datetime).toLocaleDateString('ru-RU');
    var timeStr = new Date(a.appointment_datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    tr.innerHTML = '<td>' + a.service + '</td><td>' + a.master + '</td><td>' + d + '</td><td>' + timeStr + '</td><td><span class="badge ' + cls + '">' + txt + '</span></td>';
    tbody.appendChild(tr);
  }
}

var logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
  logoutLink.addEventListener('click', function (e) {
    e.preventDefault();
    logout();
  });
}

// Ссылка на админ-панель — только для роли admin
if (isAdmin()) {
  var adminBox = document.getElementById('adminBox');
  if (adminBox) adminBox.style.display = 'block';
}
});

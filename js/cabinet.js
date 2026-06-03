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
    var cls = a.Статус == 'confirmed' ? 'badge-green' : 'badge-yellow';
    var txt = a.Статус == 'confirmed' ? 'Подтверждено' : 'Ожидает';
    var tr = document.createElement('tr');
    var d = new Date(a.Дата).toLocaleDateString('ru-RU');
    var t = a.Время;
    var timeStr = typeof t === 'string' ? t.slice(11, 16) : String(t).slice(0, 5);
    tr.innerHTML = '<td>' + a.Услуга + '</td><td>' + a.Мастер + '</td><td>' + d + '</td><td>' + timeStr + '</td><td><span class="badge ' + cls + '">' + txt + '</span></td>';
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
});

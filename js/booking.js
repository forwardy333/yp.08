document.addEventListener('DOMContentLoaded', function () {
  loadBookingOptions();

  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var yyyy = today.getFullYear();
  document.getElementById('date').setAttribute('min', yyyy + '-' + mm + '-' + dd);

  document.getElementById('date').addEventListener('change', function () {
    var selected = this.value;
    var now = new Date();
    var todayStr = yyyy + '-' + mm + '-' + dd;
    var select = document.getElementById('time');
    var options = select.querySelectorAll('option');

    for (var i = 0; i < options.length; i++) {
      if (options[i].value == '') continue;
      if (selected == todayStr) {
        var hour = parseInt(options[i].value.split(':')[0]);
        options[i].disabled = hour <= now.getHours();
        options[i].style.color = options[i].disabled ? '#ccc' : '';
      } else {
        options[i].disabled = false;
        options[i].style.color = '';
      }
    }
  });

  if (document.getElementById('date').value == '') {
    document.getElementById('date').value = yyyy + '-' + mm + '-' + dd;
    document.getElementById('date').dispatchEvent(new Event('change'));
  }

  setupPhoneInput('clientPhone');
  document.getElementById('bookBtn').addEventListener('click', bookAppointment);
});

function showBookingError(msg) {
  var el = document.getElementById('err');
  el.innerHTML = msg;
  el.style.display = 'block';
}

// Загрузка услуг и мастеров из БД в выпадающие списки
async function loadBookingOptions() {
  try {
    var services = await fetchServices();
    var masters = await fetchMasters();

    var serviceSelect = document.getElementById('service');
    serviceSelect.innerHTML = '<option value="">Выберите услугу</option>';
    for (var i = 0; i < services.length; i++) {
      var s = services[i];
      var opt = document.createElement('option');
      opt.value = s['PK_id_услуги'];
      opt.textContent = s.name_service + ' — ' + s.price + ' ₽';
      serviceSelect.appendChild(opt);
    }

    var masterSelect = document.getElementById('master');
    masterSelect.innerHTML = '<option value="">Выберите мастера</option>';
    for (var j = 0; j < masters.length; j++) {
      var m = masters[j];
      var o = document.createElement('option');
      o.value = m.id_master;
      o.textContent = m.name + (m.specialization ? ' (' + m.specialization + ')' : '');
      masterSelect.appendChild(o);
    }
  } catch (e) {
    showBookingError('Не удалось загрузить услуги и мастеров');
  }
}

function validatePhoneBooking(phone) {
  var digits = phone.replace(/\D/g, '');
  return digits.length >= 11;
}

function setupPhoneInput(id) {
  var input = document.getElementById(id);
  input.addEventListener('focus', function () {
    if (this.value == '') this.value = '+7';
  });
  input.addEventListener('input', function () {
    if (!this.value.startsWith('+7')) this.value = '+7';
    var digits = this.value.replace(/\D/g, '').slice(1, 11);
    this.value = '+7' + digits;
  });
}

async function bookAppointment() {
  var service = document.getElementById('service').value;
  var master = document.getElementById('master').value;
  var date = document.getElementById('date').value;
  var time = document.getElementById('time').value;
  var name = document.getElementById('clientName').value.trim();
  var phone = document.getElementById('clientPhone').value.trim();

  document.getElementById('err').style.display = 'none';
  document.getElementById('msg').style.display = 'none';

  if (!service) return showBookingError('Выберите услугу');
  if (!master) return showBookingError('Выберите мастера');
  if (!date) return showBookingError('Выберите дату');
  if (!time) return showBookingError('Выберите время');
  if (name.length < 2) return showBookingError('Введите имя (мин. 2 символа)');
  if (!phone) return showBookingError('Введите телефон');
  if (!validatePhoneBooking(phone)) return showBookingError('Введите +7 и 10 цифр');

  var user = getCurrentUser();
  if (user) {
    var result = await createAppointment(service, master, date, time, name, phone);
    if (result.message) {
      document.getElementById('msg').innerHTML = result.message;
      document.getElementById('msg').style.display = 'block';
    }
  } else {
    showBookingError('Чтобы записаться, необходимо <a href="login.html">войти</a> в личный кабинет');
    return;
  }

  document.getElementById('service').value = '';
  document.getElementById('master').value = '';
  document.getElementById('date').value = '';
  document.getElementById('time').value = '';
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
}

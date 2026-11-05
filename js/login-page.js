document.addEventListener('DOMContentLoaded', function() {
  setupPhoneInput('regPhone');
  document.getElementById('loginBtn').addEventListener('click', function(e) {
    handleLogin();
  });
  document.getElementById('regBtn').addEventListener('click', function(e) {
    handleRegister();
  });
  document.getElementById('showRegLink').addEventListener('click', function(e) {
    e.preventDefault();
    showRegister();
  });
  document.getElementById('showLoginLink').addEventListener('click', function(e) {
    e.preventDefault();
    showLogin();
  });
});

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('regForm').style.display = 'block';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('regError').style.display = 'none';
}

function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('regForm').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('regError').style.display = 'none';
}

function showError(el, msg) {
  el.innerHTML = msg;
  el.style.display = 'block';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
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

async function handleLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPassword').value;
  var err = document.getElementById('loginError');

  if (email == '') return showError(err, 'Введите email');
  if (!validateEmail(email)) return showError(err, 'Неверный формат email');
  if (pass == '') return showError(err, 'Введите пароль');
  if (pass.length < 6) return showError(err, 'Пароль минимум 6 символов');

  var res = await login(email, pass);
  if (res.success) {
    location.href = res.user && res.user.role === 'admin' ? 'admin.html' : 'lk.html';
  } else {
    err.innerHTML = res.message;
    err.style.display = 'block';
  }
}

async function handleRegister() {
  var name = document.getElementById('regName').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var phone = document.getElementById('regPhone').value.trim();
  var pass = document.getElementById('regPassword').value;
  var pass2 = document.getElementById('regPassword2').value;
  var err = document.getElementById('regError');

  if (name == '') return showError(err, 'Введите имя');
  if (name.length < 2) return showError(err, 'Имя должно быть от 2 символов');
  if (email == '') return showError(err, 'Введите email');
  if (!validateEmail(email)) return showError(err, 'Неверный формат email');
  if (phone == '') return showError(err, 'Введите телефон');
  if (!validatePhone(phone)) return showError(err, 'Введите +7 и 10 цифр');
  if (pass == '') return showError(err, 'Введите пароль');
  if (pass.length < 6) return showError(err, 'Пароль минимум 6 символов');
  if (pass != pass2) return showError(err, 'Пароли не совпадают');

  var res = await register(name, email, phone, pass);
  if (res.success) {
    location.href = 'lk.html';
  } else {
    err.innerHTML = res.message;
    err.style.display = 'block';
  }
}

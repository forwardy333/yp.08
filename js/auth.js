const API = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  const data = localStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

function isAdmin() {
  const u = getCurrentUser();
  return !!u && u.role === 'admin';
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  window.location.href = '../index.html';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken(),
  };
}

async function apiGet(path) {
  const res = await fetch(API + path, { headers: authHeaders() });
  return res.json();
}

async function apiSend(path, method, body) {
  const res = await fetch(API + path, {
    method: method,
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res.json();
}

async function register(name, email, phone, password) {
  try {
    const res = await fetch(API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };
    setAuth(data.token, data.user);
    return { success: true };
  } catch {
    return { success: false, message: 'Ошибка соединения с сервером' };
  }
}

async function login(email, password) {
  try {
    const res = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };
    setAuth(data.token, data.user);
    return { success: true, user: data.user };
  } catch {
    return { success: false, message: 'Ошибка соединения с сервером' };
  }
}

async function fetchMe() {
  const res = await fetch(API + '/me', { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchServices() {
  const res = await fetch(API + '/services');
  if (!res.ok) return [];
  return res.json();
}

async function fetchMasters() {
  const res = await fetch(API + '/masters');
  if (!res.ok) return [];
  return res.json();
}

async function fetchReviews() {
  const res = await fetch(API + '/reviews');
  if (!res.ok) return [];
  return res.json();
}

async function createReview(masterId, rating, comment) {
  return apiSend('/reviews', 'POST', { masterId, rating, comment });
}

async function createAppointment(service, master, date, time, clientName, clientPhone) {
  return apiSend('/appointments', 'POST', { service, master, date, time, clientName, clientPhone });
}

async function fetchAppointments() {
  const res = await fetch(API + '/appointments', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

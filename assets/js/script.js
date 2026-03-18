'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Mobile nav
const navToggle = $('[data-nav-toggle]');
const navLinks = $('[data-nav-links]');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  $$('.nav-link', navLinks).forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(min-width: 900px)').matches) return;
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Theme toggle (persisted)
const themeToggle = $('[data-theme-toggle]');
const setTheme = (theme) => {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon = themeToggle?.querySelector('ion-icon');
  if (icon) icon.setAttribute('name', theme === 'light' ? 'moon-outline' : 'sunny-outline');
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// Footer year
const yearEl = $('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Back to top (force reliable behavior)
const toTop = $('[data-to-top]');
if (toTop) {
  toTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#top');
  });
}

// Projects filter
const projectFilter = $('[data-project-filter]');
const projects = $$('.project-card[data-category]');

const applyProjectFilter = (value) => {
  const v = (value || 'all').toLowerCase();
  projects.forEach((card) => {
    const cat = (card.getAttribute('data-category') || '').toLowerCase();
    const show = v === 'all' || cat === v;
    card.toggleAttribute('hidden', !show);
  });
};

if (projectFilter) {
  projectFilter.addEventListener('change', (e) => {
    applyProjectFilter(e.target.value);
  });
  applyProjectFilter(projectFilter.value);
}

// Web3Forms submit + popup (success/failure)
const web3Form = $('[data-web3forms]');
const popup = $('[data-form-popup]');
let popupHideTimer = null;

const setPopup = (kind, title, message) => {
  if (!popup) return;
  if (popupHideTimer) {
    window.clearTimeout(popupHideTimer);
    popupHideTimer = null;
  }

  popup.hidden = false;
  popup.classList.toggle('is-success', kind === 'success');
  popup.classList.toggle('is-error', kind === 'error');
  const iconName = kind === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline';
  popup.innerHTML = `
    <ion-icon name="${iconName}" aria-hidden="true"></ion-icon>
    <div>
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;

  popupHideTimer = window.setTimeout(() => {
    clearPopup();
  }, 5000);
};

const clearPopup = () => {
  if (!popup) return;
  if (popupHideTimer) {
    window.clearTimeout(popupHideTimer);
    popupHideTimer = null;
  }
  popup.hidden = true;
  popup.classList.remove('is-success', 'is-error');
  popup.innerHTML = '';
};

// Ensure hidden on initial load
clearPopup();

if (web3Form) {
  web3Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearPopup();

    const submitBtn = $('button[type="submit"]', web3Form);
    const prevText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const fd = new FormData(web3Form);
      const res = await fetch(web3Form.action, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Submission failed.');
      }

      web3Form.reset();
      setPopup(
        'success',
        'Message sent',
        'Thanks for reaching out — I’ll get back to you soon.'
      );
    } catch (err) {
      console.error(err);
      setPopup(
        'error',
        'Something went wrong',
        'Please try again in a moment, or use the Email button in the Contact section.'
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtn && prevText) submitBtn.textContent = prevText;
    }
  });
}

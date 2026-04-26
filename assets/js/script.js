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
  const updateToTopVisibility = () => {
    const show = window.scrollY > 10;
    toTop.classList.toggle('is-visible', show);
  };

  toTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#top');
  });

  window.addEventListener('scroll', updateToTopVisibility, { passive: true });
  updateToTopVisibility();
}

// Projects filter
const projectFilterRoot = $('[data-project-filter-root]');
const projectFilterTrigger = $('[data-project-filter-trigger]');
const projectFilterList = $('[data-project-filter-list]');
const projectFilterOptions = $$('[data-project-filter-list] [data-value]');
const projects = $$('.project-card[data-category]');

const applyProjectFilter = (value) => {
  const v = (value || 'all').toLowerCase();
  projects.forEach((card) => {
    const cat = (card.getAttribute('data-category') || '').toLowerCase();
    const show = v === 'all' || cat === v;
    card.toggleAttribute('hidden', !show);
  });
};

const getActiveFilterOptionIndex = () => {
  const activeIndex = projectFilterOptions.findIndex((option) => option.classList.contains('is-active'));
  return activeIndex >= 0 ? activeIndex : 0;
};

const focusFilterOptionByIndex = (index) => {
  if (!projectFilterOptions.length) return;
  const nextIndex = Math.max(0, Math.min(index, projectFilterOptions.length - 1));
  projectFilterOptions[nextIndex].focus();
};

const closeCustomProjectFilter = () => {
  if (!projectFilterRoot || !projectFilterTrigger || !projectFilterList) return;
  projectFilterRoot.classList.remove('is-open');
  projectFilterList.hidden = true;
  projectFilterTrigger.setAttribute('aria-expanded', 'false');
};

const openCustomProjectFilter = () => {
  if (!projectFilterRoot || !projectFilterTrigger || !projectFilterList) return;
  projectFilterRoot.classList.add('is-open');
  projectFilterList.hidden = false;
  projectFilterTrigger.setAttribute('aria-expanded', 'true');
};

if (projectFilterRoot && projectFilterTrigger && projectFilterList && projectFilterOptions.length) {
  const setCustomProjectFilter = (value) => {
    const normalized = (value || 'all').toLowerCase();
    const activeOption = projectFilterOptions.find(
      (option) => (option.dataset.value || '').toLowerCase() === normalized
    );
    if (!activeOption) return;

    projectFilterOptions.forEach((option) => {
      const selected = option === activeOption;
      option.classList.toggle('is-active', selected);
      option.setAttribute('aria-pressed', String(selected));
    });

    projectFilterTrigger.textContent = activeOption.textContent || 'All';
    applyProjectFilter(normalized);
  };

  projectFilterTrigger.addEventListener('click', () => {
    if (projectFilterList.hidden) {
      openCustomProjectFilter();
      focusFilterOptionByIndex(getActiveFilterOptionIndex());
    } else {
      closeCustomProjectFilter();
    }
  });

  projectFilterTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCustomProjectFilter();
      focusFilterOptionByIndex(getActiveFilterOptionIndex());
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      openCustomProjectFilter();
      focusFilterOptionByIndex(projectFilterOptions.length - 1);
    }
  });

  projectFilterOptions.forEach((option) => {
    option.addEventListener('click', () => {
      setCustomProjectFilter(option.dataset.value || 'all');
      closeCustomProjectFilter();
      projectFilterTrigger.focus();
    });

    option.addEventListener('keydown', (e) => {
      const currentIndex = projectFilterOptions.indexOf(option);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusFilterOptionByIndex(currentIndex + 1);
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusFilterOptionByIndex(currentIndex - 1);
      }

      if (e.key === 'Home') {
        e.preventDefault();
        focusFilterOptionByIndex(0);
      }

      if (e.key === 'End') {
        e.preventDefault();
        focusFilterOptionByIndex(projectFilterOptions.length - 1);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        closeCustomProjectFilter();
        projectFilterTrigger.focus();
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setCustomProjectFilter(option.dataset.value || 'all');
        closeCustomProjectFilter();
        projectFilterTrigger.focus();
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!projectFilterRoot.contains(e.target)) {
      closeCustomProjectFilter();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomProjectFilter();
      projectFilterTrigger.focus();
    }
  });

  setCustomProjectFilter('all');
}

// Web3Forms submit + popup (success/failure)
const web3Form = $('[data-web3forms]');
const popup = $('[data-form-popup]');
let popupHideTimer = null;
const submitCooldownMs = 20 * 1000;


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

    const botcheck = $('[name="botcheck"]', web3Form);
    if (botcheck?.checked) {
      return;
    }

    const lastSubmitAt = Number(localStorage.getItem('contact_last_submit_at') || '0');
    const now = Date.now();
    if (now - lastSubmitAt < submitCooldownMs) {
      setPopup(
        'error',
        'Please wait',
        'You just sent a message. Please wait a few seconds before trying again.'
      );
      return;
    }

    const submitBtn = $('button[type="submit"]', web3Form);
    if (submitBtn) submitBtn.disabled = true;

    try {
      const fd = new FormData(web3Form);
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Submission failed (${res.status}).`);
      }

      localStorage.setItem('contact_last_submit_at', String(Date.now()));
      web3Form.reset();
      setPopup(
        'success',
        'Message sent',
        'Thanks for reaching out — I’ll get back to you soon.'
      );
    } catch (err) {
      console.error(err);
      const details = err instanceof Error ? err.message : 'Please try again in a moment.';
      setPopup(
        'error',
        'Something went wrong',
        `${details} You can also use the Email button in the Contact section.`
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

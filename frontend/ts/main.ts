import { ApiError, clearToken, fetchReceivers, getSession, getToken, login } from './lib/api.js';
import { renderSessionNav } from './lib/nav.js';
import { createPersonCard } from './lib/components/person-card.js';
import { Person } from './lib/types.js';

const loginSection = document.querySelector<HTMLElement>('#login');
const loginForm = document.querySelector<HTMLFormElement>('#login-form');
const loginEmail = document.querySelector<HTMLInputElement>('#login-email');
const loginPassword = document.querySelector<HTMLInputElement>('#login-password');
const loginError = document.querySelector<HTMLElement>('#login-error');
const loginSubmit = document.querySelector<HTMLButtonElement>('#login-submit');
const membersSection = document.querySelector<HTMLElement>('#members');
const logoutButton = document.querySelector<HTMLButtonElement>('#logout');

const cardsContainer = document.querySelector<HTMLElement>('#cards');
const loadingSection = document.querySelector<HTMLElement>('#loading');
const emptySection = document.querySelector<HTMLElement>('#empty');
const errorSection = document.querySelector<HTMLElement>('#error');
const errorMessage = document.querySelector<HTMLElement>('#error-message');
const retryButton = document.querySelector<HTMLButtonElement>('#retry');

function showLogin(message?: string): void {
  if (loginSection) {
    loginSection.hidden = false;
  }
  if (membersSection) {
    membersSection.hidden = true;
  }
  renderSessionNav(null);
  if (loginError) {
    loginError.textContent = message ?? '';
    loginError.hidden = message === undefined;
  }
}

function showMembers(): void {
  if (loginSection) {
    loginSection.hidden = true;
  }
  if (membersSection) {
    membersSection.hidden = false;
  }
  renderSessionNav(getSession());
}

async function loadMembers(): Promise<void> {
  if (!cardsContainer || !loadingSection || !emptySection || !errorSection) {
    return;
  }

  loadingSection.hidden = false;
  emptySection.hidden = true;
  errorSection.hidden = true;

  try {
    const receivers = await fetchReceivers();
    renderReceivers(receivers);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      clearToken();
      showLogin('Your session has expired. Please sign in again.');
      return;
    }
    emptySection.hidden = true;
    errorSection.hidden = false;
    if (errorMessage) {
      errorMessage.textContent =
        error instanceof Error ? error.message : 'Something went wrong';
    }
  } finally {
    loadingSection.hidden = true;
  }
}

function renderReceivers(receivers: Person[]): void {
  if (!cardsContainer || !emptySection) {
    return;
  }
  if (receivers.length === 0) {
    cardsContainer.replaceChildren();
    emptySection.hidden = false;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const receiver of receivers) {
    fragment.append(createPersonCard(receiver));
  }
  cardsContainer.replaceChildren(fragment);
}

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  void submitLogin();
});

async function submitLogin(): Promise<void> {
  const email = loginEmail?.value.trim() ?? '';
  const password = loginPassword?.value ?? '';
  if (email.length === 0 || password.length === 0) {
    showLogin('Enter your email and password.');
    return;
  }

  if (loginSubmit) {
    loginSubmit.disabled = true;
  }
  try {
    const session = await login(email, password);
    if (loginPassword) {
      loginPassword.value = '';
    }
    showMembers();
    await loadMembers();
  } catch (error) {
    showLogin(
      error instanceof Error ? error.message : 'Could not sign in. Please try again.',
    );
  } finally {
    if (loginSubmit) {
      loginSubmit.disabled = false;
    }
  }
}

logoutButton?.addEventListener('click', () => {
  clearToken();
  showLogin();
  if (loginEmail) {
    loginEmail.value = '';
  }
  if (loginPassword) {
    loginPassword.value = '';
  }
});

retryButton?.addEventListener('click', () => {
  void loadMembers();
});

if (getToken() !== null && getSession() !== null) {
  showMembers();
  void loadMembers();
} else {
  showLogin();
}

import {
  ApiError,
  addPoints,
  clearToken,
  fetchReceivers,
  getSession,
  getToken,
  removePoints,
} from './lib/api.js';
import { renderSessionNav } from './lib/nav.js';
import { formatPoints } from './lib/format.js';
import { Person, SessionInfo } from './lib/types.js';

const pointsApp = document.querySelector<HTMLElement>('#points-app');
const form = document.querySelector<HTMLFormElement>('#points-form');
const receiverSelect = document.querySelector<HTMLSelectElement>('#receiver-select');
const receiverBalance = document.querySelector<HTMLElement>('#receiver-balance');
const receiverBalanceValue = document.querySelector<HTMLElement>('#receiver-balance-value');
const amountInput = document.querySelector<HTMLInputElement>('#points-amount');
const reasonInput = document.querySelector<HTMLInputElement>('#points-reason');
const errorMessage = document.querySelector<HTMLElement>('#points-error');
const feedbackMessage = document.querySelector<HTMLElement>('#points-feedback');
const addButton = document.querySelector<HTMLButtonElement>('#add-points');
const removeButton = document.querySelector<HTMLButtonElement>('#remove-points');
const logoutButton = document.querySelector<HTMLButtonElement>('#logout');

function requireProvider(): SessionInfo | null {
  const session = getSession();
  if (getToken() === null || session === null || session.role !== 'provider') {
    window.location.replace('/');
    return null;
  }
  return session;
}

function showError(message: string): void {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }
  if (feedbackMessage) {
    feedbackMessage.hidden = true;
  }
}

function showFeedback(message: string): void {
  if (feedbackMessage) {
    feedbackMessage.textContent = message;
    feedbackMessage.hidden = false;
  }
  if (errorMessage) {
    errorMessage.hidden = true;
  }
}

function setBusy(busy: boolean): void {
  if (addButton) {
    addButton.disabled = busy;
  }
  if (removeButton) {
    removeButton.disabled = busy;
  }
}

function updateBalanceDisplay(receiver: Person | undefined): void {
  if (!receiverBalance || !receiverBalanceValue) {
    return;
  }
  if (receiver === undefined) {
    receiverBalance.hidden = true;
    receiverBalanceValue.textContent = '';
    return;
  }
  receiverBalanceValue.textContent = formatPoints(receiver.pointsBalance);
  receiverBalance.hidden = false;
}

function renderReceiverOptions(receivers: Person[]): void {
  if (!receiverSelect) {
    return;
  }
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = receivers.length > 0 ? 'Select a receiver' : 'No receivers available';

  const fragment = document.createDocumentFragment();
  fragment.append(placeholder);
  for (const receiver of receivers) {
    const option = document.createElement('option');
    option.value = receiver.id;
    option.textContent = `${receiver.name} — ${formatPoints(receiver.pointsBalance)} pts`;
    fragment.append(option);
  }
  receiverSelect.replaceChildren(fragment);
  receiverSelect.disabled = receivers.length === 0;
}

async function init(session: SessionInfo): Promise<void> {
  renderSessionNav(session);
  if (pointsApp) {
    pointsApp.hidden = false;
  }

  const receiversById = new Map<string, Person>();

  logoutButton?.addEventListener('click', () => {
    clearToken();
    renderSessionNav(null);
    window.location.replace('/');
  });

  receiverSelect?.addEventListener('change', () => {
    updateBalanceDisplay(receiversById.get(receiverSelect.value));
  });

  try {
    const receivers = await fetchReceivers();
    for (const receiver of receivers) {
      receiversById.set(receiver.id, receiver);
    }
    renderReceiverOptions(receivers);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      clearToken();
      window.location.replace('/');
      return;
    }
    showError(
      error instanceof Error ? error.message : 'Could not load receivers.',
    );
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitAdjustment(event.submitter);
  });

  async function submitAdjustment(submitter: HTMLElement | null): Promise<void> {
    const action = submitter?.getAttribute('value') === 'remove' ? 'remove' : 'add';
    const personId = receiverSelect?.value ?? '';
    const points = Number.parseInt(amountInput?.value ?? '', 10);
    const reason = reasonInput?.value.trim() ?? '';

    if (personId.length === 0) {
      showError('Select a receiver first.');
      return;
    }
    if (!Number.isInteger(points) || points <= 0) {
      showError('Enter a whole number of points greater than zero.');
      return;
    }

    setBusy(true);
    try {
      const result =
        action === 'remove'
          ? await removePoints(personId, points, reason)
          : await addPoints(personId, points, reason);

      const receiver = receiversById.get(personId);
      if (receiver) {
        receiver.pointsBalance = result.balance;
        receiversById.set(personId, receiver);
        const option = receiverSelect?.selectedOptions.item(0);
        if (option) {
          option.textContent = `${receiver.name} — ${formatPoints(result.balance)} pts`;
        }
        updateBalanceDisplay(receiver);
      }

      showFeedback(
        `${action === 'remove' ? 'Removed' : 'Added'} ${formatPoints(points)} points. New balance: ${formatPoints(result.balance)}.`,
      );
      if (amountInput) {
        amountInput.value = '';
      }
      if (reasonInput) {
        reasonInput.value = '';
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        clearToken();
        window.location.replace('/');
        return;
      }
      showError(error instanceof Error ? error.message : 'Could not update points.');
    } finally {
      setBusy(false);
    }
  }
}

const session = requireProvider();
if (session !== null) {
  void init(session);
}

import { fetchReceivers } from './lib/api.js';
import { createPersonCard } from './lib/components/person-card.js';
import { Person } from './lib/types.js';

const cardsContainer = document.querySelector<HTMLElement>('#cards');
const loadingSection = document.querySelector<HTMLElement>('#loading');
const emptySection = document.querySelector<HTMLElement>('#empty');
const errorSection = document.querySelector<HTMLElement>('#error');
const errorMessage = document.querySelector<HTMLElement>('#error-message');
const retryButton = document.querySelector<HTMLButtonElement>('#retry');

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

retryButton?.addEventListener('click', () => {
  void loadMembers();
});

void loadMembers();
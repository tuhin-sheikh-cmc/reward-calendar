import {
  ApiError,
  clearToken,
  fetchPerson,
  fetchPointsEntries,
  getSession,
  getToken,
} from './lib/api.js';
import { renderSessionNav } from './lib/nav.js';
import { initialsAvatarUrl } from './lib/avatars.js';
import { formatDateTime, formatPoints } from './lib/format.js';
import { Person, PointsEntry, SessionInfo } from './lib/types.js';

const PAGE_SIZE = 100;

const personApp = document.querySelector<HTMLElement>('#person-app');
const personAvatar = document.querySelector<HTMLImageElement>('#person-avatar');
const personName = document.querySelector<HTMLElement>('#person-name');
const personRole = document.querySelector<HTMLElement>('#person-role');
const personBalance = document.querySelector<HTMLElement>('#person-balance');
const entriesList = document.querySelector<HTMLUListElement>('#entries');
const entriesLoading = document.querySelector<HTMLElement>('#entries-loading');
const entriesEmpty = document.querySelector<HTMLElement>('#entries-empty');
const entriesError = document.querySelector<HTMLElement>('#entries-error');
const entriesCount = document.querySelector<HTMLElement>('#entries-count');
const loadMoreButton = document.querySelector<HTMLButtonElement>('#load-more');
const logoutButton = document.querySelector<HTMLButtonElement>('#logout');

function redirectHome(): void {
  window.location.replace('/');
}

function requireAccess(): { session: SessionInfo; personId: string } | null {
  const personId = new URLSearchParams(window.location.search).get('id') ?? '';
  const session = getSession();
  if (getToken() === null || session === null || personId.length === 0) {
    redirectHome();
    return null;
  }
  if (session.role !== 'provider' && session.id !== personId) {
    redirectHome();
    return null;
  }
  return { session, personId };
}

function handleSessionExpiry(error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode === 401) {
    clearToken();
    redirectHome();
    return true;
  }
  return false;
}

function renderPersonHeader(person: Person): void {
  if (personAvatar) {
    personAvatar.src = initialsAvatarUrl(person.name);
  }
  if (personName) {
    personName.textContent = person.name;
  }
  if (personRole) {
    personRole.textContent = person.role === 'provider' ? 'Provider' : 'Receiver';
  }
  if (personBalance) {
    personBalance.textContent = formatPoints(person.pointsBalance);
  }
}

function renderEntry(entry: PointsEntry): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'flex items-center gap-4 rounded-2xl bg-surface-container p-4';

  const iconWrap = document.createElement('div');
  iconWrap.className =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-rounded text-base text-on-surface-variant';
  icon.textContent = entry.type === 'earned' ? 'add' : 'remove';
  iconWrap.append(icon);

  const info = document.createElement('div');
  info.className = 'min-w-0 flex-1';
  const label = document.createElement('p');
  label.className = 'text-sm font-medium text-on-surface';
  label.textContent =
    entry.type === 'earned' ? 'Earned' : entry.type === 'removed' ? 'Removed' : 'Redeemed';
  info.append(label);
  if (entry.reason !== undefined) {
    const reason = document.createElement('p');
    reason.className = 'truncate text-sm text-on-surface-variant';
    reason.textContent = entry.reason;
    info.append(reason);
  }
  const date = document.createElement('p');
  date.className = 'mt-0.5 text-xs text-on-surface-variant';
  date.textContent = formatDateTime(entry.createdAt);
  info.append(date);

  const amounts = document.createElement('div');
  amounts.className = 'flex shrink-0 flex-col items-end gap-1';
  const delta = document.createElement('span');
  const isCredit = entry.type === 'earned';
  delta.className = `text-base font-medium tabular-nums ${isCredit ? 'text-primary' : 'text-error'}`;
  delta.textContent = `${isCredit ? '+' : '-'}${formatPoints(entry.points)}`;
  const balance = document.createElement('span');
  balance.className = 'text-xs text-on-surface-variant tabular-nums';
  balance.textContent = `balance ${formatPoints(entry.balanceAfter)}`;
  amounts.append(delta, balance);

  item.append(iconWrap, info, amounts);
  return item;
}

async function init(session: SessionInfo, personId: string): Promise<void> {
  renderSessionNav(session);
  if (personApp) {
    personApp.hidden = false;
  }

  logoutButton?.addEventListener('click', () => {
    clearToken();
    renderSessionNav(null);
    redirectHome();
  });

  let loaded = 0;
  let total = 0;
  let loading = false;

  function updateFooterState(): void {
    if (entriesCount) {
      entriesCount.textContent = total > 0 ? `Showing ${loaded} of ${total}` : '';
    }
    if (entriesEmpty) {
      entriesEmpty.hidden = total !== 0;
    }
    if (loadMoreButton) {
      loadMoreButton.hidden = loaded >= total;
      loadMoreButton.disabled = loading;
    }
  }

  async function loadNextPage(): Promise<void> {
    if (loading) {
      return;
    }
    loading = true;
    if (entriesError) {
      entriesError.hidden = true;
    }
    updateFooterState();

    try {
      const page = await fetchPointsEntries(personId, PAGE_SIZE, loaded);
      if (entriesList) {
        const fragment = document.createDocumentFragment();
        for (const entry of page.entries) {
          fragment.append(renderEntry(entry));
        }
        entriesList.append(fragment);
      }
      loaded += page.entries.length;
      total = page.total;
    } catch (error) {
      if (handleSessionExpiry(error)) {
        return;
      }
      if (entriesError) {
        entriesError.textContent =
          error instanceof Error ? error.message : 'Could not load points history.';
        entriesError.hidden = false;
      }
    } finally {
      loading = false;
      if (entriesLoading) {
        entriesLoading.hidden = true;
      }
      updateFooterState();
    }
  }

  loadMoreButton?.addEventListener('click', () => {
    void loadNextPage();
  });

  try {
    const person = await fetchPerson(personId);
    renderPersonHeader(person);
  } catch (error) {
    if (!handleSessionExpiry(error)) {
      if (personName) {
        personName.textContent = 'Unknown member';
      }
    }
  }

  await loadNextPage();
}

const access = requireAccess();
if (access !== null) {
  void init(access.session, access.personId);
}

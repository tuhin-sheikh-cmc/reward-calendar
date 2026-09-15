import { Person } from '../types.js';
import { initialsAvatarUrl } from '../avatars.js';
import { formatPoints } from '../format.js';

export function createPersonCard(person: Person): HTMLElement {
  const card = document.createElement('article');
  card.className =
    'flex items-center gap-4 rounded-2xl bg-surface-container p-4 shadow-elevation-1 transition-shadow hover:shadow-elevation-2';

  const avatar = document.createElement('img');
  avatar.src = initialsAvatarUrl(person.name);
  avatar.alt = '';
  avatar.width = 64;
  avatar.height = 64;
  avatar.referrerPolicy = 'no-referrer';
  avatar.loading = 'lazy';
  avatar.className = 'h-16 w-16 shrink-0 rounded-full bg-surface-container-highest';

  const info = document.createElement('div');
  info.className = 'min-w-0 flex-1';

  const name = document.createElement('h2');
  name.textContent = person.name;
  name.className = 'truncate text-base font-medium text-on-surface';

  const role = document.createElement('p');
  role.textContent = 'Receiver';
  role.className = 'mt-0.5 text-sm text-on-surface-variant';

  info.append(name, role);

  const badge = document.createElement('div');
  badge.className = 'flex shrink-0 flex-col items-end gap-1';

  const points = document.createElement('span');
  points.textContent = formatPoints(person.pointsBalance);
  points.className = 'text-lg font-medium tabular-nums text-primary';

  const label = document.createElement('span');
  label.textContent = 'points earned';
  label.className = 'text-xs text-on-surface-variant';

  badge.append(points, label);

  card.append(avatar, info, badge);
  return card;
}
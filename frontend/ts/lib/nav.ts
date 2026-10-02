import { SessionInfo } from './types.js';

export function renderSessionNav(session: SessionInfo | null): void {
  const sessionControls = document.querySelector<HTMLElement>('#session-controls');
  const sessionName = document.querySelector<HTMLElement>('#session-name');
  const pointsLink = document.querySelector<HTMLElement>('#nav-points');

  if (sessionControls) {
    sessionControls.hidden = session === null;
  }
  if (sessionName) {
    sessionName.textContent = session?.name ?? '';
  }
  if (pointsLink) {
    pointsLink.hidden = session?.role !== 'provider';
  }
}

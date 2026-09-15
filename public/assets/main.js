"use strict";
(() => {
  // frontend/ts/lib/api.ts
  async function fetchReceivers() {
    const response = await fetch("/api/v1/persons", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const body = await response.json();
    return body.persons.filter(
      (person) => person.role === "receiver" && person.isActive
    );
  }

  // frontend/ts/lib/avatars.ts
  function initialsAvatarUrl(name) {
    const seed = encodeURIComponent(name.trim());
    return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4|c0aede|ffd5dc&fontWeight=500`;
  }

  // frontend/ts/lib/format.ts
  var numberFormat = new Intl.NumberFormat("en-US");
  function formatPoints(points) {
    return numberFormat.format(points);
  }

  // frontend/ts/lib/components/person-card.ts
  function createPersonCard(person) {
    const card = document.createElement("article");
    card.className = "flex items-center gap-4 rounded-2xl bg-surface-container p-4 shadow-elevation-1 transition-shadow hover:shadow-elevation-2";
    const avatar = document.createElement("img");
    avatar.src = initialsAvatarUrl(person.name);
    avatar.alt = "";
    avatar.width = 64;
    avatar.height = 64;
    avatar.referrerPolicy = "no-referrer";
    avatar.loading = "lazy";
    avatar.className = "h-16 w-16 shrink-0 rounded-full bg-surface-container-highest";
    const info = document.createElement("div");
    info.className = "min-w-0 flex-1";
    const name = document.createElement("h2");
    name.textContent = person.name;
    name.className = "truncate text-base font-medium text-on-surface";
    const role = document.createElement("p");
    role.textContent = "Receiver";
    role.className = "mt-0.5 text-sm text-on-surface-variant";
    info.append(name, role);
    const badge = document.createElement("div");
    badge.className = "flex shrink-0 flex-col items-end gap-1";
    const points = document.createElement("span");
    points.textContent = formatPoints(person.pointsBalance);
    points.className = "text-lg font-medium tabular-nums text-primary";
    const label = document.createElement("span");
    label.textContent = "points earned";
    label.className = "text-xs text-on-surface-variant";
    badge.append(points, label);
    card.append(avatar, info, badge);
    return card;
  }

  // frontend/ts/main.ts
  var cardsContainer = document.querySelector("#cards");
  var loadingSection = document.querySelector("#loading");
  var emptySection = document.querySelector("#empty");
  var errorSection = document.querySelector("#error");
  var errorMessage = document.querySelector("#error-message");
  var retryButton = document.querySelector("#retry");
  async function loadMembers() {
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
        errorMessage.textContent = error instanceof Error ? error.message : "Something went wrong";
      }
    } finally {
      loadingSection.hidden = true;
    }
  }
  function renderReceivers(receivers) {
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
  retryButton?.addEventListener("click", () => {
    void loadMembers();
  });
  void loadMembers();
})();
//# sourceMappingURL=main.js.map

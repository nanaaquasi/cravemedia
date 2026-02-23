import { createSupabaseClient } from "./lib/supabase";
import { fetchLists, type SavedList } from "./lib/api";
import { getAppUrl, setAppUrl, clearStoredSession } from "./lib/storage";
import { DEFAULT_APP_URL } from "./lib/config";

type View = "loading" | "auth" | "lists" | "error";

async function render(root: HTMLElement, view: View, data?: unknown) {
  root.innerHTML = "";

  const container = document.createElement("div");
  container.className = "popup";

  if (view === "loading") {
    container.innerHTML = '<div class="loading">Loading...</div>';
    root.appendChild(container);
    return;
  }

  const header = document.createElement("div");
  header.className = "popup-header";
  header.innerHTML = '<h1 class="popup-title">Craveo</h1>';
  container.appendChild(header);

  const content = document.createElement("div");
  content.className = "popup-content";

  if (view === "auth") {
    content.innerHTML = `
      <form class="auth-form" id="auth-form">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit" class="btn-primary">Sign in</button>
      </form>
    `;
    container.appendChild(content);
    root.appendChild(container);

    const form = document.getElementById("auth-form") as HTMLFormElement;
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const email = (fd.get("email") as string) || "";
      const password = (fd.get("password") as string) || "";
      await handleSignIn(root, email, password);
    });
    return;
  }

  if (view === "error") {
    content.innerHTML = `
      <div class="error">${(data as { message: string }).message}</div>
      <button class="btn-secondary" id="retry-btn">Retry</button>
    `;
    container.appendChild(content);
    root.appendChild(container);
    document.getElementById("retry-btn")?.addEventListener("click", () => {
      init(root);
    });
    await addFooter(container, root);
    root.appendChild(container);
    return;
  }

  if (view === "lists") {
    const lists = data as SavedList[];
    if (lists.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p>No saved lists yet.</p>
          <p style="margin-top: 8px; font-size: 13px;">Save collections on the site to see them here.</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">If you have lists on the site, check <strong>Site URL</strong> in options — it must match where you use the app (e.g. localhost:3000 or your production URL).</p>
          <button class="btn-secondary" id="refresh-lists-btn" style="margin-top: 12px;">Refresh</button>
        </div>
      `;
      document.getElementById("refresh-lists-btn")?.addEventListener("click", () => {
        init(root);
      });
    } else {
      const appUrl = (await getAppUrl()) || DEFAULT_APP_URL;
      const baseUrl = appUrl.replace(/\/$/, "");
      lists.forEach((list) => {
        const a = document.createElement("a");
        a.className = "list-item";
        a.href = list.isJourney
          ? `${baseUrl}/journey/${list.id}`
          : `${baseUrl}/collections/${list.id}`;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = `
          <div class="list-item-info">
            <div class="list-item-name">${escapeHtml(list.name)}</div>
            <div class="list-item-meta">${list.items.length} items</div>
          </div>
          <span class="list-item-arrow">→</span>
        `;
        content.appendChild(a);
      });
    }
    container.appendChild(content);
  }

  await addFooter(container, root);
  root.appendChild(container);
}

async function addFooter(container: HTMLDivElement, root: HTMLElement) {
  const footer = document.createElement("div");
  footer.className = "footer-actions";
  footer.innerHTML = `
    <a href="#" class="btn btn-secondary" id="open-site-btn">Open Craveo</a>
    <a href="#" class="btn btn-link" id="options-btn">Site URL</a>
    <a href="#" class="btn btn-link" id="signout-btn">Sign out</a>
  `;
  container.appendChild(footer);

  const appUrl = (await getAppUrl()) || DEFAULT_APP_URL;
  const baseUrl = appUrl.replace(/\/$/, "");

  document.getElementById("open-site-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: baseUrl });
  });

  document.getElementById("options-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("signout-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    await clearStoredSession();
    init(root);
  });
}

async function handleSignIn(
  root: HTMLElement,
  email: string,
  password: string,
) {
  await render(root, "loading");
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await init(root);
  } catch (err) {
    await render(root, "error", {
      message: err instanceof Error ? err.message : "Sign in failed",
    });
  }
}

async function init(root: HTMLElement) {
  await render(root, "loading");

  const supabase = createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    await render(root, "auth");
    return;
  }

  try {
    const { lists, error } = await fetchLists();
    if (error) throw new Error(error);
    await render(root, "lists", lists);
  } catch (err) {
    await render(root, "error", {
      message: err instanceof Error ? err.message : "Failed to load lists",
    });
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("root");
  if (root) init(root);
});

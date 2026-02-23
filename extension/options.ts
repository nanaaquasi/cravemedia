import { getAppUrl, setAppUrl } from "./lib/storage";
import { DEFAULT_APP_URL } from "./lib/config";

document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("app-url") as HTMLInputElement;
  const saveBtn = document.getElementById("save");

  const url = await getAppUrl();
  input.value = url || DEFAULT_APP_URL;

  saveBtn?.addEventListener("click", async () => {
    const value = input.value.trim();
    await setAppUrl(value || DEFAULT_APP_URL);
    alert("Saved!");
  });
});

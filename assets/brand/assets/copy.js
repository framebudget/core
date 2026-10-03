// Copy buttons: <button data-copy="text"> with an optional sibling status element.
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const label = button.querySelector("[data-copy-label]") || button;
  const original = label.textContent;
  let message = "Copied";
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
  } catch {
    message = "Press Ctrl+C";
    const cmd = button.parentElement.querySelector("[data-copy-source]");
    if (cmd) window.getSelection().selectAllChildren(cmd);
  }
  label.textContent = message;
  clearTimeout(button._reset);
  button._reset = setTimeout(() => {
    label.textContent = original;
  }, 1600);
});

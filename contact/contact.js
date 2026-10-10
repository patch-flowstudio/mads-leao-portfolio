(() => {
  const email = document.querySelector("#contact-email");
  const copy = document.querySelector(".contact-copy");
  const status = document.querySelector(".contact-status");
  copy.hidden = false;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email.value);
      status.textContent = "Email copied.";
    } catch {
      email.focus();
      email.select();
      email.setSelectionRange(0, email.value.length);
      status.textContent = "Email selected. Use your browser's Copy option.";
    }
  });
})();

(() => {
  const dialog = document.querySelector('#book-dialog');
  const cover = document.querySelector('#dialog-cover');
  const title = document.querySelector('#dialog-title');
  const author = document.querySelector('#dialog-author');
  const amazonLink = document.querySelector('#amazon-link');
  const closeButton = document.querySelector('.book-dialog-close');
  if (!dialog || !cover || !title || !author || !amazonLink || !closeButton) return;

  document.querySelectorAll('.book-card').forEach((card) => {
    card.addEventListener('click', () => {
      const image = card.querySelector('.book-cover');
      cover.src = image.currentSrc || image.src;
      cover.alt = image.alt;
      title.textContent = card.dataset.title;
      author.textContent = card.dataset.author;
      const search = new URL("https://www.amazon.com.au/s");
      search.searchParams.set("k", `${card.dataset.title} ${card.dataset.author}`);
      search.searchParams.set("i", "stripbooks");
      amazonLink.href = search.toString();
      dialog.showModal();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();



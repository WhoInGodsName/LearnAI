(() => {
  const dialog = document.querySelector('#book-dialog');
  const cover = document.querySelector('#dialog-cover');
  const title = document.querySelector('#dialog-title');
  const author = document.querySelector('#dialog-author');
  const closeButton = document.querySelector('.book-dialog-close');
  if (!dialog || !cover || !title || !author || !closeButton) return;

  document.querySelectorAll('.book-card').forEach((card) => {
    card.addEventListener('click', () => {
      const image = card.querySelector('.book-cover');
      cover.src = image.currentSrc || image.src;
      cover.alt = image.alt;
      title.textContent = card.dataset.title;
      author.textContent = card.dataset.author;
      dialog.showModal();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();

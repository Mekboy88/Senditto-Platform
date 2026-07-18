(() => {
  function closeActivityMenus(event) {
    const page = document.querySelector('.dashboard-content');
    if (!page || page.querySelector('h1')?.textContent?.trim() !== 'Email activity') return;

    const filter = page.querySelector('.activity-filter');
    const menu = filter?.querySelector(':scope > div');
    if (menu && !event.target.closest('.activity-filter')) {
      filter.querySelector(':scope > button')?.click();
    }
  }

  document.addEventListener('click', closeActivityMenus);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const page = document.querySelector('.dashboard-content');
    if (page?.querySelector('h1')?.textContent?.trim() !== 'Email activity') return;
    const filter = page.querySelector('.activity-filter');
    if (filter?.querySelector(':scope > div')) filter.querySelector(':scope > button')?.click();
    document.querySelector('.row-menu-dismiss')?.click();
  });
})();

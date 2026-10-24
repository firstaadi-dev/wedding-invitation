// Satu pola submenu untuk Detail Acara, Pesan & Preview, dan Foto & Lagu.
function sectionNavigation(sections, prefix, label) {
  const nav=document.createElement('nav');
  nav.className='event-section-nav';
  nav.setAttribute('aria-label',label);
  nav.innerHTML=`<p class="event-nav-title">${esc(label)}</p><div class="event-section-buttons">${sections.map(section=>`<button type="button" data-section="${section.id}" aria-controls="${prefix}-part-${section.id}"><span>${esc(section.title)}</span><small>${esc(section.short)}</small></button>`).join('')}</div><label class="event-mobile-select">Bagian yang diatur<select id="${prefix}-section-select">${sections.map(section=>`<option value="${section.id}">${esc(section.title)}</option>`).join('')}</select></label><p class="event-nav-help">Berpindah bagian tidak menghapus isian.</p>`;
  return nav;
}

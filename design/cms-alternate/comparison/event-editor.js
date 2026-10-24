// Presentasi Detail Acara saja: gunakan field dan handler simulasi yang sudah ada.
(() => {
  const page = $('#page-acara');
  const form = $('#event-form');
  const layout = $('.event-layout', page);
  const panels = [...form.children].filter(el => el.matches('.panel'));
  const footer = $('.form-footer', form);
  $('.event-note', layout).remove();
  layout.className = 'event-editor-layout';
  $('#acara-title').nextElementSibling.textContent = 'Atur informasinya per bagian. Simpan semua perubahan sekaligus.';

  const sections = [
    {id:'pasangan', title:'Pasangan & keluarga', short:'Nama mempelai dan orang tua', description:'Siapa yang merayakan hari istimewa ini? Tulis nama lengkap beserta gelar bila diperlukan.', panels:[panels[0],panels[1]]},
    {id:'waktu', title:'Acara & waktu', short:'Tanggal, rangkaian, countdown', description:'Satukan tanggal dan rangkaian acara, lalu tentukan waktu tujuan hitung mundur dalam WIB.', panels:[panels[2],panels[3]]},
    {id:'lokasi', title:'Lokasi acara', short:'Tempat dan Google Maps', description:'Bantu tamu menemukan tempat acara dengan nama lokasi dan peta yang tepat.', panels:[panels[4]]},
    {id:'hadiah', title:'Hadiah', short:'Rekening atau alamat pengiriman', description:'Pilih apakah informasi hadiah ditampilkan. Isian tetap tersimpan saat bagian ini disembunyikan.', panels:[panels[5]]},
    {id:'akses', title:'Akses undangan', short:'Pengaturan limit akses', description:'Pengaturan lanjutan untuk akses tamu. Ini menghitung browser, bukan jumlah orang yang hadir.', panels:[panels[6]]},
  ];
  const navigation = sectionNavigation(sections,'event','Informasi undangan');

  const overview = document.createElement('details');
  overview.className = 'event-overview';
  overview.open = matchMedia('(min-width:1200px)').matches;
  overview.innerHTML = `<summary>Ringkasan isian ${icon('right')}</summary><div class="event-overview-content"><h2 id="event-couple-summary"></h2><dl><div><dt>Tanggal acara</dt><dd id="event-date-summary"></dd></div><div><dt>Rangkaian acara</dt><dd id="event-schedule-summary"></dd></div><div><dt>Tempat</dt><dd id="event-venue-summary"></dd></div><div><dt>Tujuan countdown</dt><dd id="event-countdown-summary"></dd></div><div><dt>Informasi hadiah</dt><dd id="event-gift-summary"></dd></div><div><dt>Batas akses</dt><dd id="event-access-summary"></dd></div></dl><p>Ringkasan mengikuti isian saat ini. Tekan Simpan untuk menerapkan perubahan.</p></div>`;
  // Ikon panah bawah memakai geometri SVG, tidak memakai glyph dekoratif.
  $('summary svg',overview).innerHTML='<path d="m6 9 6 6 6-6"/>';
  layout.prepend(navigation, overview);
  matchMedia('(min-width:1200px)').addEventListener('change',event=>{overview.open=event.matches;});
  sections.forEach(section => {
    const wrapper = document.createElement('section');
    wrapper.id = `event-part-${section.id}`;
    wrapper.className = 'event-part';
    wrapper.setAttribute('aria-labelledby',`event-part-title-${section.id}`);
    wrapper.innerHTML = `<header class="event-part-heading"><h2 id="event-part-title-${section.id}" tabindex="-1">${section.title}</h2><p>${section.description}</p></header>`;
    section.panels.forEach(panel => {
      const heading = $('h2',panel);
      if (heading) { const replacement=document.createElement('h3'); replacement.innerHTML=heading.innerHTML; heading.replaceWith(replacement); }
      wrapper.append(panel);
    });
    form.append(wrapper);
  });
  const pager = document.createElement('div');
  pager.className='event-part-pager';
  pager.innerHTML='<button id="event-previous" type="button">Sebelumnya</button><span id="event-part-position"></span><button id="event-next" type="button"></button>';
  form.append(pager);
  footer.className='form-footer event-save-bar';
  $('button',footer).setAttribute('form','event-form');
  const scope=document.createElement('p');scope.className='event-save-scope';scope.textContent='Menyimpan semua bagian Detail Acara.';
  footer.prepend(scope);
  page.append(footer);

  let active=0;
  function showSection(id, focus=true) {
    active=sections.findIndex(section=>section.id===id);
    if(active<0) active=0;
    sections.forEach((section,index)=>{$(`#event-part-${section.id}`).hidden=index!==active;});
    $$('[data-section]',navigation).forEach(button=>{
      if(button.dataset.section===sections[active].id)button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    $('#event-section-select').value=sections[active].id;
    $('#event-part-position').textContent=`Bagian ${active+1} dari ${sections.length}`;
    $('#event-previous').disabled=active===0;
    $('#event-next').disabled=active===sections.length-1;
    $('#event-next').innerHTML=active===sections.length-1?'Bagian terakhir':`Lanjut: ${sections[active+1].title} ${icon('right')}`;
    if(focus){$(`#event-part-title-${sections[active].id}`).focus({preventScroll:true});form.scrollIntoView({block:'start',behavior:'instant'});}
  }
  $$('[data-section]',navigation).forEach(button=>button.onclick=()=>showSection(button.dataset.section));
  $('#event-section-select').onchange=e=>showSection(e.target.value);
  $('#event-previous').onclick=()=>showSection(sections[active-1].id);
  $('#event-next').onclick=()=>showSection(sections[active+1].id);

  const value = name => form.elements.namedItem(name)?.value.trim() || '';
  function updateOverview() {
    $('#event-couple-summary').textContent=`${value('partnerOneName')||'Mempelai pertama'} & ${value('partnerTwoName')||'Mempelai kedua'}`;
    const date = value('eventDate');
    const parsedDate=new Date(`${date}T00:00:00Z`);
    $('#event-date-summary').textContent=!date?'Mengikuti tanggal bawaan':Number.isNaN(parsedDate.getTime())?'Tanggal belum valid':new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(parsedDate);
    const schedule=$('#event-schedule-summary');schedule.replaceChildren();
    for(const prefix of ['ceremony','reception']){const line=document.createElement('span');line.textContent=`${value(prefix+'Title')||'Nama acara belum diisi'} · ${value(prefix+'Time')||'Waktu akan diinformasikan'}`;schedule.append(line);}
    $('#event-venue-summary').textContent=value('venueName')||'Mengikuti tempat bawaan';
    $('#event-countdown-summary').textContent=`${value('countdownTime')||'00:00'} WIB · tanggal acara`;
    const gifts=$$('#gift-items .gift-item').length;
    $('#event-gift-summary').textContent=$('#gift-toggle').getAttribute('aria-checked')==='true'?`Ditampilkan · ${gifts} informasi`:`Disembunyikan · ${gifts} informasi tetap tersimpan`;
    $('#event-access-summary').textContent=value('deviceLimitEnabled')==='false'?'Tanpa limit global':`${value('deviceLimit')||'—'} browser per undangan`;
  }
  function keepFieldVisible(field){if(!field?.matches('input,select,textarea')||!form.contains(field))return;const rect=field.getBoundingClientRect();const bottom=footer.classList.contains('has-changes')?Math.min(footer.getBoundingClientRect().top-16,innerHeight-16):innerHeight-16;if(rect.bottom>bottom||rect.top<16)field.scrollIntoView({block:'center',behavior:'instant'});}
  form.addEventListener('focusin',event=>keepFieldVisible(event.target));
  new MutationObserver(()=>{if($('#event-state').textContent!=='Pengaturan tersimpan')footer.classList.add('has-changes');keepFieldVisible(document.activeElement);}).observe($('#event-state'),{childList:true,characterData:true,subtree:true});
  form.addEventListener('input',updateOverview);
  form.addEventListener('change',updateOverview);
  form.addEventListener('click',updateOverview);
  // Tampilkan bagian field invalid sebelum browser memindahkan fokus ke field itu.
  const save=form.onsubmit;
  form.noValidate=true;
  form.onsubmit=e=>{
    e.preventDefault();
    const invalid=[...form.elements].find(field=>field.willValidate&&!field.checkValidity());
    if(invalid){const section=invalid.closest('.event-part');showSection(section.id.replace('event-part-',''));invalid.focus();invalid.reportValidity();return;}
    // Validasi URL peta mengikuti handler studi lama, termasuk bagian yang tersembunyi.
    const map=form.elements.mapEmbedUrl;
    if(map.value.trim()){
      let valid=false;
      try{const url=new URL(map.value);valid=url.origin==='https://www.google.com'&&url.pathname.startsWith('/maps/embed')&&!url.username&&!url.password;}catch{}
      if(!valid){showSection('lokasi');}
    }
    save.call(form,e);
  };
  new MutationObserver(()=>{const busy=form.getAttribute('aria-busy')==='true';$$('button,select',navigation).forEach(control=>control.disabled=busy);}).observe(form,{attributes:true,attributeFilter:['aria-busy']});
  showSection('pasangan',false);
  updateOverview();
})();

// Kedua Studio memakai node dan handler studi yang sama; tidak ada API atau persistensi baru.
(() => {
  const page=$('#page-pesan'), form=$('#message-form'), layout=$('.messages-layout',page);
  const [template,metadata]=[...form.children];
  template.id='message-part-template';metadata.id='message-part-link';
  template.setAttribute('aria-labelledby','message-template-heading');
  $('h2',template).id='message-template-heading';
  metadata.setAttribute('aria-labelledby','message-link-heading');
  $('h2',metadata).id='message-link-heading';
  $('h2',metadata).textContent='Tampilan pratinjau tautan';
  const thumbnail=$('.thumbnail-panel',page);
  const editor=document.createElement('div');editor.id='message-editor';editor.className='message-editor-pane';
  form.before(editor);editor.append(form,thumbnail);
  const preview=$('.previews',page);
  const messagePanel=preview.children[0], metadataPanel=preview.children[1];
  const bubble=$('.message-bubble',messagePanel), metadataCard=$('.metadata-preview',metadataPanel);
  bubble.prepend(metadataCard);
  $('h2',messagePanel).textContent='Pratinjau pesan WhatsApp final';
  $('h2',messagePanel).id='message-final-heading';
  $('h2',messagePanel).nextElementSibling.textContent='Contoh untuk Keluarga Arunika. Gambar, kartu tautan, dan isi pesan tampil bersama.';
  const previewDisclaimer=document.createElement('p');previewDisclaimer.className='help';previewDisclaimer.textContent='Simulasi konten final. Tampilan dan cache WhatsApp dapat berbeda.';
  messagePanel.append(previewDisclaimer);metadataPanel.remove();
  preview.className='message-preview-pane';preview.id='message-preview-pane';preview.setAttribute('aria-labelledby','message-final-heading');
  layout.className='message-workspace';layout.dataset.view='edit';
  const sections=[
    {id:'template',title:'Pesan WhatsApp',short:'Template dan token tamu'},
    {id:'link',title:'Pratinjau tautan',short:'Judul, deskripsi, dan gambar'},
  ];
  const nav=sectionNavigation(sections,'message','Pesan undangan');
  const column=document.createElement('div');column.className='message-content-column';
  const viewSwitch=document.createElement('div');viewSwitch.className='message-view-switch';viewSwitch.setAttribute('role','group');viewSwitch.setAttribute('aria-label','Tampilan pesan');
  viewSwitch.innerHTML=`<button type="button" data-message-view="edit" aria-controls="message-editor" aria-pressed="true">${icon('edit')}Edit</button><button type="button" data-message-view="preview" aria-controls="message-preview-pane" aria-pressed="false">Pratinjau final</button>`;
  const area=document.createElement('div');area.className='message-content-area';area.append(editor,preview);column.append(viewSwitch,area);layout.prepend(nav);layout.append(column);
  $('#pesan-title').nextElementSibling.textContent='Atur pesannya per bagian. Lihat hasil WhatsApp lengkap dalam satu pratinjau.';
  const saveBar=$('.save-actions',page);saveBar.className='message-save-bar';
  const scope=document.createElement('p');scope.className='message-save-scope';scope.textContent='Simpan template, judul, dan deskripsi bersama. Gambar diunggah terpisah.';saveBar.prepend(scope);layout.after(saveBar);
  $('.help',thumbnail).textContent='Pilih berkas, lalu Unggah. Tindakan ini terpisah dari Simpan pesan dan pratinjau.';

  function setView(view){layout.dataset.view=view;$$('[data-message-view]',viewSwitch).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.messageView===view)));}
  function setPart(part,focus=true){
    template.hidden=part!=='template';metadata.hidden=part!=='link';thumbnail.hidden=part!=='link';
    $$('[data-section]',nav).forEach(button=>{if(button.dataset.section===part)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    $('#message-section-select').value=part;
    if(focus){const heading=$('h2',part==='template'?template:metadata);heading.tabIndex=-1;heading.focus({preventScroll:true});column.scrollIntoView({block:'start',behavior:'instant'});}
  }
  $$('[data-section]',nav).forEach(button=>button.onclick=()=>setPart(button.dataset.section));
  $('#message-section-select').onchange=e=>setPart(e.target.value);
  $$('[data-message-view]',viewSwitch).forEach(button=>button.onclick=()=>setView(button.dataset.messageView));
  const save=form.onsubmit;form.noValidate=true;
  form.onsubmit=e=>{e.preventDefault();const invalid=[...form.elements].find(field=>field.willValidate&&!field.checkValidity());if(invalid){setPart(template.contains(invalid)?'template':'link');setView('edit');invalid.focus();invalid.reportValidity();return;}save.call(form,e);};
  function keepFieldVisible(field){if(!field?.matches('input,textarea,select'))return;const rect=field.getBoundingClientRect();const bottom=saveBar.classList.contains('has-changes')?Math.min(saveBar.getBoundingClientRect().top-16,innerHeight-16):innerHeight-16;if(rect.bottom>bottom||rect.top<16)field.scrollIntoView({block:'center',behavior:'instant'});}
  editor.addEventListener('focusin',e=>keepFieldVisible(e.target));
  new MutationObserver(()=>{const busy=form.getAttribute('aria-busy')==='true';$$('button,select',nav).forEach(control=>control.disabled=busy);}).observe(form,{attributes:true,attributeFilter:['aria-busy']});
  new MutationObserver(()=>{if($('#message-state').textContent!=='Pengaturan tersimpan')saveBar.classList.add('has-changes');if(editor.contains(document.activeElement))keepFieldVisible(document.activeElement);}).observe($('#message-state'),{childList:true,characterData:true,subtree:true});
  setPart('template',false);
})();

(() => {
  const page=$('#page-media');
  $('#media-title').nextElementSibling.textContent='Foto pasangan, koleksi galeri, dan musik. Kelola satu per satu dengan jelas.';
  const info=$('.info',page);
  info.className='media-format-note';
  info.textContent='2 foto pasangan · 9 foto galeri · 1 lagu. Foto maksimal 12 MiB, audio maksimal 25 MiB.';
  const sections=[
    {id:'couple',title:'Foto pasangan',short:'Dua foto mempelai'},
    {id:'gallery',title:'Galeri undangan',short:'Sembilan slot foto'},
    {id:'music',title:'Lagu undangan',short:'Musik latar acara'},
  ];
  const nav=sectionNavigation(sections,'media','Media undangan');
  const workspace=document.createElement('div');workspace.className='media-workspace';
  const content=document.createElement('div');content.className='media-content-column';
  const titles=$$('.section-title',page);
  const musicHelp=$('#music-media').previousElementSibling;
  const panels=[['couple',titles[0],$('#couple-media')],['gallery',titles[1],$('#gallery-media')],['music',titles[2],musicHelp,$('#music-media')]];
  panels.forEach(([id,...nodes])=>{const panel=document.createElement('section');panel.id=`media-part-${id}`;panel.className='media-part';panel.setAttribute('aria-labelledby',`media-part-title-${id}`);nodes.forEach(node=>panel.append(node));const heading=$('h2',panel);heading.id=`media-part-title-${id}`;heading.tabIndex=-1;content.append(panel);});
  info.after(workspace);workspace.append(nav,content);
  function selectPart(part,focus=true){if(part!=='music')$('audio',$('#music-media'))?.pause();$$('.media-part',content).forEach(panel=>panel.hidden=panel.id!==`media-part-${part}`);$$('[data-section]',nav).forEach(button=>{if(button.dataset.section===part)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});$('#media-section-select').value=part;if(focus){$(`#media-part-title-${part}`).focus({preventScroll:true});content.scrollIntoView({block:'start',behavior:'instant'});}}
  $$('[data-section]',nav).forEach(button=>button.onclick=()=>selectPart(button.dataset.section));
  $('#media-section-select').onchange=e=>selectPart(e.target.value);
  selectPart('couple',false);
  const coupleCards=$$('#couple-media .media-card');
  const gallery=$('#gallery-media');
  const galleryCards=[...gallery.children];

  coupleCards.forEach(card=>{
    card.classList.add('couple-photo-card');
    const controls=document.createElement('div');controls.className='couple-photo-controls';controls.hidden=true;
    [...card.children].filter(el=>!el.matches('h3,.media-display')).forEach(el=>controls.append(el));
    const button=document.createElement('button');button.type='button';button.className='couple-edit-button';button.setAttribute('aria-expanded','false');
    button.innerHTML=`${icon('edit')}<span>Kelola foto</span>`;
    button.onclick=()=>{const open=controls.hidden;controls.hidden=!open;button.setAttribute('aria-expanded',String(open));button.innerHTML=`${icon(open?'close':'edit')}<span>${open?'Tutup editor':'Kelola foto'}</span>`;};
    card.append(button,controls);
  });

  gallery.className='gallery-workbench';
  const tiles=document.createElement('div');tiles.className='gallery-tile-grid';tiles.setAttribute('role','group');tiles.setAttribute('aria-label','Sembilan slot galeri');
  const inspector=document.createElement('div');inspector.className='gallery-slot-editor';inspector.id='gallery-slot-editor';
  const dialog=document.createElement('dialog');dialog.id='gallery-slot-dialog';dialog.className='gallery-slot-dialog';dialog.setAttribute('aria-labelledby','gallery-dialog-title');
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="gallery-dialog-title">Kelola foto galeri</h2><button class="icon-button quiet" type="button" aria-label="Tutup editor foto">${icon('close')}</button></div><div class="gallery-dialog-body"></div>`;
  gallery.prepend(tiles,inspector);gallery.append(dialog);galleryCards.forEach(card=>inspector.append(card));
  let active=galleryCards[0],trigger;
  const mobile=matchMedia('(max-width:899px)');
  const tileButtons=[];
  galleryCards.forEach((card,index)=>{
    card.id=`gallery-editor-${index+1}`;
    const heading=$('h3',card);heading.tabIndex=-1;
    const tile=document.createElement('button');tile.type='button';tile.className='gallery-tile';tile.dataset.gallerySlot=card.dataset.slot;
    tile.innerHTML=`<span class="gallery-tile-image">${icon('plus')}</span><span class="gallery-tile-caption"><strong>Foto ${index+1}</strong><span class="gallery-tile-state">Belum diunggah</span></span>`;
    tile.onclick=()=>{
      active=card;galleryCards.forEach(other=>other.hidden=other!==card);refresh();
      if(mobile.matches){trigger=tile;$('.gallery-dialog-body',dialog).append(card);dialog.showModal();heading.focus();}
      else heading.focus({preventScroll:true});
    };
    tiles.append(tile);tileButtons.push(tile);
    new MutationObserver(refresh).observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-busy','hidden','class']});
  });
  function refresh(){
    let installed=0;
    galleryCards.forEach((card,index)=>{
      const tile=tileButtons[index];if(!tile)return;
      const img=$('.media-display img',card),busy=card.getAttribute('aria-busy')==='true',failed=$('.media-feedback',card).classList.contains('error');
      const picked=$('input[type=file]',card).files.length>0;
      if(img)installed++;
      tile.setAttribute('aria-pressed',String(card===active));
      tile.setAttribute('aria-controls',mobile.matches?'gallery-slot-dialog':card.id);
      if(mobile.matches)tile.setAttribute('aria-haspopup','dialog');else tile.removeAttribute('aria-haspopup');
      const state=busy?'Memproses…':failed?'Unggah belum berhasil':picked?'Berkas dipilih':img?'Terpasang':'Belum diunggah';
      $('.gallery-tile-state',tile).textContent=state;
      tile.setAttribute('aria-label',`Kelola Galeri ${index+1}, ${state}`);
      const area=$('.gallery-tile-image',tile);
      if(img){if(!$('img',area)||$('img',area).src!==img.src){const preview=img.cloneNode();preview.alt='';area.replaceChildren(preview);}}
      else if($('img',area)||!area.children.length)area.innerHTML=icon('plus');
    });
    $('#gallery-count').textContent=`${installed}/9 terpasang`;
    $('button',dialog).disabled=active.getAttribute('aria-busy')==='true';
  }
  $('button',dialog).onclick=()=>{if(active.getAttribute('aria-busy')!=='true')dialog.close();};
  dialog.addEventListener('cancel',e=>{if(active.getAttribute('aria-busy')==='true')e.preventDefault();});
  dialog.addEventListener('close',()=>{inspector.append(active);if(trigger?.isConnected&&trigger.getClientRects().length)trigger.focus();else $(`#page-${currentPage} h1`)?.focus();});
  mobile.addEventListener('change',()=>{if(dialog.open)dialog.close();refresh();});
  galleryCards.forEach(card=>{card.hidden=card!==active;});
  refresh();
  // Native file input change updates tile labels while keeping the selected File in place.
  gallery.addEventListener('change',refresh);
  const music=$('[data-slot=music]',page);
  music.classList.add('compact-music-card');
  const note=document.createElement('p');note.className='music-empty-note';note.textContent='Belum ada lagu. Pilih audio, lalu Unggah untuk memasangnya.';
  $('.media-display',music).after(note);
  new MutationObserver(()=>{note.hidden=!!$('audio',music);}).observe($('.media-display',music),{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{if(location.hash!=='#media'){$('audio',music)?.pause();if(dialog.open)dialog.close();}});
})();

// Keep delete/disclosure locked while the existing upload handler owns its File.
$$('#page-pesan .media-card, #page-media .media-card').forEach(card=>{
  new MutationObserver(()=>{
    const busy=card.getAttribute('aria-busy')==='true';
    $('.remove',card).disabled=busy;
    const disclosure=$('.couple-edit-button',card);if(disclosure)disclosure.disabled=busy;
  }).observe(card,{attributes:true,attributeFilter:['aria-busy']});
});

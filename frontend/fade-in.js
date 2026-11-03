export const fadeInSections = [
  {id:'sampul', label:'Sampul', selector:'.envelope-card', staticDefault:true},
  {id:'ayat', label:'Ayat pembuka', selector:'.verse-scene .scene-copy', staticDefault:true},
  {id:'mempelai', label:'Foto mempelai', selector:'.portrait-paper'},
  {id:'acara', label:'Acara & hitung mundur', selector:'.event-paper,.countdown'},
  {id:'lokasi', label:'Kartu lokasi & peta', selector:'.location-paper'},
  {id:'galeri', label:'Galeri', selector:'.gallery-album'},
  {id:'sumbangan', label:'Tanda kasih', selector:'.gift-paper'},
  {id:'konfirmasi', label:'Konfirmasi & ucapan', selector:'.response-scene .guest-paper,.wishes-area'},
  {id:'penutup', label:'Penutup', selector:'.farewell-scene .scene-copy', staticDefault:true},
];

export const fadeInAnimations = [
  {id:'alternate', label:'Bergantian kiri / kanan'},
  {id:'fade', label:'Fade-in dari tengah (tanpa geser)'},
  {id:'up', label:'Fade-in dari bawah'},
  {id:'down', label:'Fade-in dari atas'},
  {id:'left', label:'Fade-in dari kiri'},
  {id:'right', label:'Fade-in dari kanan'},
  {id:'zoom', label:'Fade-in dari tengah dengan zoom'},
  {id:'arch', label:'Arch Reveal · bukaan lengkung', description:'Konten tersingkap dari bawah melalui bukaan lengkung.'},
  {id:'curtain', label:'Curtain Reveal · tirai tengah', description:'Bukaan dari tengah melebar ke kedua sisi.'},
  {id:'unfold', label:'Paper Unfold · lipatan kertas', description:'Kartu membuka dari lipatan dengan perspektif lembut.'},
  {id:'focus', label:'Soft Focus · kabur ke tajam', description:'Konten yang sedikit kabur perlahan menjadi tajam.'},
  {id:'layered', label:'Layered Entrance · masuk berurutan', description:'Isi kartu muncul berurutan dengan jeda pendek.'},
  {id:'fan', label:'Photo Fan · susunan foto', description:'Foto atau elemen kartu masuk dari susunan bertumpuk, lalu menyebar.'},
  {id:'ink', label:'Ink Reveal · sapuan tulisan', description:'Sapuan dari kiri membuka kartu, disusul tulisan di dalamnya.'},
  {id:'botanical', label:'Botanical Reveal · dedaunan', description:'Dua lapis dedaunan membuka dan memperlihatkan konten.'},
  {id:'depth', label:'Depth Arrival · kedalaman', description:'Kartu mendekat dari kedalaman, lalu berhenti rata.'},
];

// Preview the same directions as the invitation's card-reveal styles.
export function fadeInPreviewFrames(animation = 'alternate') {
  const effects = {
    arch:[{opacity:0,clipPath:'ellipse(50% 0% at 50% 100%)',scale:'1.06'}, {opacity:1,clipPath:'ellipse(75% 150% at 50% 100%)',scale:'1'}],
    curtain:[{opacity:.3,clipPath:'inset(0 50% 0 50%)'}, {opacity:1,clipPath:'inset(0 0% 0 0%)'}],
    unfold:[{opacity:0,transform:'perspective(1000px) rotateX(-65deg)',transformOrigin:'50% 0%'}, {opacity:1,transform:'perspective(1000px) rotateX(0deg)',transformOrigin:'50% 0%'}],
    focus:[{opacity:0,filter:'blur(6px)',scale:'1.04'}, {opacity:1,filter:'blur(0px)',scale:'1'}],
    layered:[{opacity:0,translate:'0 16px'}, {opacity:1,translate:'0 0'}],
    fan:[{opacity:0,scale:'.94'}, {opacity:1,scale:'1'}],
    ink:[{opacity:.3,clipPath:'inset(0 100% 0 0)'}, {opacity:1,clipPath:'inset(0 0% 0 0)'}],
    botanical:[{opacity:.2}, {opacity:1}],
    depth:[{opacity:0,transform:'perspective(1000px) translateZ(-160px) rotateX(12deg)',translate:'0 24px'}, {opacity:1,transform:'perspective(1000px) translateZ(0px) rotateX(0deg)',translate:'0 0'}],
  };
  if (effects[animation]) return effects[animation];
  const transforms = {
    alternate:'translateX(-48px)', fade:'none', up:'translateY(48px)',
    down:'translateY(-48px)', left:'translateX(-48px)',
    right:'translateX(48px)', zoom:'scale(.9)',
  };
  return [{opacity:0, transform:transforms[animation] || transforms.alternate},
    {opacity:1, transform:'none'}];
}

export const complexFadeInAnimations = new Set(['arch','curtain','unfold','focus','layered','fan','ink','botanical','depth']);

// Used by both the CMS preview and public invitation. Every run is bounded by duration.
export function playFadeIn(element, effect = 'alternate', duration = 2) {
  if (!element?.animate) return {cancel(){}};
  const animations = [];
  const decorations = [];
  const ms = Math.min(10,Math.max(.1,Number(duration) || 2))*1000;
  const animate = (node,frames,delay=0,length=ms) => animations.push(node.animate(frames,{
    duration:length,delay,easing:complexFadeInAnimations.has(effect) ? 'cubic-bezier(.2,.65,.3,1)' : 'cubic-bezier(.22,1,.36,1)',fill:'backwards',
  }));
  animate(element,fadeInPreviewFrames(effect));
  if (['layered','fan','ink'].includes(effect)) {
    let children;
    if (effect === 'fan') children = [...element.querySelectorAll('#gallery-thumbnails button,.transition-photo')];
    if (effect === 'ink') children = [...element.querySelectorAll('h1,h2,h3,p,strong')];
    if (!children?.length) children = [...element.children].filter(node=>!['SCRIPT','STYLE'].includes(node.tagName));
    children = children.slice(0,8);
    children.forEach((child,index)=>{
      const delay = children.length > 1 ? index/(children.length-1)*ms*.3 : 0;
      const frames = effect === 'fan'
        ? [{opacity:0,translate:`${(children.length/2-index)*14}px 32px`,rotate:`${(index-children.length/2)*5}deg`,scale:'.85'}, {opacity:1,translate:'0 0',rotate:'0deg',scale:'1'}]
        : effect === 'ink'
          ? [{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0% 0 0)'}]
          : [{opacity:0,translate:'0 24px'}, {opacity:1,translate:'0 0'}];
      animate(child,frames,delay,ms*.7);
    });
  }
  if (effect === 'botanical') {
    for (const direction of [-1,1]) {
      const leaf = element.ownerDocument.createElement('i');
      leaf.className = 'transition-foliage';
      leaf.setAttribute('aria-hidden','true');
      leaf.style.setProperty('--leaf-side',String(direction));
      element.append(leaf);decorations.push(leaf);
      animate(leaf,[{opacity:1,translate:`${direction*15}% 0`,scale:'1.2'}, {opacity:0,translate:`${direction*110}% 0`,scale:'1'}]);
    }
    Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))).then(()=>decorations.forEach(node=>node.remove()));
  }
  return {cancel(){animations.forEach(animation=>animation.cancel());decorations.forEach(node=>node.remove());}};
}

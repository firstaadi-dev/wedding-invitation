export function entranceProgress(top, height, viewport) {
  return Math.min(1, Math.max(0, -top / Math.max(1, height - viewport)));
}

export function sectionProgress(top, viewport) {
  return 1 - Math.min(1, Math.max(0, top / Math.max(1, viewport)));
}

if (typeof document !== 'undefined') {
  const cover = document.querySelector('.entrance-track');
  const picture = document.querySelector('.entrance-picture');
  const copy = document.querySelector('.cover-copy');
  const seal = document.querySelector('.envelope-seal');
  const flaps = [...document.querySelectorAll('.envelope-flap')];
  const entranceTrees = [...document.querySelectorAll('.entrance-trees')];
  const scenes = [...document.querySelectorAll('.scene')].map(section => ({
    section,
    content: section.querySelector('.scene-copy'),
    backdrop: section.querySelector('.forest-backdrop'),
    trees: [...section.querySelectorAll('.trees')],
  }));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;

  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => {
      for (const {target,isIntersecting} of entries) {
        if (!isIntersecting) continue;
        target.classList.add('is-revealed');
        observer.unobserve(target);
      }
    },{rootMargin:'0px 0px -64px 0px'});
    document.querySelectorAll('.portrait-paper,.countdown,.event-paper,.location-paper,.gallery-album,.guest-paper,.wishes-area').forEach((card,index) => {
      card.classList.add('reveal-card');
      if (index % 2) card.classList.add('reveal-right');
      observer.observe(card);
    });
  }

  function render() {
    frame = null;
    const viewport = window.innerHeight;
    const foregroundSpeed = window.innerWidth <= 600 ? 32 : 65;
    const rect = cover.getBoundingClientRect();
    const progress = motion.matches ? 0 : entranceProgress(rect.top, rect.height, viewport);
    picture.style.transform = `scale(${1 + progress * 1.85})`;
    copy.style.opacity = String(Math.max(0, 1 - progress * 1.8));
    flaps.forEach((flap, index) => {
      flap.style.transform = `rotateY(${(index === 0 ? -1 : 1) * progress * 135}deg)`;
    });
    seal.style.opacity = String(Math.max(0, 1 - progress * 4));
    copy.inert = progress > .65;
    entranceTrees.forEach((tree, index) => {
      tree.style.transform = `translateX(${(index === 0 ? -1 : 1) * progress * 180}px) scale(${1 + progress * .6})`;
    });
    scenes.forEach(({section, content, backdrop, trees}) => {
      const bounds = section.getBoundingClientRect();
      section.classList.toggle('is-in-view', bounds.bottom > 0 && bounds.top < viewport && !motion.matches);
      if (bounds.bottom < -200 || bounds.top > viewport + 200) return;
      const arrival = motion.matches ? 0 : 1 - sectionProgress(bounds.top, viewport);
      const depth = window.innerWidth <= 600 ? 60 : 120;
      content.style.transform = `perspective(1400px) translate3d(0, ${arrival * 48}px, ${-arrival * depth}px) rotateX(${arrival * 7}deg)`;
      content.style.opacity = String(1 - arrival * .45);
      const distance = motion.matches ? 0 : (viewport / 2 - bounds.top - bounds.height / 2) / viewport;
      backdrop.style.transform = `translate3d(0, ${Math.max(-70, Math.min(70, distance * 40))}px, 0) scale(${motion.matches ? 1 : 1.04})`;
      trees.forEach((tree, index) => {
        tree.style.transform = `translateY(${Math.max(-110, Math.min(110, distance * -foregroundSpeed))}px) rotate(${distance * (index === 0 ? 1 : -1) * 1.8}deg)`;
      });
    });
  }

  function schedule() {
    if (frame === null) frame = window.requestAnimationFrame(render);
  }

  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule);
  motion.addEventListener('change', schedule);
  document.querySelector('#open-invitation').addEventListener('click', () => {
    const heading = document.querySelector('#verse-title');
    document.querySelector('.verse-scene').scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth'});
    heading.focus({preventScroll: true});
  });
  schedule();
}

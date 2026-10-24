const directions=document.querySelector('.directions');
const conceptTitles={studio:'Studio','studio-v2':'Studio V2'};
let width='1440';
function update(){const page=document.querySelector('#review-page').value;directions.classList.toggle('mobile',width==='390');document.querySelectorAll('article[data-concept]').forEach(article=>{const name=article.dataset.concept;article.querySelector('img').src=`screenshots/${name}-${page}${page==='tamu'?'-cover':''}-${width}.png`;article.querySelector('img').alt=`Pratinjau ${conceptTitles[name]}: ${document.querySelector('#review-page option:checked').textContent}, ${width==='390'?'mobile':'desktop'}`;article.querySelectorAll('a').forEach(a=>a.href=`${name}.html#${page}`);});}
document.querySelectorAll('[data-width]').forEach(button=>button.onclick=()=>{width=button.dataset.width;document.querySelectorAll('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();});
document.querySelector('#review-page').onchange=update;

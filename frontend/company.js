const tryButton = document.querySelector('#try-lock');
const result = document.querySelector('#lock-result');
const reset = document.querySelector('#reset-lock');
tryButton.addEventListener('click', () => {
  result.hidden = false;
  tryButton.hidden = true;
  reset.focus({preventScroll: true});
});
reset.addEventListener('click', () => {
  result.hidden = true;
  tryButton.hidden = false;
  tryButton.focus({preventScroll: true});
});

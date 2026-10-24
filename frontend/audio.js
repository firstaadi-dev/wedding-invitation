export function playAudio(audio, onError) {
  if (audio.error) audio.load();
  return audio.play().catch(onError);
}

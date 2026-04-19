
class SoundService {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;

  constructor() {
    // Preload common sounds
    this.loadSound('click', 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    this.loadSound('strike', 'https://assets.mixkit.co/active_storage/sfx/1084/1084-preview.mp3');
    this.loadSound('pocket', 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    this.loadSound('start', 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    this.loadSound('win', 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
    this.loadSound('splash', 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3');
  }

  private loadSound(name: string, url: string) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.sounds[name] = audio;
  }

  play(name: string) {
    if (!this.enabled) return;
    const sound = this.sounds[name];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.log('Sound play error:', e));
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }
}

export default new SoundService();

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImgSkeletonDirective } from './img-skeleton';

@Component({
  imports: [ImgSkeletonDirective],
  template: `<img appImgSkeleton alt="" width="10" height="10" />`,
})
class HostComponent {}

describe('ImgSkeletonDirective', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    const fire = (type: 'load' | 'error') => {
      img.dispatchEvent(new Event(type));
      fixture.detectChanges();
    };
    return { img, fire };
  };

  it('shows the shimmer until the image loads', () => {
    const { img } = setup();
    expect(img.classList).toContain('img-loading');
  });

  it('appears at once when it loads straight away (cached)', () => {
    const { img, fire } = setup();
    fire('load');
    expect(img.classList).not.toContain('img-loading');
    expect(img.classList).not.toContain('img-fade-in');
  });

  it('fades in when it took a while to load', () => {
    let now = 0;
    spyOn(performance, 'now').and.callFake(() => now);
    const { img, fire } = setup();
    now = 500;
    fire('load');
    expect(img.classList).not.toContain('img-loading');
    expect(img.classList).toContain('img-fade-in');
  });

  it('drops the shimmer without fading when the image fails', () => {
    let now = 0;
    spyOn(performance, 'now').and.callFake(() => now);
    const { img, fire } = setup();
    now = 500;
    fire('error');
    expect(img.classList).not.toContain('img-loading');
    expect(img.classList).not.toContain('img-fade-in');
  });
});

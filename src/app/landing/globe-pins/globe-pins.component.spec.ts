import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GlobePinsComponent, labelPlacement } from 'src/app/landing/globe-pins/globe-pins.component';
import { ScreenPoint } from 'src/app/shared/three/globe/globe-math';
import { GLOBE_PINS, resolvePinLinks } from 'src/app/shared/three/globe/globe-pins';

describe('GlobePinsComponent', () => {
  let fixture: ComponentFixture<GlobePinsComponent>;
  let el: HTMLElement;

  const links = resolvePinLinks(GLOBE_PINS.slice(0, 3), [{ id: 'g1', gameName: 'Elden Ring' }]);
  const point = (depth: number, front = depth > 0.05): ScreenPoint => ({ x: 100, y: 80, front, depth });

  const anchors = () => Array.from(el.querySelectorAll<HTMLAnchorElement>('a.globe-pin'));
  const visibleLabelText = () =>
    Array.from(el.querySelectorAll<HTMLElement>('.globe-pin__label'))
      .filter((l) => getComputedStyle(l).visibility !== 'hidden')
      .map((l) => l.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .join(' ')
      .trim();

  const render = (points: ScreenPoint[]) => {
    fixture.componentRef.setInput('points', points);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobePinsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(GlobePinsComponent);
    fixture.componentRef.setInput('links', links);
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders one link per pin with its accessible name and href', () => {
    render([point(0.6), point(0.9), point(0.3)]);
    expect(anchors().length).toBe(3);
    expect(anchors()[0].getAttribute('aria-label')).toBe('Most wanted in Tokyo: Elden Ring');
    expect(anchors()[0].getAttribute('href')).toBe('/games/g1');
    expect(anchors()[1].getAttribute('href')).toBe('/games');
  });

  it('hides back-facing pins from pointer, tab order and screen readers', () => {
    render([point(0.6), point(-0.4, false), point(0.3)]);
    const back = anchors()[1];
    expect(back.getAttribute('tabindex')).toBe('-1');
    expect(back.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(back).visibility).toBe('hidden');
    expect(getComputedStyle(back).pointerEvents).toBe('none');
    expect(anchors()[0].getAttribute('tabindex')).toBeNull();
    expect(anchors()[0].getAttribute('aria-hidden')).toBeNull();
  });

  it('labels the front-most pin when nothing is hovered', () => {
    render([point(0.6), point(0.9), point(0.3)]);
    expect(visibleLabelText()).toContain('Most wanted in Seoul');
    expect(visibleLabelText()).toContain('League of Legends');
  });

  it('labels the focused pin instead', () => {
    render([point(0.6), point(0.9), point(0.3)]);
    anchors()[0].dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(visibleLabelText()).toContain('Most wanted in Tokyo');
    expect(visibleLabelText()).not.toContain('Seoul');
  });

  it('shows no label when no front pin is deep enough', () => {
    render([point(0.3), point(0.3), point(0.3)]);
    expect(visibleLabelText()).toBe('');
  });

  it('flips the label left at the viewport edge and centres it when neither side fits', () => {
    const room = { left: 700, right: 740 }; // desktop: box starts 700px from the left edge
    expect(labelPlacement(300, room)).toBe('right');
    expect(labelPlacement(600, room)).toBe('left');
    const phone = { left: 23, right: 367 };
    expect(labelPlacement(100, phone)).toBe('right');
    expect(labelPlacement(170, phone)).toBe('center');
    expect(labelPlacement(300, phone)).toBe('left');
    expect(labelPlacement(600, null)).toBe('right'); // unmeasured keeps the reference side
  });

  it('applies the placement class from the measured room', () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.cssText = 'position: fixed; left: 0; top: 0; width: 300px; height: 300px;';
    document.body.appendChild(host);
    render([point(0.3), point(0.9), point(0.3)]);
    TestBed.tick(); // afterNextRender measures the host
    const vw = document.documentElement.clientWidth;
    const at = (x: number) => {
      render([point(0.3), { ...point(0.9), x }, point(0.3)]);
      return el.querySelector('.globe-pin__label')?.className ?? '';
    };
    expect(at(10)).not.toMatch(/--(left|center)/);
    expect(at(vw - 10)).toContain('globe-pin__label--left');
    host.remove();
  });

  it('reports pin hover so the host can pause the spin', () => {
    const hovers: (number | null)[] = [];
    fixture.componentInstance.pinHover.subscribe((h) => hovers.push(h));
    render([point(0.6), point(0.9), point(0.3)]);
    anchors()[1].dispatchEvent(new MouseEvent('mouseenter'));
    anchors()[1].dispatchEvent(new MouseEvent('mouseleave'));
    expect(hovers).toEqual([1, null]);
  });

  it('renders nothing until points match links', () => {
    render([]);
    expect(anchors().length).toBe(0);
  });
});

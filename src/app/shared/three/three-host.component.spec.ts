import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThreeHostComponent } from 'src/app/shared/three/three-host.component';
import { WEBGL_SUPPORT } from 'src/app/shared/three/webgl-support';
import { SceneFactory, SceneHandle } from 'src/app/shared/three/scene-types';

const fakeHandle = (): jasmine.SpyObj<SceneHandle> =>
  jasmine.createSpyObj('SceneHandle', ['start', 'stop', 'renderOnce', 'setPointer', 'setDrag', 'dispose']);

@Component({
  imports: [ThreeHostComponent],
  template: `<app-three-host [sceneLoader]="loader" [reducedMotion]="reduced" poster="assets/3d/game-case-poster.png" label="3D game case" (ready)="handle.set($event)" />`,
})
class HostSpec {
  handle = signal<SceneHandle | null>(null);
  loader: () => Promise<SceneFactory> = () => Promise.resolve(() => Promise.resolve(fakeHandle()));
  reduced: boolean | null = false;
}

/**
 * Render, let afterNextRender fire, then flush the async loader -> factory
 * promise chain with a macrotask so the scene load resolves deterministically
 * (whenStable alone does not track the component's un-tracked promises).
 */
const settle = async (fixture: ComponentFixture<HostSpec>): Promise<void> => {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
};

const setup = async (webgl: boolean): Promise<ComponentFixture<HostSpec>> => {
  await TestBed.configureTestingModule({
    imports: [HostSpec],
    providers: [{ provide: WEBGL_SUPPORT, useValue: () => webgl }],
  }).compileComponents();
  return TestBed.createComponent(HostSpec);
};

describe('ThreeHostComponent', () => {
  it('shows the poster and never loads the scene when WebGL is unsupported', async () => {
    const fixture = await setup(false);
    const loader = jasmine.createSpy('loader').and.callFake(fixture.componentInstance.loader);
    fixture.componentInstance.loader = loader;
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('canvas.three-host__canvas--on')).toBeFalsy();
    expect(loader).not.toHaveBeenCalled();
  });

  it('loads the scene, emits ready, and starts the loop when WebGL is supported', async () => {
    const handle = fakeHandle();
    const fixture = await setup(true);
    fixture.componentInstance.loader = () => Promise.resolve(() => Promise.resolve(handle));
    await settle(fixture);
    expect(handle.start).toHaveBeenCalled();
    expect(handle.renderOnce).not.toHaveBeenCalled();
    expect(fixture.componentInstance.handle()).toBe(handle);
    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('canvas.three-host__canvas--on')).toBeTruthy();
    const host: HTMLElement = fixture.nativeElement.querySelector('app-three-host');
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('3D game case'); // name survives the poster swap
  });

  it('renders a single static frame instead of looping under reduced motion', async () => {
    const handle = fakeHandle();
    const fixture = await setup(true);
    fixture.componentInstance.reduced = true;
    fixture.componentInstance.loader = () => Promise.resolve(() => Promise.resolve(handle));
    await settle(fixture);
    expect(handle.renderOnce).toHaveBeenCalled();
    expect(handle.start).not.toHaveBeenCalled();
    expect(fixture.componentInstance.handle()).toBe(handle);
  });

  it('falls back to the poster when the scene loader rejects', async () => {
    const fixture = await setup(true);
    const warn = spyOn(console, 'warn');
    fixture.componentInstance.loader = () => Promise.reject(new Error('404'));
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
    expect(warn).toHaveBeenCalledWith('three-host scene failed', jasmine.any(Error));
    expect(fixture.componentInstance.handle()).toBeNull();
  });

  it('disposes the handle on destroy', async () => {
    const handle = fakeHandle();
    const fixture = await setup(true);
    fixture.componentInstance.loader = () => Promise.resolve(() => Promise.resolve(handle));
    await settle(fixture);
    fixture.destroy();
    expect(handle.dispose).toHaveBeenCalled();
  });

  it('never builds the scene when destroyed while the loader is pending', async () => {
    const handle = fakeHandle();
    const factory = jasmine.createSpy('factory').and.resolveTo(handle);
    let resolveLoader!: (factory: SceneFactory) => void;
    const pending = new Promise<SceneFactory>((resolve) => (resolveLoader = resolve));
    const fixture = await setup(true);
    fixture.componentInstance.loader = () => pending;
    await settle(fixture); // init() is now awaiting the pending loader
    fixture.destroy();
    resolveLoader(factory);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(factory).not.toHaveBeenCalled(); // no GPU context is ever created
    expect(handle.start).not.toHaveBeenCalled();
    expect(fixture.componentInstance.handle()).toBeNull();
  });

  it('disposes a scene that finishes building after destroy, without starting it', async () => {
    const handle = fakeHandle();
    let resolveFactory!: (handle: SceneHandle) => void;
    const pendingHandle = new Promise<SceneHandle>((resolve) => (resolveFactory = resolve));
    const fixture = await setup(true);
    fixture.componentInstance.loader = () => Promise.resolve(() => pendingHandle);
    await settle(fixture); // init() is now awaiting the pending factory
    fixture.destroy();
    resolveFactory(handle);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(handle.dispose).toHaveBeenCalled();
    expect(handle.start).not.toHaveBeenCalled();
    expect(handle.renderOnce).not.toHaveBeenCalled();
    expect(fixture.componentInstance.handle()).toBeNull();
  });
});

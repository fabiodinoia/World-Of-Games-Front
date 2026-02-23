import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { Game, gameCategory } from 'src/app/types/types';

type CoverSource = {
  id: string;
  src: string;
  label: string;
};

interface CoverCard extends CoverSource {
  angle: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('coverExperience') coverExperience?: ElementRef<HTMLElement>;
  @ViewChild('ringOrbit') ringOrbit?: ElementRef<HTMLElement>;
  @ViewChild('ringPlanet') ringPlanet?: ElementRef<HTMLElement>;
  @ViewChildren('coverCard') coverCardsRefs?: QueryList<ElementRef<HTMLElement>>;

  readonly coverCards: CoverCard[];
  readonly ringRadius = 380;

  featuredGames: Game[] = [];

  readonly categoryLinks: { label: string; value: gameCategory; icon: string }[] = [
    { label: 'RPG', value: 'RPG', icon: 'auto_awesome' },
    { label: 'Action', value: 'Action', icon: 'bolt' },
    { label: 'MOBA', value: 'MOBA', icon: 'groups' },
    { label: 'FPS', value: 'FPS', icon: 'gps_fixed' },
    { label: 'MMO', value: 'MMO', icon: 'public' },
  ];

  isMobile = false;
  private gsapContext?: gsap.Context;
  private removeScrollListener?: () => void;
  private readonly destroy$ = new Subject<void>();
  private static scrollTriggerRegistered = false;

  private readonly coverSources: CoverSource[] = [
    { id: 'er', src: '/assets/covers/er-cover.jpeg', label: 'Elden Ring cover art' },
    { id: 'ff', src: '/assets/covers/ff-cover.jpeg', label: 'Final Fantasy cover art' },
    { id: 'e33', src: '/assets/covers/e33-cover.jpeg', label: 'Expedition 33 cover art' },
    { id: 'kh', src: '/assets/covers/kh-cover.jpeg', label: 'Kingdom Hearts cover art' },
    { id: 'lol', src: '/assets/covers/lol-cover.jpeg', label: 'League of Legends cover art' },
    { id: 'fifa', src: '/assets/covers/fifa-cover.jpeg', label: 'FIFA cover art' },
    { id: 'gow', src: '/assets/covers/gow-cover.jpeg', label: 'God of War cover art' },
    { id: 'gta', src: '/assets/covers/gta-cover.jpeg', label: 'Grand Theft Auto cover art' },
    { id: 'sm', src: '/assets/covers/sm-cover.jpeg', label: 'Spider-Man cover art' },
    { id: 'valorant', src: '/assets/covers/v-cover.jpeg', label: 'Valorant cover art' },
  ];

  constructor(
    private readonly ngZone: NgZone,
    private readonly gameSrv: RepoGameService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const total = this.coverSources.length;
    this.coverCards = this.coverSources.map((card, index) => ({
      ...card,
      angle: (index / total) * 360,
    }));
  }

  ngOnInit(): void {
    this.gameSrv
      .loadAllGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe((games) => {
        this.featuredGames = games.slice(0, 4);
        this.cdr.markForCheck();
      });
  }

  trackByGameId(_index: number, game: Game): string {
    return game.id ?? '';
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!HomeComponent.scrollTriggerRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      HomeComponent.scrollTriggerRegistered = true;
    }

    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }

      // Always reset to the top so the hero animation plays from the beginning
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 16); // catch late restoration
    }

    this.isMobile = window.innerWidth <= 640;

    requestAnimationFrame(() => {
      if (!this.isMobile) {
        if (typeof window !== 'undefined' && window.scrollY > 0) {
          window.scrollTo(0, 0);
        }
        this.initGsapAnimation();
      }
    });
  }

  @HostListener('window:resize')
  onViewportChange(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const nextIsMobile = window.innerWidth <= 640;

    if (nextIsMobile === this.isMobile) {
      return;
    }

    this.isMobile = nextIsMobile;

    if (this.isMobile) {
      this.destroyGsap();
    } else {
      this.initGsapAnimation();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyGsap();
  }

  private initGsapAnimation(): void {
    if (!this.coverExperience || !this.ringOrbit || !this.coverCardsRefs?.length) {
      return;
    }

    this.destroyGsap();

    const orbit = this.ringOrbit.nativeElement;
    const planet = this.ringPlanet?.nativeElement;
    const cards = this.coverCardsRefs.toArray().map((ref) => ref.nativeElement);

    this.ngZone.runOutsideAngular(() => {
      this.gsapContext = gsap.context(() => {
        gsap.set(orbit, { rotationX: 68, rotationY: -30, z: -140 });
        gsap.set(cards, { force3D: true });
        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: 'power2.out' },
        });

        timeline.to(
          orbit,
          {
            rotationX: 20,
            rotationY: 320,
            z: -20,
            duration: 2,
            ease: 'power2.inOut',
          },
          0,
        );

        timeline.fromTo(
          cards,
          {
            autoAlpha: 0,
            visibility: 'hidden',
            x: 220,
            y: 240,
            rotationX: -28,
            rotationZ: 18,
            scale: 0.6,
            immediateRender: false,
          },
          {
            autoAlpha: 1,
            visibility: 'visible',
            x: 0,
            y: (index) => ((index % 2 === 0 ? -1 : 1) * 16),
            rotationX: -4,
            rotationZ: 0,
            scale: 1,
            duration: 1.2,
            stagger: { each: 0.12 },
            ease: 'power3.out',
          },
          0,
        );

        if (planet) {
          timeline.to(
            planet,
            {
              scale: 1.08,
              boxShadow: '0 0 80px rgba(84, 173, 255, 0.8)',
              duration: 1.8,
              ease: 'sine.inOut',
            },
            0,
          );
        }

        let hasPlayed = false;
        const threshold = 40;

        const playTimeline = () => {
          if (hasPlayed) {
            return;
          }
          hasPlayed = true;
          this.removeScrollListener?.();
          this.removeScrollListener = undefined;
          timeline.play(0);
        };

        if (window.scrollY > threshold) {
          playTimeline();
        } else {
          const onScroll = () => {
            if (window.scrollY > threshold) {
              playTimeline();
            }
          };

          window.addEventListener('scroll', onScroll, { passive: true });
          this.removeScrollListener = () => window.removeEventListener('scroll', onScroll);
        }

        // Scroll Animation for "seating down"
        const scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: this.coverExperience?.nativeElement,
            start: 'top top',
            end: '+=800',
            scrub: 1,
            pin: true,
          },
        });

        if (planet) {
          scrollTimeline.to(planet, {
            y: 800,
            opacity: 0,
            scale: 0.5,
            duration: 1,
          }, 0);
        }

        scrollTimeline.to(orbit, {
          y: 0,
          rotationX: 0, // flatten the ring
          duration: 1,
        }, 0);
        
        // Move cards to a new layout (e.g. grid or line) could go here
        scrollTimeline.to(cards, {
           y: 0,
           rotationX: 0,
           stagger: 0.05,
        }, 0);

      });
    });
  }

  private destroyGsap(): void {
    this.ngZone.runOutsideAngular(() => {
      this.removeScrollListener?.();
      this.removeScrollListener = undefined;
      this.gsapContext?.revert();
      if (HomeComponent.scrollTriggerRegistered) {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      }
      this.gsapContext = undefined;
    });
  }
}

import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HomeComponent } from './home.component';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { createGameServiceMock, mockGame } from 'src/app/utils/mocks';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let gameSrv: ReturnType<typeof createGameServiceMock>;

  beforeEach(async () => {
    gameSrv = createGameServiceMock();
    gameSrv.loadAllGames.and.returnValue(
      of(Array.from({ length: 6 }, () => mockGame)),
    );
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: RepoGameService, useValue: gameSrv },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads at most 4 featured games without requiring auth', () => {
    expect(gameSrv.loadAllGames).toHaveBeenCalled();
    expect(component.featuredGames().length).toBe(4);
    expect(
      fixture.nativeElement.querySelectorAll('.featured-card').length,
    ).toBe(4);
  });

  it('spotlights the newest release and builds genre shelves', () => {
    const games = [
      { ...mockGame, id: 'a', category: 'RPG' as const, releaseDate: '2019-01-01', price: 10 },
      { ...mockGame, id: 'b', category: 'RPG' as const, releaseDate: '2025-04-24', price: 20 },
      { ...mockGame, id: 'c', category: 'FPS' as const, releaseDate: '2020-06-02', price: 0 },
    ];
    gameSrv.loadAllGames.and.returnValue(of(games));
    component.ngOnInit();
    expect(component.spotlight()?.id).toBe('b');
    expect(component.shelves().map((s) => s.title)).toEqual(['RPG', 'Free to play']);
    expect(component.countLabel('RPG')).toBe('2 games');
    expect(component.countLabel('Indie')).toBe('Nothing listed yet');
  });

  it('exposes the category shortcuts', () => {
    expect(component.categoryLinks.map((c) => c.value)).toEqual([
      'Action',
      'Adventure',
      'RPG',
      'FPS',
      'MOBA',
      'MMO',
      'Sports',
      'Strategy',
      'Indie',
    ]);
  });
});

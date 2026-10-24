import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RepoGameService } from './game.services.service';
import { gameBl, mockTestData, TestApiGameUrl } from 'src/app/utils/mocks';
import { provideHttpClient } from '@angular/common/http';

describe('RepoGameService', () => {
  let service: RepoGameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RepoGameService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(console, 'error');
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('createGame should POST the game and unwrap the created game', () => {
    const created = { ...gameBl, id: 'new-id' };
    service.createGame(gameBl).subscribe((g) => expect(g).toEqual(created));
    const req = httpMock.expectOne(TestApiGameUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(gameBl);
    req.flush({ results: [created] });
  });

  it('loadGame should GET a single game by id', () => {
    service.loadGame('test').subscribe((g) => expect(g).toEqual(gameBl));
    const req = httpMock.expectOne(TestApiGameUrl + 'test');
    expect(req.request.method).toBe('GET');
    req.flush({ results: [gameBl] });
  });

  it('loadAllGames should unwrap results[0] and cache it in games$', () => {
    let cached: unknown;
    service.games$.subscribe((g) => (cached = g));
    service.loadAllGames().subscribe((g) => expect(g).toEqual(mockTestData));
    const req = httpMock.expectOne(TestApiGameUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ results: [mockTestData] });
    expect(cached).toEqual(mockTestData);
  });

  it('cachedGame returns entries from the last catalog load', () => {
    service.loadAllGames().subscribe();
    httpMock.expectOne(TestApiGameUrl).flush({ results: [mockTestData] });
    expect(service.cachedGame('test')).toEqual(mockTestData[0]);
    expect(service.cachedGame('nope')).toBeUndefined();
  });

  it('queryGame should hit the filter endpoint for a category', () => {
    service.queryGame('MMO').subscribe((g) => expect(g).toEqual(mockTestData));
    const req = httpMock.expectOne(TestApiGameUrl + 'filter/MMO');
    expect(req.request.method).toBe('GET');
    req.flush({ results: [mockTestData] });
  });

  it('queryGame should hit the list endpoint for "all" and ""', () => {
    service.queryGame('all').subscribe();
    service.queryGame('').subscribe();
    const reqs = httpMock.match(TestApiGameUrl);
    expect(reqs.length).toBe(2);
    reqs.forEach((r) => r.flush({ results: [mockTestData] }));
  });

  it('updateGame should PUT to the game id', () => {
    service.updateGame('test', gameBl).subscribe();
    const req = httpMock.expectOne(TestApiGameUrl + 'test');
    expect(req.request.method).toBe('PUT');
    req.flush(gameBl);
  });

  it('deleteGame should DELETE the game id', () => {
    service.deleteGame('test').subscribe();
    const req = httpMock.expectOne(TestApiGameUrl + 'test');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should rethrow HTTP errors', () => {
    let failed = false;
    service.loadGame('x').subscribe({ error: () => (failed = true) });
    httpMock
      .expectOne(TestApiGameUrl + 'x')
      .flush('nope', { status: 500, statusText: 'Server Error' });
    expect(failed).toBeTrue();
    expect(console.error).toHaveBeenCalled();
  });
});

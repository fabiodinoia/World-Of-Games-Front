import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  ServerCompleteUserResponse,
  ServerLoginResponse,
} from '../types/server.response';
import { Game, LoggedUser, Login, User } from '../types/types';
import { environment } from 'src/environments/environment';

export const mockPass = 'pass';

export const mockUser1: User = {
  name: 'John Doe',
  email: 'johndoe@example.com',
  password: mockPass,
  img: '',
  id: '123',
};

export const mockGame: Game = {
  gameName: 'test',
  category: 'MMO',
  description: 'test',
  img: '',
  price: 20,
  releaseDate: 'test',
  owner: mockUser1,
  id: '12345678',
};
export const mockGame1: Game = {
  gameName: 'test',
  category: 'MMO',
  description: 'test12',
  img: '',
  price: 20,
  releaseDate: 'test',
  owner: mockUser1,
  id: '123',
};

export const mockUser: User = {
  id: '12345',
  name: 'John Doe',
  email: 'johndoe@example.com',
  password: mockPass,
  img: '',
  cart: [mockGame, mockGame1],
};
export const mockUser3: User = {
  id: '6789',
  name: 'Fabio',
  email: 'Fab@example.com',
  password: mockPass,
  img: '',
  cart: [mockGame, mockGame1],
};

export const mockLogged: LoggedUser = {
  id: '2132454',
  email: 'johndoe@example.com',
  role: 'admin',
};

export const mockRoute = {
  url: { path: '/login' },
};
export const mockRouteParam = {
  url: { path: '/users/' },
  params: { id: '12345' },
};

export const mockToken =
  'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJpZCI6IiIsImVtYWlsIjoiIiwicm9sZSI6IiIsImlhdCI6MTY3OTA0ODgwNH0.U8s8UMTJddjfXH_qbxiJJ5GuJeEhryxFmv8d8DBMsycVTt-k1sdAFEq9yRUXbawo';

export const mockGametoUp = {
  id: '123456',
  gameName: 'Test Game',
  releaseDate: '2022-01-01',
  category: 'Action',
  price: 59.99,
  description: 'Test description',
  img: 'test.png',
} as unknown as Game;

export const mockLogin: Login = {
  email: 'TestMail',
  password: mockPass,
};
export const mockResp1: ServerCompleteUserResponse = {
  results: [mockUser],
};
export const mockResp2: ServerCompleteUserResponse = {
  results: [mockUser3],
};

export const mockEvent = {
  target: {
    files: [
      {
        name: 'test',
        size: 0,
        type: 'image/png',
      },
    ],
  },
};

export const mockResp: ServerLoginResponse = {
  results: { token: mockToken },
};

export const reqFlush = {
  results: [
    {
      id: 'test1',
      gameName: 'test',
      category: 'MMO',
      releaseDate: 'test',
      description: 'test',
      img: '',
      price: 25,
    },
  ],
};

export const gameBl = {
  id: 'test',
  gameName: 'test',
  category: 'MMO',
  releaseDate: 'test',
  description: 'test',
  img: '',
  price: 25,
} as Game;

export const id = 'test';

export const mockTestData = [
  {
    id: 'test',
    gameName: 'test',
    category: 'MMO',
    releaseDate: 'test',
    description: 'test',
    img: '',
    price: 25,
  },
  {
    id: 'test',
    gameName: 'test',
    category: 'MMO',
    releaseDate: 'test',
    description: 'test',
    img: '',
    price: 25,
  },
] as unknown as Game[];

export const TestApiUserUrl = `${environment.apiUrl}/users`;
export const TestApiGameUrl = `${environment.apiUrl}/games/`;

/** Fresh RepoUserService double per test (avoids state leaking between specs). */
export const createUserServiceMock = (logged: LoggedUser = mockLogged) => ({
  loginUser: jasmine.createSpy('loginUser').and.returnValue(of(mockToken)),
  registerUser: jasmine.createSpy('registerUser').and.returnValue(of(mockUser)),
  getCurrentUser: jasmine
    .createSpy('getCurrentUser')
    .and.returnValue(of(mockUser)),
  updateUser: jasmine.createSpy('updateUser').and.returnValue(of(mockUser)),
  deleteUser: jasmine.createSpy('deleteUser').and.returnValue(of(undefined)),
  addToCart: jasmine.createSpy('addToCart').and.returnValue(of(mockUser)),
  logout: jasmine.createSpy('logout'),
  restoreSession: jasmine.createSpy('restoreSession'),
  userLogged$: new BehaviorSubject<LoggedUser>(logged),
  token$: new BehaviorSubject<string>(logged.id ? 'TestToken' : ''),
  currentUser$: new BehaviorSubject<User>(mockUser),
});

/** Fresh RepoGameService double per test. */
export const createGameServiceMock = () => ({
  createGame: jasmine.createSpy('createGame').and.returnValue(of(mockGame)),
  updateGame: jasmine.createSpy('updateGame').and.returnValue(of(mockGame)),
  deleteGame: jasmine.createSpy('deleteGame').and.returnValue(of(undefined)),
  loadGame: jasmine.createSpy('loadGame').and.returnValue(of(mockGame)),
  loadAllGames: jasmine
    .createSpy('loadAllGames')
    .and.returnValue(of([mockGame, mockGame1])),
  queryGame: jasmine
    .createSpy('queryGame')
    .and.returnValue(of([mockGame, mockGame1])),
  cachedGame: jasmine.createSpy('cachedGame').and.returnValue(undefined),
  gameInfo$: new BehaviorSubject<Game>({} as Game),
  /** Catalog snapshot; empty by default so consumers fall back to loadAllGames(). */
  games$: new BehaviorSubject<Game[]>([]),
});

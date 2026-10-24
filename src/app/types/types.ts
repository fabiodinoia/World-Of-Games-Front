import { gameCategory } from './categories';

export type User = {
  id?: string;
  name: string;
  email: string;
  password: string;
  img: string;
  cart?: Game[];
  myGames?: Game[];
  address?: string;
};

/** Payload for PUT /users/:id — the API stores cart/library entries as game ids. */
export type UserUpdate = Partial<Omit<User, 'cart' | 'myGames'>> & {
  cart?: string[];
};

export type { gameCategory } from './categories';

export type Game = {
  id?: string;
  gameName: string;
  category: gameCategory;
  releaseDate: string;
  img: string;
  price: number;
  /** Populated user object, or a bare user id depending on the endpoint. */
  owner?: Partial<User> | string;
  description: string;
};

export type Token = {
  results: {
    token: string;
  };
};

export interface MenuItems {
  label: string;
  path: string;
  icon: string;
}

export interface LoggedUser {
  id: string;
  email: string;
  role: string;
}

export interface RegisterUser {
  name: string;
  email: string;
  password: string;
  img: string;
}

export interface Login {
  email: string;
  password: string;
}

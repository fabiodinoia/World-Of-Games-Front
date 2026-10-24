import { User } from './types';

export type ServerLoginResponse = {
  results: { token: string };
};

export type ServerCompleteUserResponse = {
  results: User[];
};

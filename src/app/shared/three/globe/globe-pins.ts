export interface GlobePin {
  city: string;
  lat: number;
  lon: number;
  game: string;
}

export const GLOBE_PINS: readonly GlobePin[] = [
  { city: 'Tokyo', lat: 35.7, lon: 139.7, game: 'Elden Ring' },
  { city: 'Seoul', lat: 37.5, lon: 127.0, game: 'League of Legends' },
  { city: 'Madrid', lat: 40.4, lon: -3.7, game: 'FIFA 23' },
  { city: 'Los Angeles', lat: 34.0, lon: -118.2, game: 'Grand Theft Auto V' },
  { city: 'São Paulo', lat: -23.5, lon: -46.6, game: 'Valorant' },
  { city: 'Paris', lat: 48.8, lon: 2.3, game: 'Clair Obscur: Expedition 33' },
  { city: 'New York', lat: 40.7, lon: -74.0, game: 'God of War' },
  { city: 'Sydney', lat: -33.9, lon: 151.2, game: 'Final Fantasy XIV' },
  { city: 'Berlin', lat: 52.5, lon: 13.4, game: 'Kingdom Hearts III' },
];

export interface PinLink extends GlobePin {
  href: string;
  label: string;
}

export function resolvePinLinks(
  pins: readonly GlobePin[],
  games: readonly { id?: string; gameName: string }[],
): PinLink[] {
  return pins.map((pin) => {
    const match = games.find((g) => g.gameName === pin.game);
    return {
      ...pin,
      href: match?.id ? `/games/${match.id}` : '/games',
      label: `Most wanted in ${pin.city}: ${pin.game}`,
    };
  });
}

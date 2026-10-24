import {
  GLOBE_PINS,
  resolvePinLinks,
} from 'src/app/shared/three/globe/globe-pins';

describe('globe-pins', () => {
  it('has the 9 spec cities with their games', () => {
    expect(GLOBE_PINS.map((p) => p.city)).toEqual([
      'Tokyo',
      'Seoul',
      'Madrid',
      'Los Angeles',
      'São Paulo',
      'Paris',
      'New York',
      'Sydney',
      'Berlin',
    ]);
    expect(GLOBE_PINS.find((p) => p.city === 'Madrid')).toEqual({
      city: 'Madrid',
      lat: 40.4,
      lon: -3.7,
      game: 'FIFA 23',
    });
  });

  it('links found games to their detail page', () => {
    const [madrid] = resolvePinLinks(
      [GLOBE_PINS[2]],
      [{ id: 'g1', gameName: 'FIFA 23' }],
    );
    expect(madrid.href).toBe('/games/g1');
    expect(madrid.label).toBe('Most wanted in Madrid: FIFA 23');
  });

  it('falls back to the catalog when a game is missing or has no id', () => {
    expect(resolvePinLinks([GLOBE_PINS[2]], [])[0].href).toBe('/games');
    expect(
      resolvePinLinks([GLOBE_PINS[2]], [{ gameName: 'FIFA 23' }])[0].href,
    ).toBe('/games');
  });
});

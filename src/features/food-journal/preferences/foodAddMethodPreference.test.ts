import {
  getLastFoodAddMethod,
  saveLastFoodAddMethod,
} from '@/features/food-journal/preferences/foodAddMethodPreference';

describe('foodAddMethodPreference', () => {
  beforeEach(() => localStorage.clear());

  it('mémorise une méthode indépendamment pour chaque repas', () => {
    saveLastFoodAddMethod('breakfast', 'recent');
    saveLastFoodAddMethod('dinner', 'photo');

    expect(getLastFoodAddMethod('breakfast')).toBe('recent');
    expect(getLastFoodAddMethod('dinner')).toBe('photo');
    expect(getLastFoodAddMethod('lunch')).toBeUndefined();
  });

  it('ignore une préférence corrompue', () => {
    localStorage.setItem('sportpilot:nutrition:last-add-method:v1', '{incorrect');

    expect(getLastFoodAddMethod('lunch')).toBeUndefined();
  });
});

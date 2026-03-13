import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

interface CartState {
  items: CartItem[];
}

// ComponentStore: Global Store'un aksine, bileşene özgü lokal state
// - @Injectable() ama providers:[] ile lokal scope'a sınırlandırılır
// - Bileşen destroy olduğunda otomatik temizlenir
// - select(), updater(), effect() ile global Store'a benzer API
@Injectable()
export class CartStore extends ComponentStore<CartState> {
  constructor() {
    super({ items: [] }); // initial state
  }

  // select() — state'ten reaktif dilim türet
  readonly items$ = this.select((s) => s.items);
  readonly total$ = this.select((s) =>
    s.items.reduce((sum, i) => sum + i.price * i.qty, 0),
  );
  readonly count$ = this.select((s) =>
    s.items.reduce((sum, i) => sum + i.qty, 0),
  );

  // updater() — senkron, saf state güncellemesi (reducer gibi)
  readonly addItem = this.updater((state, item: Omit<CartItem, 'qty'>) => {
    const existing = state.items.find((i) => i.id === item.id);
    if (existing) {
      return {
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i,
        ),
      };
    }
    return { items: [...state.items, { ...item, qty: 1 }] };
  });

  readonly removeItem = this.updater((state, id: number) => ({
    items: state.items.filter((i) => i.id !== id),
  }));

  readonly clearCart = this.updater(() => ({ items: [] }));
}

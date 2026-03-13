import { Routes } from '@angular/router';
import { ProductsComponent } from './components/products/products';
import { PostsComponent } from './components/posts/posts';
import { RxjsOperatorsComponent } from './components/rxjs-operators/rxjs-operators';
import { PromiseVsObsComponent } from './components/promise-vs-obs/promise-vs-obs';
import { SignalsComponent } from './components/signals/signals';
import { SubjectsComponent } from './components/subjects/subjects';
import { NgrxAdvancedComponent } from './components/ngrx-advanced/ngrx-advanced';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductsComponent },
  { path: 'posts', component: PostsComponent },
  { path: 'operators', component: RxjsOperatorsComponent },
  { path: 'promise-vs-obs', component: PromiseVsObsComponent },
  { path: 'signals', component: SignalsComponent },
  { path: 'subjects', component: SubjectsComponent },
  { path: 'ngrx-advanced', component: NgrxAdvancedComponent },
];

import { User } from '@/core/auth/interface/user';

export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  slug: string;
  stock: number;
  sizes: Size[];
  gender: Gender;
  tags: readonly string[];
  images: readonly string[];
  isActive: boolean;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
}

export enum Gender {
  Kid = 'kid',
  Men = 'men',
  Women = 'women',
}

export enum Size {
  L = 'L',
  M = 'M',
  S = 'S',
  Xl = 'XL',
  Xs = 'XS',
  Xxl = 'XXL',
  Xxxl = 'XXXL',
}

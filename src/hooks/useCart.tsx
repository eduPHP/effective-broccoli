import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
// import { threadId } from 'worker_threads';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const existingProductIndex = cart.findIndex(cp => cp.id === productId);
      let product;
      if (existingProductIndex >= 0) {
        product = cart[existingProductIndex];
      } else {
        const productFromApi = await api.get<Product>(`products/${productId}`);
        product = productFromApi.data;
      }

      let newCart;

      if (existingProductIndex >= 0) {
        const amount = cart[existingProductIndex].amount + 1;
        if ((stock.amount - amount) < 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }
        cart[existingProductIndex] = {
          ...cart[existingProductIndex],
          amount,
        }
        newCart = [...cart];
      } else {
        newCart = [...cart, {
          ...product,
          amount: 1
        }];
      }
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch (e) {
      // throw e;
      toast.error('Erro na adição do produto');
      return
    }
  };

  const removeProduct = (productId: number) => {
    const existingProductIndex = cart.findIndex(cp => cp.id === productId);
    if (existingProductIndex >= 0) {
      cart.splice(existingProductIndex, 1)
      setCart([...cart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
    } else {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const existingProductIndex = cart.findIndex(cp => cp.id === productId);
      if (existingProductIndex >= 0 && amount > 0) {
        if ((stock.amount - amount) < 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }
        cart[existingProductIndex] = {
          ...cart[existingProductIndex],
          amount,
        }
        setCart([...cart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        return
      }
      toast.error('Erro na alteração de quantidade do produto');
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

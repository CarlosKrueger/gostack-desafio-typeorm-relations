import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError("You can't create an order with an invalid customer.");
    }

    const selectedProducts = await this.productsRepository.findAllById(
      products,
    );

    if (products.length > selectedProducts.length) {
      throw new AppError("You can't create an order with invalid products");
    }

    const storedProducts = await this.productsRepository.findAllById(products);

    const pricedProducts = products.map(product => {
      const index = storedProducts.findIndex(it => it.id === product.id);

      if (product.quantity > storedProducts[index].quantity) {
        throw new AppError(
          "You can't place an order with a product that exceeds the amount stored",
        );
      }

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: storedProducts[index].price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: pricedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;

import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject('STRIPE_API_KEY')
    private readonly apiKey: string,
  ) {
    this.stripe = new Stripe(this.apiKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async getProducts(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list();

    this.logger.log('Products fetched successfully');

    return products.data;
  }

  async getProductById(id: string): Promise<Stripe.Product> {
    const product = await this.stripe.products.retrieve(id);

    this.logger.log(`Product ${id} fetched successfully`);

    return product;
  }

  async getCustomers() {
    const customers = await this.stripe.customers.list({});

    this.logger.log('Customers fetched successfully');

    return customers.data;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
    });

    this.logger.log(
      `PaymentIntent created successfully with amount: ${amount} ${currency}`,
    );

    return paymentIntent;
  }

  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });

    this.logger.log(
      `Subscription created successfully for customer ${customerId}`,
    );

    return subscription;
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({ email, name });

    this.logger.log(`Customer created successfully with email: ${email}`);

    return customer;
  }

  async createProduct(
    name: string,
    description: string,
    price: number,
  ): Promise<Stripe.Product> {
    const product = await this.stripe.products.create({ name, description });

    await this.stripe.prices.create({
      product: product.id,
      unit_amount: price * 100,
      currency: 'usd',
    });

    this.logger.log(`Product created successfully: ${name}`);
    return product;
  }

  async refundPayment(paymentIntentId: string): Promise<Stripe.Refund> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    this.logger.log(
      `Refund processed successfully for PaymentIntent: ${paymentIntentId}`,
    );

    return refund;
  }

  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    this.logger.log(
      `Payment method ${paymentMethodId} attached to customer ${customerId}`,
    );
  }

  async getBalance(): Promise<Stripe.Balance> {
    const balance = await this.stripe.balance.retrieve();

    this.logger.log('Balance retrieved successfully');

    return balance;
  }

  async createPaymentLink(priceId: string): Promise<Stripe.PaymentLink> {
    const paymentLink = await this.stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
    });

    this.logger.log('Payment link created successfully');

    return paymentLink;
  }
}

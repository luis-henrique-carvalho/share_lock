import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Controller()
@UseGuards(AuthGuard)
@ApiTags('Private - Payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get all products from Stripe' })
  async getProducts() {
    return this.paymentsService.getProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get a product by ID from Stripe' })
  async getProductById(@Param('id') id: string) {
    return this.paymentsService.getProductById(id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all customers from Stripe' })
  async getCustomers() {
    return this.paymentsService.getCustomers();
  }

  @Post('create-payment-intent')
  @ApiOperation({ summary: 'Create a payment intent' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto.amount, dto.currency);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a subscription for a customer' })
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.paymentsService.createSubscription(dto.customerId, dto.priceId);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a new customer' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.paymentsService.createCustomer(dto.email, dto.name);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a new product with price' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.paymentsService.createProduct(
      dto.name,
      dto.description,
      dto.price,
    );
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Process a refund for a payment intent' })
  async refundPayment(@Body() dto: CreateRefundDto) {
    return this.paymentsService.refundPayment(dto.paymentIntentId);
  }

  @Post('payment-links')
  @ApiOperation({ summary: 'Create a payment link' })
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentsService.createPaymentLink(dto.priceId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Retrieve Stripe account balance' })
  async getBalance() {
    return this.paymentsService.getBalance();
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Controller()
@ApiTags('Private - Payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== PUBLIC WEBHOOK ====================

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for webhook verification');
    }
    return this.paymentsService.handleWebhookEvent(signature, rawBody);
  }

  // ==================== PROTECTED ROUTES ====================

  @Get('products')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all products' })
  async getProducts() {
    return this.paymentsService.getProducts();
  }

  @Get('products/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a product by ID' })
  async getProductById(@Param('id') id: string) {
    return this.paymentsService.getProductById(id);
  }

  @Get('customers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customers' })
  async getCustomers() {
    return this.paymentsService.getCustomers();
  }

  @Post('create-payment-intent')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto.amount, dto.currency);
  }

  @Post('subscriptions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a subscription for a customer' })
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.paymentsService.createSubscription(dto.customerId, dto.priceId);
  }

  @Get('subscriptions/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@Session() session: { user: { id: string } }) {
    return this.paymentsService.getUserSubscription(session.user.id);
  }

  @Post('customers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new customer' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.paymentsService.createCustomer(dto.email, dto.name);
  }

  @Post('products')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product with price' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.paymentsService.createProduct(
      dto.name,
      dto.description,
      dto.price,
    );
  }

  @Post('refunds')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund for a payment intent' })
  async refundPayment(@Body() dto: CreateRefundDto) {
    return this.paymentsService.refundPayment(dto.paymentIntentId);
  }

  @Post('payment-links')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment link' })
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentsService.createPaymentLink(dto.priceId);
  }

  @Get('balance')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve account balance' })
  async getBalance() {
    return this.paymentsService.getBalance();
  }

  @Post('billing-portal')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a billing portal session for current user' })
  async createBillingPortal(
    @Session() session: { user: { id: string } },
    @Body('returnUrl') returnUrl: string,
  ) {
    const url = await this.paymentsService.createBillingPortal(
      session.user.id,
      returnUrl,
    );
    return { url };
  }
}

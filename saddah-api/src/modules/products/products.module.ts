import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductSuggestionService } from './product-suggestion.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductSuggestionService],
  exports: [ProductsService, ProductSuggestionService],
})
export class ProductsModule {}

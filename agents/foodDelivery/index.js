import { OrderFoodTool, processFoodDeliveryMessage } from './agent.js';

export class FoodDeliveryPlugin {
  constructor() {
    this.name = 'Food Delivery Plugin';
    this.id = 'food-delivery-plugin';
  }
}

export { OrderFoodTool, processFoodDeliveryMessage };

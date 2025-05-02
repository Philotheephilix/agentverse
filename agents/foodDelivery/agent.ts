import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentConnection } from '../agent-common';
import { Logger } from '@hashgraphonline/standards-sdk';

// Food delivery tool schema
const OrderFoodSchema = z.object({
  restaurant: z.string().describe('Restaurant to order from'),
  items: z.array(z.object({
    name: z.string().describe('Food item name'),
    quantity: z.number().default(1).describe('Quantity of items'),
    specialInstructions: z.string().optional().describe('Special instructions for this item')
  })).describe('Food items to order'),
  deliveryAddress: z.string().describe('Delivery address'),
  deliveryTime: z.string().optional().describe('Preferred delivery time'),
  connectionId: z.string().optional().describe('Connection ID for the conversation')
});

type OrderFoodInput = z.infer<typeof OrderFoodSchema>;

// Sample restaurant data
const RESTAURANTS = [
  {
    id: 'rest-1',
    name: 'Pizza Palace',
    cuisine: 'Italian',
    menu: [
      { name: 'Margherita Pizza', price: 12.99 },
      { name: 'Pepperoni Pizza', price: 14.99 },
      { name: 'Pasta Carbonara', price: 16.99 },
      { name: 'Caesar Salad', price: 8.99 }
    ],
    deliveryFee: 3.99,
    estimatedDeliveryTime: '30-45 minutes'
  },
  {
    id: 'rest-2',
    name: 'Burger Joint',
    cuisine: 'American',
    menu: [
      { name: 'Classic Burger', price: 9.99 },
      { name: 'Cheeseburger', price: 10.99 },
      { name: 'Veggie Burger', price: 11.99 },
      { name: 'French Fries', price: 4.99 }
    ],
    deliveryFee: 2.99,
    estimatedDeliveryTime: '25-40 minutes'
  },
  {
    id: 'rest-3',
    name: 'Sushi Express',
    cuisine: 'Japanese',
    menu: [
      { name: 'California Roll', price: 12.99 },
      { name: 'Salmon Nigiri', price: 15.99 },
      { name: 'Miso Soup', price: 5.99 },
      { name: 'Teriyaki Chicken', price: 18.99 }
    ],
    deliveryFee: 4.99,
    estimatedDeliveryTime: '40-55 minutes'
  }
];

// Food ordering tool
class OrderFoodTool extends StructuredTool {
  name = 'order_food';
  description = 'Order food for delivery from restaurants';
  schema = OrderFoodSchema;
  
  constructor(private connection: AgentConnection) {
    super();
  }

  async _call(input: OrderFoodInput): Promise<string> {
    const logger = Logger.getInstance({
      module: 'FoodDeliveryTool',
      level: 'debug',
    });
    
    logger.info(`Ordering food from ${input.restaurant}`);
    
    // Find the restaurant
    const restaurant = RESTAURANTS.find(r => 
      r.name.toLowerCase() === input.restaurant.toLowerCase());
    
    if (!restaurant) {
      return JSON.stringify({
        success: false,
        message: `Restaurant "${input.restaurant}" not found`
      });
    }
    
    // Validate items against menu
    const validatedItems = [];
    let totalPrice = 0;
    
    for (const item of input.items) {
      const menuItem = restaurant.menu.find(m => 
        m.name.toLowerCase() === item.name.toLowerCase());
      
      if (menuItem) {
        const itemTotal = menuItem.price * item.quantity;
        validatedItems.push({
          ...item,
          price: menuItem.price,
          total: itemTotal
        });
        
        totalPrice += itemTotal;
      } else {
        logger.warn(`Menu item "${item.name}" not found at ${restaurant.name}`);
      }
    }
    
    if (validatedItems.length === 0) {
      return JSON.stringify({
        success: false,
        message: `None of the requested items were found on ${restaurant.name}'s menu`
      });
    }
    
    // Add delivery fee
    const finalTotal = totalPrice + restaurant.deliveryFee;
    
    // Generate order confirmation
    const orderNumber = `FD-${Date.now().toString().substr(-6)}`;
    
    const order = {
      success: true,
      order: {
        orderNumber,
        restaurant: restaurant.name,
        items: validatedItems,
        deliveryAddress: input.deliveryAddress,
        deliveryTime: input.deliveryTime || `Estimated: ${restaurant.estimatedDeliveryTime}`,
        subtotal: totalPrice,
        deliveryFee: restaurant.deliveryFee,
        total: finalTotal
      }
    };
    
    // If connectionId is provided, send order confirmation
    if (input.connectionId && this.connection.tools.sendMessageToConnectionTool) {
      try {
        // Format items for display
        const itemsText = validatedItems.map(item => 
          `- ${item.quantity}x ${item.name} - $${item.total.toFixed(2)}`
        ).join('\n');
        
        await this.connection.tools.sendMessageToConnectionTool.invoke({
          connectionId: input.connectionId,
          message: `🍔 Order Confirmed!
          
Order #${orderNumber}
Restaurant: ${restaurant.name}

Items:
${itemsText}

Subtotal: $${totalPrice.toFixed(2)}
Delivery Fee: $${restaurant.deliveryFee.toFixed(2)}
Total: $${finalTotal.toFixed(2)}

Delivery to: ${input.deliveryAddress}
${input.deliveryTime ? `Requested time: ${input.deliveryTime}` : `${restaurant.estimatedDeliveryTime}`}

Thank you for ordering with Food Delivery Agent!`
        });
      } catch (error) {
        logger.error('Error sending order confirmation:', error);
      }
    }
    
    return JSON.stringify(order);
  }
}

// Process messages for the food delivery agent
export async function processFoodDeliveryMessage(
  connection: AgentConnection,
  connectionTopicId: string,
  senderName: string,
  message: any
): Promise<void> {
  const logger = Logger.getInstance({
    module: 'FoodDeliveryAgent',
    level: 'debug',
  });
  
  // Extract message content
  const content = message.content || message.data || JSON.stringify(message);
  logger.info(`Processing food delivery message: ${content}`);
  
  try {
    // Simple NLP to detect ordering intent
    const messageText = typeof content === 'string' ? content : JSON.stringify(content);
    
    if (messageText.toLowerCase().includes('order') && 
        (messageText.toLowerCase().includes('food') || messageText.toLowerCase().includes('delivery'))) {
      
      // Extract potential restaurant from message
      let restaurant = 'Pizza Palace'; // Default
      for (const r of RESTAURANTS) {
        if (messageText.toLowerCase().includes(r.name.toLowerCase())) {
          restaurant = r.name;
          break;
        }
      }
      
      // Extract potential delivery address
      let deliveryAddress = '123 Main St';
      const addressMatch = messageText.match(/(?:to|at|deliver to)\s+([0-9]+\s+[A-Za-z\s]+(?:Road|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive))/i);
      if (addressMatch && addressMatch[1]) {
        deliveryAddress = addressMatch[1].trim();
      }
      
      // Extract potential items
      const items = [];
      const selectedRestaurant = RESTAURANTS.find(r => r.name === restaurant);
      
      if (selectedRestaurant) {
        for (const menuItem of selectedRestaurant.menu) {
          if (messageText.toLowerCase().includes(menuItem.name.toLowerCase())) {
            // Try to find quantity
            const quantityRegex = new RegExp(`(\\d+)\\s+${menuItem.name}`, 'i');
            const quantityMatch = messageText.match(quantityRegex);
            const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
            
            items.push({
              name: menuItem.name,
              quantity
            });
          }
        }
      }
      
      // If no items found, add a default item
      if (items.length === 0 && selectedRestaurant) {
        items.push({
          name: selectedRestaurant.menu[0].name,
          quantity: 1
        });
      }
      
      // Create and use the ordering tool
      const orderFoodTool = new OrderFoodTool(connection);
      const result = await orderFoodTool._call({
        restaurant,
        items,
        deliveryAddress,
        connectionId: connectionTopicId
      });
      
      logger.info(`Food order result: ${result}`);
      
    } else {
      // Send a general response with restaurant info
      if (connection.tools.sendMessageToConnectionTool) {
        const restaurantList = RESTAURANTS.map(r => 
          `- ${r.name} (${r.cuisine}): ${r.menu[0].name} $${r.menu[0].price}, ${r.menu[1].name} $${r.menu[1].price}, and more`
        ).join('\n');
        
        await connection.tools.sendMessageToConnectionTool.invoke({
          connectionId: connectionTopicId,
          message: `Hello from the Food Delivery Agent! 
          
I can help you order food from our partner restaurants. Here are some options:

${restaurantList}

Just tell me what you'd like to order and your delivery address. For example: "I'd like to order a Margherita Pizza from Pizza Palace to 123 Main Street."`,
        });
      }
    }
  } catch (error) {
    logger.error(`Error processing food delivery message:`, error);
    
    // Send error message
    if (connection.tools.sendMessageToConnectionTool) {
      await connection.tools.sendMessageToConnectionTool.invoke({
        connectionId: connectionTopicId,
        message: `Sorry, I encountered an error processing your food order. Please try again with a clearer request.`,
      });
    }
  }
}

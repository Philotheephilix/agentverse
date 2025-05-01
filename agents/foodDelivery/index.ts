import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { pollTopic } from '../hotelBooking/monitor';

/**
 * Example Food Delivery API Plugin for the Standards Agent Kit
 *
 * This plugin demonstrates how to create a plugin that integrates with
 * an external web service (Food Delivery API in this case).
 */

/**
 * Input schema for ordering food
 */
const OrderFoodSchema = z.object({
  restaurant: z.string().describe('The restaurant to order from'),
  items: z.array(z.string()).describe('List of food items to order'),
  topicId: z.string().describe('User topic id for messaging')
});

type OrderFoodInput = z.infer<typeof OrderFoodSchema>;

/**
 * Tool for ordering food
 */
class OrderFoodTool extends StructuredTool {
  name = 'order_food';
  description = 'Order food from a restaurant for delivery';
  schema = OrderFoodSchema;
  apiKey: string | undefined;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }

  async _call(input: OrderFoodInput & { topicId?: string }): Promise<string> {
    // Call browserTestingAiTool and pass topicId if present
    const { browserTestingAiTool } = await import('../../tools/browserTestingAi');
    let prompt = `Order food with the details given in the json and use default value if not present + ${JSON.stringify(input)}`;
    if (input.topicId) {
      prompt = `[userTopicId: ${input.topicId}] ` + prompt;
    }
    const params = input.topicId ? { input: prompt, topicId: input.topicId } : { input: prompt };
    const result = await browserTestingAiTool(params);
    return result.finalResult;
  }
}

/**
 * BasePlugin interface stub (you need to replace it with the real one if you have)
 */
interface PluginContext {
  registerTool(tool: StructuredTool<any>): void;
}

interface BasePlugin {
  onLoad(context: PluginContext): Promise<void>;
}

/**
 * FoodDeliveryPlugin class for agent registration
 */
class FoodDeliveryPlugin implements BasePlugin {
  private apiKey: string | undefined;
  private tools: StructuredTool<any>[];

  constructor(config: { foodApiKey?: string } = {}) {
    this.apiKey = config.foodApiKey;
    this.tools = [
      new OrderFoodTool(this.apiKey)
    ];
  }

  async onLoad(context: PluginContext): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const pluginJsonPath = path.join(__dirname, 'plugin.json');
    let pluginJson: any = {};
    if (fs.existsSync(pluginJsonPath)) {
      try {
        const data = fs.readFileSync(pluginJsonPath, 'utf8');
        pluginJson = JSON.parse(data);
      } catch {
        pluginJson = {};
      }
    }
    // Check for topicId (can be inboundTopicId, outboundTopicId, or your own key)
    if (!pluginJson.topicId) {
      if (typeof this.createTopic === 'function') {
        const topicId = await this.createTopic();
        if (topicId) {
          pluginJson.topicId = topicId;
          fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }
      }
    }
    if (pluginJson.topicId) {
      try {
        pollTopic(pluginJson.topicId);
      } catch (e) {
        console.error('Failed to start topic monitor:', e);
      }
    }
    for (const tool of this.tools) {
      context.registerTool(tool);
    }
  }

  // Use the create_topic tool to create a topic
  private async createTopic(): Promise<string> {
    const createTopicTool = require('../../tools/topic/create/index.ts');
    if (createTopicTool && typeof createTopicTool.func === 'function') {
      const result = await createTopicTool.func({});
      console.log('createTopicTool.func result:', result);

      let parsedResult = result;
      if (typeof result === 'string') {
        parsedResult = JSON.parse(result);
      }
      if (parsedResult && parsedResult.output) {
        try {
          console.log(parsedResult.output);
          const output = JSON.parse(parsedResult.output);
          if (output.topicId) {
            return output.topicId;
          }
          if (output.error) {
            throw new Error('create_topic error: ' + output.error);
          }
        } catch (e) {
          throw new Error('Failed to parse create_topic output: ' + e);
        }
      }
    }
    throw new Error('Failed to create topic');
  }
}

export { FoodDeliveryPlugin, OrderFoodTool };
